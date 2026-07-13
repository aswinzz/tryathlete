/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { SyncButton } from "@/components/dashboard/SyncButton";
import Link from "next/link";
import { RecoveryWidget } from "@/components/dashboard/RecoveryWidget";
import { FeedWidgets } from "@/components/dashboard/FeedWidgets";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { Greeting } from "@/components/dashboard/Greeting";
import { LogWorkoutButton } from "@/app/(tabs)/activity/LogWorkoutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  // Recent activities for the feed (client groups into Today / Yesterday)
  const activities = await prisma.activity.findMany({
    where: { userId },
    orderBy: { startTime: "desc" },
    take: 20,
    select: {
      id: true, name: true, type: true, startTime: true, duration: true,
      distance: true, avgHeartRate: true, avgPace: true, elevGain: true, calories: true,
    },
  });

  const [garminConn, whoopConn, stravaConn] = await Promise.all([
    prisma.trackerConnection.findUnique({ where: { userId_provider: { userId, provider: "garmin" } } }),
    prisma.trackerConnection.findUnique({ where: { userId_provider: { userId, provider: "whoop" } } }),
    prisma.trackerConnection.findUnique({ where: { userId_provider: { userId, provider: "strava" } } }),
  ]);

  // Today's recovery — WHOOP first, Garmin (Training Readiness / Body Battery) fallback
  const utcToday = new Date();
  const todayStart = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), utcToday.getUTCDate()));
  let todayRecovery = whoopConn
    ? await prisma.whoopRecovery.findFirst({
        where: { userId, date: { gte: todayStart } },
        orderBy: { date: "desc" },
        select: {
          date: true, recoveryScore: true, hrv: true, restingHR: true,
          totalSleepMin: true, sleepScore: true, strain: true,
        },
      })
    : null;

  if (!todayRecovery && garminConn) {
    const gCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const g = await prisma.garminWellness.findFirst({
      where: { userId, date: { gte: gCutoff } },
      orderBy: { date: "desc" },
    });
    if (g) {
      todayRecovery = {
        date: g.date,
        recoveryScore: g.trainingReadiness ?? g.bodyBattery ?? null,
        hrv: g.hrv,
        restingHR: g.restingHR,
        totalSleepMin: g.totalSleepMin,
        sleepScore: g.sleepScore,
        strain: null,
      };
    }
  }

  // ── Today's plan (active plan → this week → today) ──────────────────────────
  const activePlan = await prisma.workoutPlan.findFirst({
    where: { userId, isActive: true },
    select: { id: true, title: true, startDate: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let todayPlanDay: any = null;
  let todayPlanHref: string | null = null;
  if (activePlan?.startDate) {
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const startUTC = Date.UTC(
      activePlan.startDate.getFullYear(), activePlan.startDate.getMonth(), activePlan.startDate.getDate()
    );
    const daysElapsed = Math.floor((todayUTC - startUTC) / 86_400_000);
    if (daysElapsed >= 0) {
      const weekNumber = Math.floor(daysElapsed / 7) + 1;
      const jsDow = now.getDay();
      const dayOfWeek = jsDow === 0 ? 7 : jsDow;
      const week = await prisma.workoutWeek.findFirst({
        where: { planId: activePlan.id, weekNumber },
        select: { id: true },
      });
      if (week) {
        todayPlanDay = await prisma.workoutDay.findFirst({
          where: { weekId: week.id, dayOfWeek },
          include: {
            entries: {
              orderBy: { orderIndex: "asc" },
              include: { links: { where: { status: { in: ["AUTO", "MANUAL"] } }, select: { id: true } } },
            },
          },
        });
        if (todayPlanDay) {
          todayPlanHref = `/plans/${activePlan.id}/day/${weekNumber}/${dayOfWeek}`;
        }
      }
    }
  }

  const name = session?.user?.name?.split(" ")[0] || "Athlete";

  // Streak: consecutive Mon-start weeks with ≥1 activity (mirrors the feed API)
  const weekStartOf = (d: Date) => {
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = out.getDay();
    out.setDate(out.getDate() - (dow === 0 ? 6 : dow - 1));
    return out;
  };
  const thisWeekStart = weekStartOf(new Date());
  const streakWindow = new Date(thisWeekStart);
  streakWindow.setDate(streakWindow.getDate() - 7 * 26);
  const streakActs = await prisma.activity.findMany({
    where: { userId, startTime: { gte: streakWindow } },
    select: { startTime: true },
  });
  const activeWeeks = new Set(
    streakActs.map((a: { startTime: Date }) =>
      Math.floor((weekStartOf(a.startTime).getTime() - thisWeekStart.getTime()) / (7 * 86_400_000))
    )
  );
  let streakWeeks = 0;
  let cursor = activeWeeks.has(0) ? 0 : -1;
  while (activeWeeks.has(cursor)) { streakWeeks++; cursor--; }

  return (
    <div className="px-5 pt-14 pb-28 space-y-6">
      {/* Header — greeting · streak · log workout · sync */}
      <div className="flex items-center justify-between gap-2">
        <Greeting name={name} />
        <div className="flex items-center gap-2 shrink-0">
          {streakWeeks > 1 && (
            <span className="text-[11px] font-semibold text-white px-2.5 py-1.5 rounded-full whitespace-nowrap" style={{ background: "var(--surface-2)" }}>
              🔥 {streakWeeks} wk streak
            </span>
          )}
          <LogWorkoutButton />
          {(garminConn || whoopConn || stravaConn) && (
            <SyncButton hasGarmin={!!garminConn} hasWhoop={!!whoopConn} hasStrava={!!stravaConn} />
          )}
        </div>
      </div>

      {/* No active plan — matches the iOS hero empty state */}
      {!activePlan && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
          <div className="rounded-xl py-5 text-center" style={{ background: "var(--surface-2)" }}>
            <p className="text-sm font-semibold text-white">No training plan yet</p>
            <p className="text-xs text-[var(--text-2)] mt-1">Create a plan to see your daily workouts here</p>
          </div>
          <Link
            href="/plans"
            className="block w-full py-3 rounded-xl text-center text-sm font-bold"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Create a plan →
          </Link>
        </div>
      )}

      {/* Today's plan */}
      {todayPlanDay && todayPlanHref && (
        <Link href={todayPlanHref} className="block">
          <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.15em] text-[var(--text-3)]">
                TODAY&apos;S PLAN
                {todayPlanDay.status === "COMPLETED" && <span className="text-[var(--accent)] ml-2">✓ DONE</span>}
              </p>
              <span className="text-xs text-[var(--text-2)]">See details →</span>
            </div>
            {todayPlanDay.type === "REST" || todayPlanDay.type === "RECOVERY" ? (
              <p className="text-sm text-[var(--text-2)]">😴 Rest day — recovery is training too</p>
            ) : todayPlanDay.entries.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">No workouts planned today</p>
            ) : (
              <div className="space-y-1.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {todayPlanDay.entries.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ background: "var(--surface-2)" }}>
                    <span className="text-base">
                      {({ RUN: "🏃", CYCLING: "🚴", SWIMMING: "🏊", STRENGTH: "🏋️", HIIT: "⚡" } as Record<string, string>)[e.type] ?? "📋"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{e.title}</p>
                      {e.durationMin && <p className="text-[11px] text-[var(--text-3)]">{e.durationMin} min</p>}
                    </div>
                    {e.links.length > 0 && <span className="text-[var(--accent)] text-sm">✓</span>}
                  </div>
                ))}
              </div>
            )}
            {todayPlanDay.status !== "COMPLETED" &&
              todayPlanDay.type !== "REST" && todayPlanDay.type !== "RECOVERY" &&
              todayPlanDay.entries.length > 0 && (
              <div className="w-full py-3 rounded-xl text-center text-sm font-bold"
                style={{ background: "var(--accent)", color: "#000" }}>
                View today&apos;s workout →
              </div>
            )}
          </div>
        </Link>
      )}

      {/* Recovery widget — WHOOP or Garmin */}
      <RecoveryWidget
        recovery={todayRecovery ?? null}
        whoopConnected={!!whoopConn || !!garminConn}
      />

      {/* Week progress · PRs · suggested matches (live from feed API) */}
      <FeedWidgets />

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

      {/* Recent activity — Today / Yesterday groups, matching iOS */}
      {activities.length > 0 && (
        <RecentActivityFeed
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          activities={activities.map((a: any) => ({
            id: a.id, name: a.name, type: a.type,
            startTime: a.startTime.toISOString(),
            duration: a.duration, distance: a.distance,
            avgHeartRate: a.avgHeartRate, avgPace: a.avgPace,
            elevGain: a.elevGain, calories: a.calories,
          }))}
        />
      )}
    </div>
  );
}
