import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await verifyMobileToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      activities: { select: { type: true, distance: true, duration: true, startTime: true } },
      connections: { select: { provider: true, connected: true, lastSyncAt: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activities = user.activities;
  const totalActivities = activities.length;
  const totalKm = Math.round(activities.reduce((s, a) => s + (a.distance || 0), 0) / 1000);
  const runs = activities.filter((a) => a.type.toLowerCase().includes("run"));

  // Best times
  const findBest = (minM: number, maxM: number) =>
    runs.reduce((best: typeof runs[0] | null, a) => {
      const d = a.distance || 0;
      if (d < minM || d > maxM) return best;
      return !best || a.duration < best.duration ? a : best;
    }, null);

  const best5k   = findBest(4800, 5200);
  const best10k  = findBest(9800, 10200);
  const bestHalf = findBest(20000, 22000);
  const longestRun = runs.reduce((best: typeof runs[0] | null, a) =>
    !best || (a.distance || 0) > (best.distance || 0) ? a : best, null);

  // Streak
  const activityDates = new Set(activities.map((a) => new Date(a.startTime).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (activityDates.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }

  // Monthly km (current year, 12 values)
  const currentYear = new Date().getFullYear();
  const monthlyKm = Array.from({ length: 12 }, (_, m) =>
    Math.round(
      activities
        .filter((a) => {
          const d = new Date(a.startTime);
          return d.getFullYear() === currentYear && d.getMonth() === m;
        })
        .reduce((s, a) => s + (a.distance || 0), 0) / 1000
    )
  );

  // Connections — normalized for mobile
  const connections = user.connections.map((c) => ({
    id: c.provider,
    service: c.provider,
    isConnected: c.connected,
    lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
  }));

  return NextResponse.json({
    totalActivities,
    totalKm,
    streak,
    best5kSecs:    best5k?.duration   ?? null,
    best5kDate:    best5k?.startTime.toISOString()    ?? null,
    best10kSecs:   best10k?.duration  ?? null,
    best10kDate:   best10k?.startTime.toISOString()   ?? null,
    bestHalfSecs:  bestHalf?.duration ?? null,
    bestHalfDate:  bestHalf?.startTime.toISOString()  ?? null,
    longestRunKm:  longestRun?.distance ? longestRun.distance / 1000 : null,
    longestRunDate: longestRun?.startTime.toISOString() ?? null,
    monthlyKm,
    connections,
  });
}
