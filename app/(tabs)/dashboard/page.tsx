/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { Button } from "@/components/ui/Button";
import { Bell } from "lucide-react";
import { SyncButton } from "@/components/dashboard/SyncButton";
import { OverallStatsCard } from "@/components/dashboard/OverallStatsCard";
import type { TypeTab, AllTypeStats, TypeStats } from "@/components/dashboard/OverallStatsCard";
import Link from "next/link";
import { getHRZone } from "@/lib/utils";
import { RecoveryWidget } from "@/components/dashboard/RecoveryWidget";

export const dynamic = "force-dynamic";

/** Map an activity type string to one of the 5 dashboard tabs, or null if unrecognised. */
function classifyType(type: string): TypeTab | null {
  const t = type.toLowerCase();
  if (t.includes("run")) return "RUNS";
  if (t.includes("cycl") || t.includes("bike") || t.includes("ride")) return "CYCLING";
  if (t.includes("swim")) return "SWIMMING";
  if (t.includes("strength") || t.includes("gym") || t.includes("weight") || t.includes("functional_strength")) return "STRENGTH";
  if (t.includes("hiit") || t.includes("crossfit") || t.includes("circuit") || t.includes("cardio") || t.includes("interval")) return "HIIT";
  return null;
}

const EMPTY_STATS: TypeStats = {
  count: 0, totalDistanceM: 0, totalDurationS: 0, totalCalories: 0,
  avgPaceSpM: null, avgSpeedMps: null, avgHeartRate: null,
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  // Recent activities for the feed
  const activities = await prisma.activity.findMany({
    where: { userId },
    orderBy: { startTime: "desc" },
    take: 20,
    include: { laps: { orderBy: { lapIndex: "asc" }, take: 1 } },
  });

  // All activities (lightweight) for overall stats aggregation
  const allActivities = await prisma.activity.findMany({
    where: { userId },
    select: {
      type: true, distance: true, duration: true, calories: true,
      avgPace: true, avgHeartRate: true,
    },
  });

  // Aggregate into per-tab stats
  const buckets: Record<TypeTab, {
    count: number; distM: number; durS: number; kcal: number;
    paceSum: number; paceCount: number;
    speedSum: number; speedCount: number;
    hrSum: number; hrCount: number;
  }> = {
    RUNS:     { count: 0, distM: 0, durS: 0, kcal: 0, paceSum: 0, paceCount: 0, speedSum: 0, speedCount: 0, hrSum: 0, hrCount: 0 },
    CYCLING:  { count: 0, distM: 0, durS: 0, kcal: 0, paceSum: 0, paceCount: 0, speedSum: 0, speedCount: 0, hrSum: 0, hrCount: 0 },
    SWIMMING: { count: 0, distM: 0, durS: 0, kcal: 0, paceSum: 0, paceCount: 0, speedSum: 0, speedCount: 0, hrSum: 0, hrCount: 0 },
    STRENGTH: { count: 0, distM: 0, durS: 0, kcal: 0, paceSum: 0, paceCount: 0, speedSum: 0, speedCount: 0, hrSum: 0, hrCount: 0 },
    HIIT:     { count: 0, distM: 0, durS: 0, kcal: 0, paceSum: 0, paceCount: 0, speedSum: 0, speedCount: 0, hrSum: 0, hrCount: 0 },
  };

  for (const a of allActivities) {
    const tab = classifyType(a.type);
    if (!tab) continue;
    const b = buckets[tab];
    b.count++;
    b.distM   += a.distance || 0;
    b.durS    += a.duration;
    b.kcal    += a.calories || 0;
    if (a.avgPace) { b.paceSum += a.avgPace; b.paceCount++; }
    // derive speed from pace (avgPace = s/m → speed = 1/avgPace m/s)
    if (a.avgPace) { b.speedSum += 1 / a.avgPace; b.speedCount++; }
    if (a.avgHeartRate) { b.hrSum += a.avgHeartRate; b.hrCount++; }
  }

  const overallStats: AllTypeStats = Object.fromEntries(
    (Object.entries(buckets) as [TypeTab, typeof buckets[TypeTab]][]).map(([tab, b]) => [
      tab,
      b.count === 0 ? EMPTY_STATS : ({
        count: b.count,
        totalDistanceM: b.distM,
        totalDurationS: b.durS,
        totalCalories:  b.kcal,
        avgPaceSpM:     b.paceCount  > 0 ? b.paceSum  / b.paceCount  : null,
        avgSpeedMps:    b.speedCount > 0 ? b.speedSum / b.speedCount : null,
        avgHeartRate:   b.hrCount    > 0 ? b.hrSum    / b.hrCount    : null,
      } satisfies TypeStats),
    ])
  ) as AllTypeStats;

  const [garminConn, whoopConn] = await Promise.all([
    prisma.trackerConnection.findUnique({ where: { userId_provider: { userId, provider: "garmin" } } }),
    prisma.trackerConnection.findUnique({ where: { userId_provider: { userId, provider: "whoop" } } }),
  ]);

  // Today's WHOOP recovery (most recent record)
  const todayRecovery = whoopConn
    ? await prisma.whoopRecovery.findFirst({
        where: { userId },
        orderBy: { date: "desc" },
        select: {
          date: true, recoveryScore: true, hrv: true, restingHR: true,
          totalSleepMin: true, sleepScore: true, strain: true,
        },
      })
    : null;

  const name = session?.user?.name?.split(" ")[0] || "Athlete";

  return (
    <div className="px-5 pt-14 pb-28 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-2)]">Good morning,</p>
          <h1 className="text-2xl font-bold text-white">{name} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          {(garminConn || whoopConn) && (
            <SyncButton hasGarmin={!!garminConn} hasWhoop={!!whoopConn} />
          )}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-2)]">
            <Bell size={15} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF9500]" />
          </button>
        </div>
      </div>

      {/* WHOOP Recovery widget */}
      <RecoveryWidget
        recovery={todayRecovery ?? null}
        whoopConnected={!!whoopConn}
      />

      {/* Per-type overall stats */}
      <OverallStatsCard stats={overallStats} />

      {/* No activities yet */}
      {activities.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-4xl">🏃</p>
          <p className="font-semibold text-[var(--text-2)]">No activities yet</p>
          <p className="text-sm text-[var(--text-3)]">
            Connect your tracker to import workouts
          </p>
          <Link href="/connect">
            <Button variant="accent" size="sm">
              Connect Tracker
            </Button>
          </Link>
        </div>
      )}

      {/* Activity feed */}
      {activities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Recent Activity</h2>
            <Link href="/activity" className="text-xs text-[var(--text-2)] hover:text-white transition-colors">
              See all →
            </Link>
          </div>

          <div className="space-y-3">
            {activities.map((act) => {
              const zone = act.avgHeartRate ? getHRZone(act.avgHeartRate) : 2;
              return (
                <ActivityCard
                  key={act.id}
                  id={act.id}
                  name={act.name}
                  type={act.type}
                  startTime={act.startTime}
                  duration={act.duration}
                  distance={act.distance}
                  avgHeartRate={act.avgHeartRate}
                  avgPace={act.avgPace}
                  elevGain={act.elevGain}
                  calories={act.calories}
                  zone={zone}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
