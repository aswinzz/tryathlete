import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";
import { withApiHandler } from "@/lib/apiError";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/mobile/feed
//
// Single call powering the redesigned Feed widgets:
//   - streakWeeks:     consecutive calendar weeks (Mon-start) with ≥1 activity
//   - week:            this week's per-sport volume + active-plan progress
//   - suggestedCount:  suggested activity↔entry matches awaiting review
//   - prs:             personal records achieved in the last 14 days
// ---------------------------------------------------------------------------

/** Monday 00:00 of the week containing `d` (server-local, matching today-plan). */
function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = out.getDay(); // 0=Sun
  const back = dow === 0 ? 6 : dow - 1;
  out.setDate(out.getDate() - back);
  return out;
}

const isRun = (t: string) => t.toLowerCase().includes("run");
const isRide = (t: string) => {
  const s = t.toLowerCase();
  return s.includes("cycl") || s.includes("bike") || s.includes("ride");
};
const isSwim = (t: string) => t.toLowerCase().includes("swim");

export const GET = withApiHandler(async (req: NextRequest) => {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const weekStart = startOfWeek(now);
  const streakWindow = new Date(weekStart);
  streakWindow.setDate(streakWindow.getDate() - 7 * 26); // look back 26 weeks

  // Started in parallel, awaited individually (keeps precise Prisma types —
  // Promise.all tuple inference degrades with heterogeneous select shapes).
  const planP = prisma.workoutPlan.findFirst({
    where: { userId, isActive: true },
    select: { id: true, title: true, startDate: true, weeks: { select: { weekNumber: true } } },
  });
  // Single scan serves both the streak/volume window and all-time PRs
  const prsP = prisma.activity.findMany({
    where: { userId },
    select: { type: true, distance: true, duration: true, avgPace: true, startTime: true },
  });
  // Only count suggestions on entries that aren't already matched — an entry
  // with a confirmed (AUTO/MANUAL) link no longer needs review even if stale
  // SUGGESTED rows exist alongside it.
  const suggestedP = prisma.planActivityLink.count({
    where: {
      status: "SUGGESTED",
      entry: {
        day: { week: { plan: { userId, isActive: true } } },
        links: { none: { status: { in: ["AUTO", "MANUAL"] } } },
      },
    },
  });
  const plan = await planP;
  const allForPRs = await prsP;
  const suggestedCount = await suggestedP;
  const recentActivities = allForPRs.filter((a) => a.startTime >= streakWindow);

  // ── This week's volume ────────────────────────────────────────────────────
  const thisWeek = recentActivities.filter((a) => a.startTime >= weekStart);
  let runM = 0, rideM = 0, swimM = 0, timeSec = 0;
  for (const a of thisWeek) {
    timeSec += a.duration;
    if (isRun(a.type))  runM  += a.distance ?? 0;
    if (isRide(a.type)) rideM += a.distance ?? 0;
    if (isSwim(a.type)) swimM += a.distance ?? 0;
  }

  // ── Plan progress for the current week ────────────────────────────────────
  let planProgress: {
    title: string; weekNumber: number; totalWeeks: number;
    done: number; planned: number;
  } | null = null;

  if (plan?.startDate) {
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const startUTC = Date.UTC(
      plan.startDate.getFullYear(), plan.startDate.getMonth(), plan.startDate.getDate()
    );
    const daysElapsed = Math.floor((todayUTC - startUTC) / 86_400_000);
    if (daysElapsed >= 0) {
      const weekNumber = Math.floor(daysElapsed / 7) + 1;
      const totalWeeks = plan.weeks.reduce((m, w) => Math.max(m, w.weekNumber), 0);
      const week = await prisma.workoutWeek.findFirst({
        where: { planId: plan.id, weekNumber },
        select: {
          days: {
            select: { type: true, status: true, _count: { select: { entries: true } } },
          },
        },
      });
      if (week) {
        const workoutDays = week.days.filter(
          (d) => d.type !== "REST" && d.type !== "RECOVERY" && d._count.entries > 0
        );
        planProgress = {
          title: plan.title,
          weekNumber,
          totalWeeks,
          done: workoutDays.filter((d) => d.status === "COMPLETED").length,
          planned: workoutDays.length,
        };
      }
    }
  }

  // ── Streak: consecutive Mon-start weeks with ≥1 activity ─────────────────
  const weekIndex = (d: Date) =>
    Math.floor((startOfWeek(d).getTime() - weekStart.getTime()) / (7 * 86_400_000)); // 0 = this week, -1 = last week…
  const activeWeeks = new Set(recentActivities.map((a) => weekIndex(a.startTime)));
  let streakWeeks = 0;
  // Current week counts if active; otherwise the streak may still be alive from last week.
  let cursor = activeWeeks.has(0) ? 0 : -1;
  while (activeWeeks.has(cursor)) { streakWeeks++; cursor--; }

  // ── PRs achieved in the last 14 days ──────────────────────────────────────
  const prWindow = new Date(now.getTime() - 14 * 86_400_000);
  const prs: { label: string; value: string }[] = [];

  type PRAct = {
    type: string; distance: number | null; duration: number;
    avgPace: number | null; startTime: Date;
  };
  function bestBy(items: PRAct[], score: (t: PRAct) => number | null): PRAct | null {
    let best: PRAct | null = null; let bestScore = -Infinity;
    for (const it of items) {
      const s = score(it);
      if (s !== null && s > bestScore) { bestScore = s; best = it; }
    }
    return best;
  }
  const fmtKm = (m: number) => `${(m / 1000).toFixed(1)} km`;
  const fmtPace = (spm: number) => {
    const spk = spm * 1000;
    return `${Math.floor(spk / 60)}:${String(Math.round(spk) % 60).padStart(2, "0")}/km`;
  };

  const runs  = allForPRs.filter((a) => isRun(a.type));
  const rides = allForPRs.filter((a) => isRide(a.type));
  const swims = allForPRs.filter((a) => isSwim(a.type));

  const longestRun = bestBy(runs, (a) => a.distance ?? null);
  if (longestRun?.distance && longestRun.startTime >= prWindow) {
    prs.push({ label: "Longest run", value: fmtKm(longestRun.distance) });
  }
  const fastestRun = bestBy(
    runs.filter((a) => (a.distance ?? 0) >= 3000),
    (a) => (a.avgPace ? -a.avgPace : null) // lower pace = better
  );
  if (fastestRun?.avgPace && fastestRun.startTime >= prWindow) {
    prs.push({ label: "Fastest run pace", value: fmtPace(fastestRun.avgPace) });
  }
  const longestRide = bestBy(rides, (a) => a.distance ?? null);
  if (longestRide?.distance && longestRide.startTime >= prWindow) {
    prs.push({ label: "Longest ride", value: fmtKm(longestRide.distance) });
  }
  const longestSwim = bestBy(swims, (a) => a.distance ?? null);
  if (longestSwim?.distance && longestSwim.startTime >= prWindow) {
    prs.push({ label: "Longest swim", value: `${Math.round(longestSwim.distance)} m` });
  }

  return NextResponse.json({
    streakWeeks,
    suggestedCount,
    week: {
      runKm:  Math.round(runM / 100) / 10,
      rideKm: Math.round(rideM / 100) / 10,
      swimKm: Math.round(swimM / 100) / 10,
      timeSec,
      plan: planProgress,
    },
    prs: prs.slice(0, 3),
  });
}, "mobile.feed");
