import { GarminConnect } from "garmin-connect";
import { prisma } from "./prisma";
import { downsample } from "./routeUtils";

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

  // Note: garminPassword stored as plain text at connect time after verification
  // In production use proper encryption (e.g. aes-256-gcm with a KMS key)
  const client = new GarminConnect({
    username: conn.garminUsername,
    password: conn.garminPassword,
  });
  await client.login(conn.garminUsername, conn.garminPassword);
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

    // Fetch GPS route polyline
    try {
      const detailsUrl = `https://connectapi.garmin.com/activity-service/activity/${act.activityId}/details`;
      const details = await client.get<{ geoPolylineDTO?: { polyline?: { lat: number; lon: number }[] } }>(detailsUrl);
      const polyline = details?.geoPolylineDTO?.polyline;
      if (Array.isArray(polyline) && polyline.length > 1) {
        const pts = polyline.map((p) => ({ lat: p.lat, lon: p.lon }));
        const downsampled = downsample(pts, 200);
        await prisma.activity.update({
          where: { id: saved.id },
          data: { routePoints: JSON.stringify(downsampled) },
        });
      }
    } catch {
      // GPS not always available (e.g. indoor activities) — skip silently
    }
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

export function getHRZone(bpm: number, maxHR = 190): number {
  const pct = bpm / maxHR;
  if (pct < 0.6) return 1;
  if (pct < 0.7) return 2;
  if (pct < 0.8) return 3;
  if (pct < 0.9) return 4;
  return 5;
}

export const ZONE_COLORS: Record<number, string> = {
  1: "#4ECDC4",
  2: "#45B7D1",
  3: "#9B59B6",
  4: "#FF6B9D",
  5: "#FF4757",
};
