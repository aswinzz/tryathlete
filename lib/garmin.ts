import { GarminConnect } from "garmin-connect";
import { prisma } from "./prisma";

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
  const activities = await client.getActivities(0, 20);

  for (const act of activities) {
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
        startTime: new Date(act.startTimeLocal || act.startTimeGMT),
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
      const splitsUrl = `https://connect.garmin.com/activity-service/activity/${act.activityId}/splits`;
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
            startTime: lap.startTimeLocal ? new Date(lap.startTimeLocal) : null,
          },
        });
      }
    } catch {
      // Lap/split data not always available — skip silently
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
