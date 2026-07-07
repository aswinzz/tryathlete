import { GarminConnect } from "garmin-connect";
import { prisma } from "./prisma";
import { downsample } from "./routeUtils";
import { reconcileActivity } from "./planReconciler";
import { getHRZone } from "./utils";
import { decrypt } from "./encryption";
import { parseDataPrefs, DEFAULT_GARMIN_PREFS, type WhoopDataPrefs } from "./whoop";

/**
 * Parse a Garmin time string (e.g. "2024-03-15 07:30:00") as UTC.
 * Garmin returns both startTimeGMT and startTimeLocal without a timezone suffix.
 * We always prefer startTimeGMT (which is truly UTC) and append "Z" so the JS
 * Date constructor treats it unambiguously as UTC — not the server's local timezone.
 */
function parseGarminTime(raw: string | undefined | null): Date {
  if (!raw) return new Date();
  // Replace space separator with T and append Z to force UTC interpretation
  return new Date(raw.replace(" ", "T") + "Z");
}

export async function getGarminClient(userId: string) {
  const conn = await prisma.trackerConnection.findUnique({
    where: { userId_provider: { userId, provider: "garmin" } },
  });

  if (!conn?.garminUsername || !conn?.garminPassword) {
    throw new Error("Garmin not connected");
  }

  const password = decrypt(conn.garminPassword);
  const client = new GarminConnect({
    username: conn.garminUsername,
    password,
  });
  await client.login(conn.garminUsername, password);
  return client;
}

interface GarminSplit {
  distance?: number;
  duration?: number;
  averageHR?: number;
  maxHR?: number;
  averageSpeed?: number;
  startTimeLocal?: string;
}

interface GarminSplitsResponse {
  lapDTOs?: GarminSplit[];
}

/**
 * The /details endpoint returns time-series data in a column-oriented format:
 *   metricDescriptors — maps column index → metric key (e.g. "directHeartRate")
 *   activityDetailMetrics — array of rows, each with a startTimeGMT and a metrics array
 */
export interface GarminDetailsResponse {
  geoPolylineDTO?: { polyline?: { lat: number; lon: number }[] };
  metricDescriptors?: { metricsIndex: number; key: string }[];
  activityDetailMetrics?: { startTimeGMT?: string; metrics: (number | null)[] }[];
}

export async function syncGarminActivities(userId: string) {
  const client = await getGarminClient(userId);

  // Paginate through all Garmin history (newest first).
  // Stop early once we hit a page where every activity already exists in DB
  // (meaning we've caught up with previously synced data).
  const PAGE_SIZE = 100;
  const MAX_ACTIVITIES = 1000; // safety cap
  let start = 0;
  let allActivities: Awaited<ReturnType<typeof client.getActivities>> = [];

  while (start < MAX_ACTIVITIES) {
    const page = await client.getActivities(start, PAGE_SIZE);
    if (!page || page.length === 0) break;

    // Check if every activity on this page is already in the DB
    const garminIds = page.map((a) => String(a.activityId));
    const existingCount = await prisma.activity.count({
      where: { garminId: { in: garminIds } },
    });
    const allExist = existingCount === page.length;

    allActivities = allActivities.concat(page);
    start += page.length;

    // If the whole page is already in DB and we have some data, we're caught up
    if (allExist && start > PAGE_SIZE) break;
    if (page.length < PAGE_SIZE) break; // Last page
  }

  for (const act of allActivities) {
    const garminId = String(act.activityId);

    const existing = await prisma.activity.findUnique({ where: { garminId } });
    if (existing) continue;

    const avgPaceMs = act.averageSpeed ? 1 / act.averageSpeed : null;

    const saved = await prisma.activity.create({
      data: {
        userId,
        garminId,
        name: act.activityName || "Activity",
        type: act.activityType?.typeKey || "running",
        startTime: parseGarminTime(act.startTimeGMT || act.startTimeLocal),
        duration: Math.round(act.duration || 0),
        distance: act.distance || null,
        calories: act.calories || null,
        avgHeartRate: act.averageHR || null,
        maxHeartRate: act.maxHR || null,
        avgPace: avgPaceMs,
        elevGain: act.elevationGain || null,
        elevLoss: act.elevationLoss || null,
        steps: act.steps || null,
        rawData: JSON.stringify(act),
      },
    });

    // Fetch per-km splits via raw API endpoint
    try {
      const splitsUrl = `https://connectapi.garmin.com/activity-service/activity/${act.activityId}/splits`;
      const splitsData = await client.get<GarminSplitsResponse>(splitsUrl);
      const laps: GarminSplit[] = splitsData?.lapDTOs || [];

      for (let i = 0; i < laps.length; i++) {
        const lap = laps[i];
        const lapPace = lap.averageSpeed ? 1 / lap.averageSpeed : null;
        const zone = lap.averageHR ? getHRZone(lap.averageHR) : null;

        await prisma.activityLap.create({
          data: {
            activityId: saved.id,
            lapIndex: i + 1,
            distance: lap.distance || 0,
            duration: Math.round(lap.duration || 0),
            avgHeartRate: lap.averageHR || null,
            maxHeartRate: lap.maxHR || null,
            avgPace: lapPace,
            zone,
            startTime: lap.startTimeLocal ? parseGarminTime(lap.startTimeLocal) : null,
          },
        });
      }
    } catch {
      // Lap/split data not always available — skip silently
    }

    // GPS route — plain /details, no extra params (stable response shape).
    // Write only routePoints here; HR is handled in the dedicated block below.
    try {
      const detailsUrl = `https://connectapi.garmin.com/activity-service/activity/${act.activityId}/details`;
      const details = await client.get<GarminDetailsResponse>(detailsUrl);
      const updateData = extractDetailsData(details, saved.startTime);
      if (updateData.routePoints) {
        await prisma.activity.update({
          where: { id: saved.id },
          data: { routePoints: updateData.routePoints as string },
        });
      }
    } catch {
      // GPS not always available (indoor / strength) — skip silently
    }

    // HR time series — separate call with maxChartSize for denser metric data.
    // Isolated because maxChartSize can change the response shape.
    try {
      const hrUrl = `https://connectapi.garmin.com/activity-service/activity/${act.activityId}/details?maxChartSize=2000`;
      const hrDetails = await client.get<GarminDetailsResponse>(hrUrl);
      const hrData = extractDetailsData(hrDetails, saved.startTime);
      const hrUpdate: Record<string, unknown> = {};
      if (hrData.hrStream)     hrUpdate.hrStream     = hrData.hrStream;
      if (hrData.hrZones)      hrUpdate.hrZones      = hrData.hrZones;
      if (hrData.minHeartRate) hrUpdate.minHeartRate = hrData.minHeartRate;
      if (Object.keys(hrUpdate).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.activity.update as any)({ where: { id: saved.id }, data: hrUpdate });
      }
    } catch {
      // HR not always available — skip silently
    }

    // Reconcile against active workout plan (fire-and-forget, never throws)
    reconcileActivity(saved.id, userId).catch(() => {});
  }

  await prisma.trackerConnection.update({
    where: { userId_provider: { userId, provider: "garmin" } },
    data: { lastSyncAt: new Date() },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

export function formatPace(secondsPerMeter: number): string {
  const secsPerKm = secondsPerMeter * 1000;
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}'${secs.toString().padStart(2, "0")}"`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2);
}

export const ZONE_COLORS: Record<number, string> = {
  1: "#4ECDC4",
  2: "#45B7D1",
  3: "#9B59B6",
  4: "#FF6B9D",
  5: "#FF4757",
};

// ─── Details extraction ───────────────────────────────────────────────────────

/**
 * Parse the Garmin details endpoint response into DB-ready fields.
 * The details endpoint uses a column-oriented format:
 *   metricDescriptors  — maps column index → metric key
 *   activityDetailMetrics — rows of per-second measurements
 *
 * HR key: "directHeartRate"  (bpm)
 * Time key: "directTimestamp" (not used; each row has startTimeGMT instead)
 */
export function extractDetailsData(
  details: GarminDetailsResponse | null | undefined,
  activityStartTime: Date
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!details) return out;

  // ── GPS polyline ──────────────────────────────────────────────────────────
  const polyline = details.geoPolylineDTO?.polyline;
  if (Array.isArray(polyline) && polyline.length > 1) {
    const pts = polyline.map((p) => ({ lat: p.lat, lon: p.lon }));
    out.routePoints = JSON.stringify(downsample(pts, 200));
  }

  // ── Heart rate time series ────────────────────────────────────────────────
  const descriptors = details.metricDescriptors;
  const rows = details.activityDetailMetrics;
  if (!Array.isArray(descriptors) || !Array.isArray(rows) || rows.length === 0) return out;

  const hrDesc = descriptors.find((d) => d.key === "directHeartRate");
  if (!hrDesc) return out;

  const hrIdx = hrDesc.metricsIndex;
  const startMs = activityStartTime.getTime();

  // Build {t, bpm} pairs from the rows
  const hrPts: { t: number; bpm: number }[] = [];
  for (const row of rows) {
    const bpm = row.metrics[hrIdx];
    if (!bpm || bpm <= 0) continue;
    // startTimeGMT format: "2024-03-15 07:30:00" (no tz suffix — treat as UTC)
    if (!row.startTimeGMT) continue;
    const ptMs = new Date(row.startTimeGMT.replace(" ", "T") + "Z").getTime();
    const t = Math.round((ptMs - startMs) / 1000);
    if (t < 0) continue;
    hrPts.push({ t, bpm: Math.round(bpm) });
  }

  if (hrPts.length >= 4) {
    const { stream, zones, minHR } = buildHRData(hrPts);
    if (stream.length > 0) {
      out.hrStream  = JSON.stringify(stream);
      out.hrZones   = JSON.stringify(zones);
      if (minHR !== null) out.minHeartRate = minHR;
    }
  }

  return out;
}

// ─── HR processing ────────────────────────────────────────────────────────────

interface HRPoint { t: number; bpm: number }
interface HRZones { z1: number; z2: number; z3: number; z4: number; z5: number }

/**
 * Downsample a pre-parsed HR point array and compute zone breakdown.
 * Keeps one point per DOWNSAMPLE_INTERVAL seconds; accumulates zone time
 * from the interval between consecutive samples.
 */
export function buildHRData(
  pts: { t: number; bpm: number }[],
  maxHR = 190
): { stream: HRPoint[]; zones: HRZones; minHR: number | null } {
  const DOWNSAMPLE_INTERVAL = 10;
  const zones: HRZones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  const stream: HRPoint[] = [];
  let minHR: number | null = null;
  let lastKeptT = -Infinity;

  // Ensure sorted by time
  const sorted = [...pts].sort((a, b) => a.t - b.t);

  for (let i = 0; i < sorted.length; i++) {
    const { t, bpm } = sorted[i];

    // Zone time: interval to next sample, capped at 60s
    const nextT = sorted[i + 1]?.t ?? t + 1;
    const intervalSecs = Math.min(nextT - t, 60);
    const zone = getHRZone(bpm, maxHR);
    zones[`z${zone}` as keyof HRZones] += intervalSecs;

    if (minHR === null || bpm < minHR) minHR = bpm;

    if (t - lastKeptT >= DOWNSAMPLE_INTERVAL) {
      stream.push({ t, bpm });
      lastKeptT = t;
    }
  }

  return { stream, zones, minHR };
}

// ─── Garmin Wellness (Training Readiness / recovery / sleep) ─────────────────

interface GarminReadinessEntry {
  score?: number | null;
  level?: string | null;
}

interface GarminHRVResponse {
  hrvSummary?: {
    lastNightAvg?: number | null;
    status?: string | null;
  };
}

interface GarminUserSummary {
  restingHeartRate?: number | null;
  bodyBatteryHighestValue?: number | null;
  bodyBatteryMostRecentValue?: number | null;
}

interface GarminSleepResponse {
  dailySleepDTO?: {
    sleepTimeSeconds?: number | null;
    deepSleepSeconds?: number | null;
    lightSleepSeconds?: number | null;
    remSleepSeconds?: number | null;
    awakeSleepSeconds?: number | null;
    sleepScores?: { overall?: { value?: number | null } };
  };
}

interface GarminSocialProfile {
  displayName?: string;
}

/**
 * Sync Garmin wellness data (Training Readiness, HRV, resting HR, Body Battery,
 * sleep) for the last `days` days into the GarminWellness table.
 *
 * Uses the same unofficial Connect API session as activity sync. Every per-day
 * and per-metric fetch is individually fault-tolerant: not all watches support
 * Training Readiness or HRV status, so partial data is expected and fine.
 */
export async function syncGarminWellness(userId: string, days = 7) {
  const conn = await prisma.trackerConnection.findUnique({
    where: { userId_provider: { userId, provider: "garmin" } },
  });
  if (!conn?.garminUsername) return;

  const prefs: WhoopDataPrefs = parseDataPrefs(
    conn.dataPrefs,
    DEFAULT_GARMIN_PREFS as WhoopDataPrefs
  );
  if (!prefs.syncRecovery && !prefs.syncSleep) return;

  const client = await getGarminClient(userId);

  // displayName is required by the wellness/usersummary endpoints
  let displayName: string | null = null;
  try {
    const profile = await client.get<GarminSocialProfile>(
      "https://connectapi.garmin.com/userprofile-service/socialProfile"
    );
    displayName = profile?.displayName ?? null;
  } catch {
    // profile fetch failed — readiness/HRV still work without it
  }

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD

    const data: Record<string, unknown> = {};

    if (prefs.syncRecovery) {
      // Training Readiness (only on supported watches)
      try {
        const tr = await client.get<GarminReadinessEntry[]>(
          `https://connectapi.garmin.com/metrics-service/metrics/trainingreadiness/${dateStr}`
        );
        const entry = Array.isArray(tr) ? tr[0] : null;
        if (entry?.score != null) {
          data.trainingReadiness = Math.round(entry.score);
          data.readinessLevel = entry.level ?? null;
        }
      } catch { /* not supported / no data for this day */ }

      // HRV — last night's average + status
      try {
        const hrv = await client.get<GarminHRVResponse>(
          `https://connectapi.garmin.com/hrv-service/hrv/${dateStr}`
        );
        if (hrv?.hrvSummary?.lastNightAvg != null) {
          data.hrv = hrv.hrvSummary.lastNightAvg;
          data.hrvStatus = hrv.hrvSummary.status ?? null;
        }
      } catch { /* no HRV data */ }

      // Resting HR + Body Battery from the daily user summary
      if (displayName) {
        try {
          const sum = await client.get<GarminUserSummary>(
            `https://connectapi.garmin.com/usersummary-service/usersummary/daily/${encodeURIComponent(displayName)}?calendarDate=${dateStr}`
          );
          if (sum?.restingHeartRate != null) data.restingHR = sum.restingHeartRate;
          const bb = sum?.bodyBatteryHighestValue ?? sum?.bodyBatteryMostRecentValue;
          if (bb != null) data.bodyBattery = bb;
        } catch { /* no summary */ }
      }
    }

    if (prefs.syncSleep && displayName) {
      try {
        const sleep = await client.get<GarminSleepResponse>(
          `https://connectapi.garmin.com/wellness-service/wellness/dailySleepData/${encodeURIComponent(displayName)}?date=${dateStr}&nonSleepBufferMinutes=60`
        );
        const dto = sleep?.dailySleepDTO;
        if (dto?.sleepTimeSeconds != null && dto.sleepTimeSeconds > 0) {
          data.totalSleepMin = Math.round(dto.sleepTimeSeconds / 60);
          data.deepMin  = Math.round((dto.deepSleepSeconds  ?? 0) / 60);
          data.lightMin = Math.round((dto.lightSleepSeconds ?? 0) / 60);
          data.remMin   = Math.round((dto.remSleepSeconds   ?? 0) / 60);
          data.awakeMin = Math.round((dto.awakeSleepSeconds ?? 0) / 60);
          const score = dto.sleepScores?.overall?.value;
          if (score != null) data.sleepScore = Math.round(score);
        }
      } catch { /* no sleep data */ }
    }

    if (Object.keys(data).length === 0) continue;

    const dayDate = new Date(`${dateStr}T00:00:00Z`);
    try {
      await prisma.garminWellness.upsert({
        where: { userId_date: { userId, date: dayDate } },
        update: data,
        create: { userId, date: dayDate, ...data },
      });
    } catch { /* one bad day never breaks the sync */ }
  }
}

/** @deprecated use buildHRData — kept for any callers passing raw [timestamp_ms, bpm] pairs */
export function processHRStream(
  hrValues: [number, number | null][],
  startMs: number,
  maxHR = 190
): { stream: HRPoint[]; zones: HRZones; minHR: number | null } {
  const pts = hrValues
    .filter(([, bpm]) => bpm !== null && bpm > 0)
    .map(([tsMs, bpm]) => ({ t: Math.round((tsMs - startMs) / 1000), bpm: bpm! }))
    .filter(({ t }) => t >= 0);
  return buildHRData(pts, maxHR);
}
