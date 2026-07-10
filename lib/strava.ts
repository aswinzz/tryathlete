/**
 * Strava API integration
 *
 * OAuth2 flow:
 *   1. /api/strava/auth      → redirect to Strava auth URL
 *   2. /api/strava/callback  → exchange code, store tokens
 *   3. /api/strava/sync      → call syncStravaData()
 *
 * Strava uses standard OAuth2 with refresh tokens.
 * Tokens are stored in TrackerConnection (provider = "strava").
 */

import { prisma } from "./prisma";
import type { RoutePoint } from "./routeUtils";
import { downsample } from "./routeUtils";
import { sendPushToUser } from "./push";
import { reconcileActivity } from "./planReconciler";
import { absorbManualLog } from "./activityMerge";
import { parseDataPrefs } from "./whoop";
import { getHRZone } from "./utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const STRAVA_AUTH_URL  = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_BASE  = "https://www.strava.com/api/v3";
const STRAVA_SCOPE     = "activity:read_all";

export const DEFAULT_STRAVA_PREFS = {
  syncActivities: false, // user must explicitly choose the activity source
  syncRecovery:   false,
  syncSleep:      false,
};

// ─── OAuth helpers ────────────────────────────────────────────────────────────

export function getStravaAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.STRAVA_CLIENT_ID!,
    redirect_uri:  redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope:         STRAVA_SCOPE,
    state,
  });
  return `${STRAVA_AUTH_URL}?${params}`;
}

export async function exchangeStravaCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number; athleteId: number }> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      code,
      grant_type:    "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    data.expires_at,  // unix timestamp
    athleteId:    data.athlete?.id,
  };
}

async function refreshStravaToken(userId: string): Promise<string> {
  const conn = await prisma.trackerConnection.findUnique({
    where: { userId_provider: { userId, provider: "strava" } },
  });
  if (!conn?.refreshToken) throw new Error("Strava not connected");

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      refresh_token: conn.refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
  const data = await res.json();

  const expiry = new Date(data.expires_at * 1000);
  await prisma.trackerConnection.update({
    where: { userId_provider: { userId, provider: "strava" } },
    data: {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token ?? conn.refreshToken,
      tokenExpiry:  expiry,
    },
  });
  return data.access_token;
}

async function stravaFetch<T>(userId: string, path: string): Promise<T> {
  const conn = await prisma.trackerConnection.findUnique({
    where: { userId_provider: { userId, provider: "strava" } },
  });
  if (!conn?.accessToken) throw new Error("Strava not connected");

  // Strava expiry is stored as a unix timestamp via tokenExpiry DateTime
  let token = conn.accessToken;
  if (conn.tokenExpiry && conn.tokenExpiry.getTime() - Date.now() < 60_000) {
    token = await refreshStravaToken(userId);
  }

  const res = await fetch(`${STRAVA_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    token = await refreshStravaToken(userId);
    const retry = await fetch(`${STRAVA_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!retry.ok) throw new Error(`Strava API error ${retry.status} on ${path}`);
    return retry.json() as Promise<T>;
  }

  if (!res.ok) throw new Error(`Strava API error ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

// ─── Google Encoded Polyline decoder ─────────────────────────────────────────

function decodePolyline(encoded: string): RoutePoint[] {
  const pts: RoutePoint[] = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let shift = 0, result = 0, b: number;
    do {
      b = encoded.charCodeAt(idx++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;

    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(idx++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;

    pts.push({ lat: lat / 1e5, lon: lng / 1e5 });
  }
  return pts;
}

// ─── Activity type mapping ────────────────────────────────────────────────────

const STRAVA_TYPE_MAP: Record<string, string> = {
  // Running
  Run: "running", TrailRun: "running", VirtualRun: "running",
  // Cycling
  Ride: "cycling", VirtualRide: "cycling", EBikeRide: "cycling",
  GravelRide: "cycling", MountainBikeRide: "cycling", Handcycle: "cycling",
  // Swimming
  Swim: "swimming",
  // Strength
  WeightTraining: "strength_training", Workout: "strength_training",
  // Cardio / HIIT
  HIIT: "hiit", Crossfit: "hiit", Elliptical: "hiit",
  // Other
  Hike: "hiking", Walk: "walking",
  Yoga: "yoga", Pilates: "yoga",
  RockClimbing: "climbing",
  Rowing: "rowing", Kayaking: "kayaking",
  Soccer: "other", Tennis: "other", Golf: "other",
  Skateboard: "other", IceSkate: "other",
};

function mapStravaType(sportType: string): string {
  return STRAVA_TYPE_MAP[sportType] ?? "other";
}

// ─── Strava activity types ────────────────────────────────────────────────────

interface StravaActivity {
  id:                  number;
  name:                string;
  sport_type:          string;
  type:                string;        // legacy field, same content
  start_date:          string;        // ISO
  elapsed_time:        number;        // seconds
  moving_time:         number;        // seconds
  distance:            number;        // meters
  total_elevation_gain: number;       // meters
  average_speed:       number;        // m/s
  average_heartrate?:  number;
  max_heartrate?:      number;
  calories?:           number;
  average_cadence?:    number;
  kilojoules?:         number;
  map: {
    summary_polyline: string | null;
  };
}

interface StravaDetailedActivity extends StravaActivity {
  laps: StravaLap[];
}

interface StravaStreams {
  time?:      { data: number[] };
  heartrate?: { data: number[] };
}

/** Fetch HR stream from Strava and return hrStream + hrZones JSON strings */
export async function fetchStravaHR(
  userId: string,
  stravaActivityId: string | number,
  /** Optional override for zone boundaries. Uses standard default (200 bpm) when not provided. */
  activityMaxHR?: number | null
): Promise<{ hrStream: string | null; hrZones: string | null; minHeartRate: number | null }> {
  const maxHR = activityMaxHR ?? 200;
  try {
    const streams = await stravaFetch<StravaStreams>(
      userId,
      `/activities/${stravaActivityId}/streams?keys=time,heartrate&key_by_type=true`
    );
    const times = streams.time?.data;
    const bpms  = streams.heartrate?.data;
    if (!times || !bpms || bpms.length === 0) return { hrStream: null, hrZones: null, minHeartRate: null };

    // Build [{t, bpm}] points — sample to ≤500 pts
    const step = Math.max(1, Math.floor(bpms.length / 500));
    const points: { t: number; bpm: number }[] = [];
    for (let i = 0; i < bpms.length; i += step) {
      points.push({ t: times[i], bpm: bpms[i] });
    }

    // Compute zone seconds using activity's actual max HR for accurate zones
    const zones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
    for (let i = 1; i < times.length; i++) {
      const dt = times[i] - times[i - 1];
      const z = getHRZone(bpms[i], maxHR);
      (zones as Record<string, number>)[`z${z}`] += dt;
    }

    const minHR = Math.min(...bpms);

    return {
      hrStream:    JSON.stringify(points),
      hrZones:     JSON.stringify(zones),
      minHeartRate: minHR,
    };
  } catch (err) {
    console.warn(`[strava] HR stream fetch failed for ${stravaActivityId}:`, err instanceof Error ? err.message : err);
    return { hrStream: null, hrZones: null, minHeartRate: null };
  }
}

interface StravaLap {
  lap_index:           number;
  distance:            number;        // meters
  elapsed_time:        number;        // seconds
  average_heartrate?:  number;
  max_heartrate?:      number;
  average_speed?:      number;        // m/s → pace
  start_date:          string;
}

// ─── Main sync ────────────────────────────────────────────────────────────────

export async function syncStravaData(userId: string) {
  const conn = await prisma.trackerConnection.findUnique({
    where: { userId_provider: { userId, provider: "strava" } },
  });
  if (!conn) throw new Error("Strava not connected");

  const prefs = parseDataPrefs(conn.dataPrefs, DEFAULT_STRAVA_PREFS as Parameters<typeof parseDataPrefs>[1]);
  console.log(`[strava] sync start — syncActivities=${prefs.syncActivities}, lastSyncAt=${conn.lastSyncAt}`);

  // Backfill stravaAthleteId for connections made before webhooks were added
  if (!conn.stravaAthleteId) {
    try {
      const athlete = await stravaFetch<{ id: number }>(userId, "/athlete");
      await prisma.trackerConnection.update({
        where: { userId_provider: { userId, provider: "strava" } },
        data: { stravaAthleteId: String(athlete.id) },
      });
      console.log(`[strava] backfilled stravaAthleteId=${athlete.id}`);
    } catch (err) {
      console.warn("[strava] could not backfill stravaAthleteId:", err instanceof Error ? err.message : err);
    }
  }

  if (prefs.syncActivities) {
    await syncStravaActivities(userId, conn.lastSyncAt);
  } else {
    console.log("[strava] syncActivities=false — skipping. Go to Settings → Activity Source to enable Strava.");
  }

  await prisma.trackerConnection.update({
    where: { userId_provider: { userId, provider: "strava" } },
    data: { lastSyncAt: new Date() },
  });
}

/**
 * Import a single Strava activity by ID — called from the webhook handler
 * when Strava pushes an activity.create event. Skips if the user has
 * syncActivities=false or the activity already exists.
 */
export async function importSingleStravaActivity(userId: string, stravaActivityId: number) {
  const conn = await prisma.trackerConnection.findUnique({
    where: { userId_provider: { userId, provider: "strava" } },
  });
  if (!conn) return;

  const prefs = parseDataPrefs(conn.dataPrefs, DEFAULT_STRAVA_PREFS as Parameters<typeof parseDataPrefs>[1]);
  if (!prefs.syncActivities) {
    console.log(`[strava] webhook: syncActivities=false for ${userId}, skipping ${stravaActivityId}`);
    return;
  }

  const stravaId = String(stravaActivityId);
  const exists = await prisma.activity.findUnique({ where: { stravaId } });
  if (exists) {
    console.log(`[strava] webhook: activity ${stravaId} already imported`);
    return;
  }

  const act = await stravaFetch<StravaDetailedActivity>(userId, `/activities/${stravaActivityId}`);
  const sportType   = act.sport_type || act.type;
  const type        = mapStravaType(sportType);
  const startTime   = new Date(act.start_date);
  const avgSpeedMps = act.average_speed ?? 0;
  const avgPace     = avgSpeedMps > 0 ? 1 / avgSpeedMps : null;

  let routePoints: string | null = null;
  if (act.map?.summary_polyline) {
    const pts = decodePolyline(act.map.summary_polyline);
    if (pts.length > 0) routePoints = JSON.stringify(downsample(pts, 200));
  }

  const calories =
    act.calories
      ? Math.round(act.calories)
      : act.kilojoules
      ? Math.round(act.kilojoules / 4.184 * 1000)
      : null;

  console.log(`[strava] webhook: importing ${stravaId} — ${act.name} (${sportType})`);
  const created = await prisma.activity.create({
    data: {
      userId,
      stravaId,
      source:       "strava",
      name:         act.name,
      type,
      startTime,
      duration:     act.moving_time,
      distance:     act.distance > 0 ? act.distance : null,
      avgPace,
      avgHeartRate: act.average_heartrate ? Math.round(act.average_heartrate) : null,
      maxHeartRate: act.max_heartrate     ? Math.round(act.max_heartrate)     : null,
      elevGain:     act.total_elevation_gain > 0 ? act.total_elevation_gain : null,
      calories,
      routePoints,
      rawData:      JSON.stringify(act),
    },
  });

  // Laps (for endurance activities)
  if (act.laps?.length > 1) {
    await prisma.activityLap.createMany({
      data: act.laps.map((lap) => ({
        activityId:   created.id,
        lapIndex:     lap.lap_index,
        distance:     lap.distance,
        duration:     lap.elapsed_time,
        avgHeartRate: lap.average_heartrate ? Math.round(lap.average_heartrate) : null,
        maxHeartRate: lap.max_heartrate     ? Math.round(lap.max_heartrate)     : null,
        avgPace:      lap.average_speed && lap.average_speed > 0 ? 1 / lap.average_speed : null,
        startTime:    new Date(lap.start_date),
      })),
      skipDuplicates: true,
    });
  }

  // HR stream
  if (act.average_heartrate) {
    const { hrStream, hrZones, minHeartRate: minHR } = await fetchStravaHR(userId, act.id);
    if (hrStream || hrZones || minHR) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.activity.update as any)({
        where: { id: created.id },
        data: {
          ...(hrStream ? { hrStream } : {}),
          ...(hrZones  ? { hrZones  } : {}),
          ...(minHR    ? { minHeartRate: minHR } : {}),
        },
      });
    }
  }

  console.log(`[strava] webhook: imported ${stravaId} → activity ${created.id}`);

  // Absorb any manual workout log from the same session
  try { await absorbManualLog(created.id, userId); } catch {}

  // Auto-match against the active workout plan (fire-and-forget, never throws)
  reconcileActivity(created.id, userId).catch(() => {});

  // Notify the user's iOS device(s)
  const distanceKm = act.distance > 0 ? ` · ${(act.distance / 1000).toFixed(1)} km` : "";
  sendPushToUser(userId, {
    title: "New activity synced",
    body:  `${act.name}${distanceKm}`,
    data:  { type: "activity", activityId: created.id },
  }).catch(() => {});
}

async function syncStravaActivities(userId: string, after: Date | null) {
  const perPage = 50;
  let page = 1;
  let totalImported = 0;
  const afterTs = after ? Math.floor(after.getTime() / 1000) : undefined;
  console.log(`[strava] fetching activities — after=${after?.toISOString() ?? "all time"}`);

  while (true) {
    const query = new URLSearchParams({ per_page: String(perPage), page: String(page) });
    if (afterTs) query.set("after", String(afterTs));

    const activities = await stravaFetch<StravaActivity[]>(
      userId,
      `/athlete/activities?${query}`
    );
    if (!activities.length) break;

    for (const act of activities) {
      const stravaId = String(act.id);

      // Skip if already imported
      const exists = await prisma.activity.findUnique({ where: { stravaId } });
      if (exists) { console.log(`[strava] skip existing ${stravaId}`); continue; }

      const sportType   = act.sport_type || act.type;
      const type        = mapStravaType(sportType);
      const startTime   = new Date(act.start_date);
      const avgSpeedMps = act.average_speed ?? 0;
      const avgPace     = avgSpeedMps > 0 ? 1 / avgSpeedMps : null; // s/m

      // Decode route from summary_polyline
      let routePoints: string | null = null;
      if (act.map?.summary_polyline) {
        const pts = decodePolyline(act.map.summary_polyline);
        if (pts.length > 0) {
          routePoints = JSON.stringify(downsample(pts, 200));
        }
      }

      // Calories: Strava provides `calories` directly; fall back to kilojoules
      const calories =
        act.calories
          ? Math.round(act.calories)
          : act.kilojoules
          ? Math.round(act.kilojoules / 4.184 * 1000)
          : null;

      console.log(`[strava] importing ${stravaId} — ${act.name} (${sportType})`);
      totalImported++;
      const created = await prisma.activity.create({
        data: {
          userId,
          stravaId,
          source:       "strava",
          name:         act.name,
          type,
          startTime,
          duration:     act.moving_time,
          distance:     act.distance > 0 ? act.distance : null,
          avgPace:      avgPace,
          avgHeartRate: act.average_heartrate ? Math.round(act.average_heartrate) : null,
          maxHeartRate: act.max_heartrate     ? Math.round(act.max_heartrate)     : null,
          elevGain:     act.total_elevation_gain > 0 ? act.total_elevation_gain : null,
          calories,
          routePoints,
          rawData:      JSON.stringify(act),
        },
      });

      // Absorb any manual workout log from the same session
      try { await absorbManualLog(created.id, userId); } catch {}

      // Auto-match against the active workout plan (fire-and-forget, never throws)
      reconcileActivity(created.id, userId).catch(() => {});

      // Fetch laps + HR stream (endurance with distance)
      if (act.distance > 0 && ["running", "cycling", "swimming"].includes(type)) {
        try {
          const detail = await stravaFetch<StravaDetailedActivity>(
            userId,
            `/activities/${act.id}`
          );
          if (detail.laps?.length > 1) {
            await prisma.activityLap.createMany({
              data: detail.laps.map((lap) => ({
                activityId:  created.id,
                lapIndex:    lap.lap_index,
                distance:    lap.distance,
                duration:    lap.elapsed_time,
                avgHeartRate: lap.average_heartrate ? Math.round(lap.average_heartrate) : null,
                maxHeartRate: lap.max_heartrate     ? Math.round(lap.max_heartrate)     : null,
                avgPace:      lap.average_speed && lap.average_speed > 0
                                ? 1 / lap.average_speed
                                : null,
                startTime:   new Date(lap.start_date),
              })),
              skipDuplicates: true,
            });
          }
        } catch (err) {
          console.warn(`[strava] laps fetch failed for ${act.id}:`, err instanceof Error ? err.message : err);
        }
      }

      // Fetch HR stream for any activity with heart rate data
      if (act.average_heartrate) {
        const { hrStream, hrZones, minHeartRate: minHR } = await fetchStravaHR(userId, act.id);
        if (hrStream || hrZones || minHR) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (prisma.activity.update as any)({
            where: { id: created.id },
            data: {
              ...(hrStream ? { hrStream } : {}),
              ...(hrZones  ? { hrZones  } : {}),
              ...(minHR    ? { minHeartRate: minHR } : {}),
            },
          });
        }
      }
    }

    if (activities.length < perPage) break;
    page++;
  }
  console.log(`[strava] sync complete — imported ${totalImported} activities`);
}
