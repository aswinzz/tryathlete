/**
 * WHOOP API integration
 *
 * OAuth2 flow:
 *   1. /api/whoop/auth      → redirect to WHOOP auth URL
 *   2. /api/whoop/callback  → exchange code, store tokens
 *   3. /api/whoop/sync      → call syncWhoopData()
 *
 * WHOOP uses standard OAuth2 with refresh tokens.
 * Tokens are stored in TrackerConnection (provider = "whoop").
 */

import { prisma } from "./prisma";
import { sendPushToUser } from "./push";
import { reconcileActivity } from "./planReconciler";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhoopDataPrefs {
  syncActivities: boolean;
  syncRecovery:   boolean;
  syncSleep:      boolean;
}

export const DEFAULT_WHOOP_PREFS: WhoopDataPrefs = {
  syncActivities: false, // default OFF — Garmin is typically the activity source
  syncRecovery:   true,
  syncSleep:      true,
};

export const DEFAULT_GARMIN_PREFS = {
  syncActivities: true,
  // Wellness (Training Readiness / HRV / sleep) syncs by default — the recovery
  // endpoints prefer WHOOP when both sources exist, so this is safe for WHOOP users.
  syncRecovery:   true,
  syncSleep:      true,
};

export function parseDataPrefs(raw: string | null | undefined, defaults: WhoopDataPrefs): WhoopDataPrefs {
  if (!raw) return defaults;
  try { return { ...defaults, ...JSON.parse(raw) }; } catch { return defaults; }
}

// ─── OAuth helpers ────────────────────────────────────────────────────────────

const WHOOP_AUTH_URL   = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN_URL  = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_API_BASE   = "https://api.prod.whoop.com/developer/v2";
const WHOOP_SCOPES     = "offline read:recovery read:cycles read:sleep read:workout read:profile";

export function getWhoopAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.WHOOP_CLIENT_ID!,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         WHOOP_SCOPES,
    state,
  });
  return `${WHOOP_AUTH_URL}?${params}`;
}

export async function exchangeWhoopCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  redirectUri,
      client_id:     process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`WHOOP token exchange failed: ${res.status}`);
  const data = await res.json();
  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresIn:    data.expires_in,
  };
}

async function refreshWhoopToken(userId: string): Promise<string> {
  const conn = await prisma.trackerConnection.findUnique({
    where: { userId_provider: { userId, provider: "whoop" } },
  });
  if (!conn?.refreshToken) throw new Error("WHOOP not connected");

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: conn.refreshToken,
      client_id:     process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`WHOOP token refresh failed: ${res.status}`);
  const data = await res.json();

  const expiry = new Date(Date.now() + data.expires_in * 1000);
  await prisma.trackerConnection.update({
    where: { userId_provider: { userId, provider: "whoop" } },
    data: {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token ?? conn.refreshToken,
      tokenExpiry:  expiry,
    },
  });
  return data.access_token;
}

/**
 * Returns a valid access token for the user, refreshing it if expired.
 * Call this ONCE before parallel API calls to avoid a race condition where
 * multiple simultaneous requests all attempt to consume the same single-use
 * refresh token.
 */
async function getValidWhoopToken(userId: string): Promise<string> {
  const conn = await prisma.trackerConnection.findUnique({
    where: { userId_provider: { userId, provider: "whoop" } },
  });
  if (!conn?.accessToken) throw new Error("WHOOP not connected");

  // Refresh if expired or within 5 minutes of expiry (generous window so
  // parallel callers all share the same fresh token rather than each racing
  // to refresh the now-single-use refresh token)
  if (!conn.tokenExpiry || conn.tokenExpiry.getTime() - Date.now() < 300_000) {
    return refreshWhoopToken(userId);
  }
  return conn.accessToken;
}

async function whoopFetch<T>(userId: string, path: string, token?: string): Promise<T> {
  // Accept a pre-fetched token (passed in for parallel calls) or fetch one now
  const accessToken = token ?? await getValidWhoopToken(userId);

  const res = await fetch(`${WHOOP_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 401 → try one refresh (handles tokens that expired mid-request)
  if (res.status === 401) {
    const freshToken = await refreshWhoopToken(userId);
    const retry = await fetch(`${WHOOP_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });
    if (!retry.ok) throw new Error(`WHOOP API error ${retry.status} on ${path}`);
    return retry.json() as Promise<T>;
  }

  if (!res.ok) throw new Error(`WHOOP API error ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

// ─── Paginated fetch helper ───────────────────────────────────────────────────

interface WhoopPage<T> {
  records:    T[];
  next_token?: string;
}

async function whoopFetchAll<T>(
  userId: string,
  path: string,
  limit = 25,
  token?: string
): Promise<T[]> {
  const results: T[] = [];
  let nextToken: string | undefined;

  do {
    const query = new URLSearchParams({ limit: String(limit) });
    if (nextToken) query.set("nextToken", nextToken);
    const page = await whoopFetch<WhoopPage<T>>(userId, `${path}?${query}`, token);
    results.push(...(page.records ?? []));
    nextToken = page.next_token;
  } while (nextToken);

  return results;
}

// ─── User profile ─────────────────────────────────────────────────────────────

interface WhoopUserProfile {
  user_id:    number;
  email:      string;
  first_name: string;
  last_name:  string;
}

/**
 * Fetch the WHOOP user ID for a connected user.
 * Stored in TrackerConnection.whoopUserId so webhook events can be routed.
 */
export async function fetchWhoopUserId(userId: string): Promise<string> {
  const profile = await whoopFetch<WhoopUserProfile>(userId, "/user/profile/basic");
  return String(profile.user_id);
}

// ─── Main sync ────────────────────────────────────────────────────────────────

export async function syncWhoopData(userId: string) {
  const conn = await prisma.trackerConnection.findUnique({
    where: { userId_provider: { userId, provider: "whoop" } },
  });
  if (!conn) throw new Error("WHOOP not connected");

  // Backfill whoopUserId for connections made before webhooks were added
  if (!conn.whoopUserId) {
    try {
      const whoopUserId = await fetchWhoopUserId(userId);
      await prisma.trackerConnection.update({
        where: { userId_provider: { userId, provider: "whoop" } },
        data: { whoopUserId },
      });
      console.log(`[whoop] backfilled whoopUserId=${whoopUserId}`);
    } catch (err) {
      console.warn("[whoop] could not backfill whoopUserId:", err instanceof Error ? err.message : err);
    }
  }

  const prefs = parseDataPrefs(conn.dataPrefs, DEFAULT_WHOOP_PREFS);
  const errors: string[] = [];

  // ── Activities (workouts) ─────────────────────────────────────────────────
  if (prefs.syncActivities) {
    try {
      await syncWhoopWorkouts(userId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[whoop] workout sync failed:", msg);
      errors.push(`workouts: ${msg}`);
    }
  }

  // ── Recovery + Sleep + Cycle (always fetched together from cycles) ────────
  if (prefs.syncRecovery || prefs.syncSleep) {
    try {
      await syncWhoopRecovery(userId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[whoop] recovery sync failed:", msg);
      errors.push(`recovery: ${msg}`);
    }
  }

  await prisma.trackerConnection.update({
    where: { userId_provider: { userId, provider: "whoop" } },
    data: { lastSyncAt: new Date() },
  });

  if (errors.length > 0) {
    throw new Error(`WHOOP sync completed with errors — ${errors.join("; ")}`);
  }
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

interface WhoopWorkout {
  id:                  string;  // UUID in v2
  v1_id?:              number;
  user_id:             number;
  created_at:          string;
  updated_at:          string;
  start:               string;
  end:                 string;
  timezone_offset:     string;
  sport_id:            number;
  sport_name?:         string;
  score_state:         string;
  score?: {
    strain:            number;
    average_heart_rate: number;
    max_heart_rate:    number;
    kilojoule:         number;
    percent_recorded:  number;
    distance_meter?:   number;
    altitude_gain_meter?: number;
    altitude_change_meter?: number;
    zone_durations?: {          // plural in v2
      zone_zero_milli: number;
      zone_one_milli:  number;
      zone_two_milli:  number;
      zone_three_milli: number;
      zone_four_milli: number;
      zone_five_milli: number;
    };
  };
}

// WHOOP sport_id → activity type string
const WHOOP_SPORT_MAP: Record<number, string> = {
  0:   "running",
  1:   "cycling",
  16:  "running",  // outdoor run
  63:  "running",  // indoor run
  71:  "swimming",
  74:  "swimming",
  44:  "strength_training",
  52:  "yoga",
  57:  "hiit",
  64:  "strength_training",
  // everything else falls through to "other"
};

async function syncWhoopWorkouts(userId: string) {
  const token = await getValidWhoopToken(userId);
  const workouts = await whoopFetchAll<WhoopWorkout>(userId, "/activity/workout", 25, token);

  for (const w of workouts) {
    const whoopId = String(w.id);
    const exists = await prisma.activity.findUnique({ where: { whoopId } });
    if (exists) continue;

    const startTime = new Date(w.start);
    const endTime   = new Date(w.end);
    const durationS = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    const type = WHOOP_SPORT_MAP[w.sport_id] ?? "other";
    const score = w.score;

    const name = `WHOOP ${type.replace(/_/g, " ")}`;
    const created = await prisma.activity.create({
      data: {
        userId,
        whoopId,
        source:      "whoop",
        name,
        type,
        startTime,
        duration:    durationS,
        distance:    score?.distance_meter ?? null,
        calories:    score?.kilojoule ? Math.round(score.kilojoule / 4.184) : null,
        avgHeartRate: score?.average_heart_rate ? Math.round(score.average_heart_rate) : null,
        maxHeartRate: score?.max_heart_rate ? Math.round(score.max_heart_rate) : null,
        elevGain:    score?.altitude_gain_meter ?? null,
        rawData:     JSON.stringify(w),
      },
    });

    // Auto-match against the active workout plan (fire-and-forget, never throws)
    reconcileActivity(created.id, userId).catch(() => {});

    // Notify the user's iOS device(s)
    const durationMin = Math.round(durationS / 60);
    sendPushToUser(userId, {
      title: "New workout synced",
      body:  `${name} · ${durationMin} min`,
      data:  { type: "activity", activityId: created.id },
    }).catch(() => {});
  }
}

// ─── Recovery / Sleep / Cycle ─────────────────────────────────────────────────

interface WhoopCycle {
  id:               number;
  user_id:          number;
  created_at:       string;
  updated_at:       string;
  start:            string;
  end:              string | null;
  timezone_offset:  string;
  score_state:      string;
  score?: {
    strain:          number;
    kilojoule:       number;
    average_heart_rate: number;
    max_heart_rate:  number;
  };
}

interface WhoopRecoveryRecord {
  cycle_id:   number;
  sleep_id:   string;   // UUID in v2
  user_id:    number;
  created_at: string;
  updated_at: string;
  score_state: string;
  score?: {
    user_calibrating:  boolean;
    recovery_score:    number;
    resting_heart_rate: number;
    hrv_rmssd_milli:   number;
    spo2_percentage:   number;
    skin_temp_celsius: number;
  };
}

interface WhoopSleepRecord {
  id:               string;   // UUID in v2
  v1_id?:           number;
  cycle_id:         number;
  user_id:          number;
  created_at:       string;
  updated_at:       string;
  start:            string;
  end:              string;
  timezone_offset:  string;
  nap:              boolean;
  score_state:      string;
  score?: {
    stage_summary: {
      total_in_bed_time_milli:        number;
      total_awake_time_milli:         number;
      total_light_sleep_time_milli:   number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli:     number;
      sleep_cycle_count:              number;
      disturbance_count:              number;
    };
    respiratory_rate:            number;
    sleep_performance_percentage: number;
    sleep_consistency_percentage: number;
    sleep_efficiency_percentage:  number;
  };
}

async function syncWhoopRecovery(userId: string) {
  // Pre-fetch a valid token once so all three parallel calls share it,
  // preventing a race where each branch tries to refresh the single-use
  // refresh token simultaneously.
  const token = await getValidWhoopToken(userId);

  // Fetch cycles, recoveries and sleeps in parallel
  const [cycles, recoveries, sleeps] = await Promise.all([
    whoopFetchAll<WhoopCycle>(userId, "/cycle", 25, token),
    whoopFetchAll<WhoopRecoveryRecord>(userId, "/recovery", 25, token),
    whoopFetchAll<WhoopSleepRecord>(userId, "/activity/sleep", 25, token),
  ]);

  // Index by cycle id for fast lookup
  const recoveryByCycle = new Map(recoveries.map((r) => [r.cycle_id, r]));
  const sleepByCycle    = new Map(sleeps.filter((s) => !s.nap).map((s) => [s.cycle_id, s]));

  for (const cycle of cycles) {
    if (cycle.score_state !== "SCORED" && cycle.score_state !== "PENDING_SCORE") continue;

    const whoopCycleId = cycle.id;
    const exists = await prisma.whoopRecovery.findUnique({
      where: { userId_whoopCycleId: { userId, whoopCycleId } },
    });
    if (exists) continue;

    const rec   = recoveryByCycle.get(cycle.id);
    const sleep = sleepByCycle.get(cycle.id);

    const ms2min = (ms: number | undefined) => ms !== undefined ? Math.round(ms / 60_000) : null;

    await prisma.whoopRecovery.create({
      data: {
        userId,
        whoopCycleId,
        date:          new Date(cycle.start),
        cycleEnd:      cycle.end ? new Date(cycle.end) : null,
        // recovery
        recoveryScore: rec?.score?.recovery_score   ? Math.round(rec.score.recovery_score) : null,
        hrv:           rec?.score?.hrv_rmssd_milli  ?? null,
        restingHR:     rec?.score?.resting_heart_rate ? Math.round(rec.score.resting_heart_rate) : null,
        spo2:          rec?.score?.spo2_percentage  ?? null,
        skinTemp:      rec?.score?.skin_temp_celsius ?? null,
        // sleep
        sleepId:       sleep?.id               ?? null,
        totalSleepMin: ms2min(sleep?.score?.stage_summary.total_in_bed_time_milli),
        remMin:        ms2min(sleep?.score?.stage_summary.total_rem_sleep_time_milli),
        deepMin:       ms2min(sleep?.score?.stage_summary.total_slow_wave_sleep_time_milli),
        lightMin:      ms2min(sleep?.score?.stage_summary.total_light_sleep_time_milli),
        awakeMin:      ms2min(sleep?.score?.stage_summary.total_awake_time_milli),
        sleepScore:    sleep?.score?.sleep_performance_percentage ? Math.round(sleep.score.sleep_performance_percentage) : null,
        sleepEff:      sleep?.score?.sleep_efficiency_percentage ?? null,
        respRate:      sleep?.score?.respiratory_rate ?? null,
        // cycle / strain
        strain:        cycle.score?.strain        ?? null,
        kilojoule:     cycle.score?.kilojoule     ?? null,
        avgHR:         cycle.score?.average_heart_rate ? Math.round(cycle.score.average_heart_rate) : null,
        maxHR:         cycle.score?.max_heart_rate ? Math.round(cycle.score.max_heart_rate) : null,
        rawData: JSON.stringify({ cycle, recovery: rec ?? null, sleep: sleep ?? null }),
      },
    });
  }
}
