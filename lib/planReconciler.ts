import { prisma } from "./prisma";

// ─── Thresholds ───────────────────────────────────────────────────────────────
const AUTO_LINK_THRESHOLD  = 0.70; // ≥70% → auto-link
const SUGGEST_THRESHOLD    = 0.40; // 40–69% → suggest, user confirms
// <40% → ignore

// ─── Type mapping ─────────────────────────────────────────────────────────────
// Maps Garmin activity typeKey strings → our EntryType enum values
const TYPE_MAP: Record<string, string[]> = {
  RUN:      ["running", "trail_running", "treadmill_running", "virtual_run", "track_running", "run"],
  CYCLING:  ["cycling", "road_cycling", "mountain_biking", "indoor_cycling", "virtual_ride", "ride", "bike"],
  SWIMMING: ["swimming", "open_water_swimming", "pool_swimming", "lap_swimming"],
  STRENGTH: ["strength_training", "gym", "weight_training", "functional_strength_training", "weightlifting"],
  HIIT:     ["hiit", "crossfit", "circuit_training", "cardio", "interval_training"],
};

function classifyActivityType(garminType: string): string | null {
  const t = garminType.toLowerCase();
  for (const [entryType, keywords] of Object.entries(TYPE_MAP)) {
    if (keywords.some((k) => t.includes(k))) return entryType;
  }
  return null;
}

function typeMatches(garminType: string, entryType: string): boolean {
  return classifyActivityType(garminType) === entryType;
}

// ─── Score computation ────────────────────────────────────────────────────────
interface Activity {
  id: string;
  type: string;
  distance: number | null;
  duration: number; // seconds
  avgPace: number | null;
}

interface Entry {
  id: string;
  type: string;
  durationMin: number | null;
  description: string | null;
  title: string;
}

/**
 * Score how well an activity matches a planned entry.
 * Returns 0.0–1.0.
 *
 * Weights:
 *   Type match      40 pts
 *   Distance match  30 pts  (parsed from title/description or planned distance)
 *   Duration match  20 pts
 *   Time-of-day     10 pts  (reserved — always 0 for now, future signal)
 *
 * This function is intentionally separate so a future "composite" resolver
 * can pass a merged/summed activity (warm-up + tempo combined) and still use
 * the same scoring.
 */
export function scoreMatch(activity: Activity, entry: Entry): number {
  let score = 0;

  // 1. Type match (40 pts)
  if (typeMatches(activity.type, entry.type)) {
    score += 40;
  } else {
    // Type mismatch is a hard blocker — no point scoring the rest
    return 0;
  }

  // 2. Distance match (30 pts) — parse planned distance from title/description
  const plannedDistM = parsePlannedDistance(entry.title, entry.description);
  if (plannedDistM !== null && activity.distance !== null) {
    const ratio = Math.min(activity.distance, plannedDistM) / Math.max(activity.distance, plannedDistM);
    // ratio=1.0 → full 30pts; ratio=0.75 → 22.5pts; ratio<0.5 → 0pts
    score += Math.max(0, ratio * 30 - (ratio < 0.75 ? 15 : 0));
  } else if (plannedDistM === null) {
    // No distance signal — award partial credit so duration can still drive it
    score += 15;
  }

  // 3. Duration match (20 pts)
  if (entry.durationMin !== null) {
    const plannedS = entry.durationMin * 60;
    const ratio = Math.min(activity.duration, plannedS) / Math.max(activity.duration, plannedS);
    score += Math.max(0, ratio * 20 - (ratio < 0.75 ? 10 : 0));
  } else {
    score += 10; // partial credit — no planned duration specified
  }

  // 4. Reserved for time-of-day, HR zone, etc. (10 pts)
  // score += 0;

  return Math.min(score, 100) / 100; // normalise to 0.0–1.0
}

// Parse a distance in metres from a plain-text title/description.
// Handles: "10K", "10 km", "5k run", "800m", "half marathon", "marathon"
function parsePlannedDistance(title: string, description: string | null): number | null {
  const text = `${title} ${description ?? ""}`.toLowerCase();

  if (text.includes("marathon") && !text.includes("half")) return 42195;
  if (text.includes("half marathon") || text.includes("half-marathon")) return 21097;

  // kilometres: "10k", "10km", "10 km", "10 kms"
  const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*k(?:m|ms|ilom)/);
  if (kmMatch) return parseFloat(kmMatch[1]) * 1000;

  // metres: "800m", "1500 m"
  const mMatch = text.match(/(\d+(?:\.\d+)?)\s*m(?:\b|etr)/);
  if (mMatch) return parseFloat(mMatch[1]);

  // bare "5k", "10k" without "km"
  const bareKMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (bareKMatch) return parseFloat(bareKMatch[1]) * 1000;

  return null;
}

// ─── Calendar date helpers ────────────────────────────────────────────────────

/** Return the calendar date (UTC midnight) for a given plan week+day. */
function planDayDate(startDate: Date, weekNumber: number, dayOfWeek: number): Date {
  const d = new Date(startDate);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + (weekNumber - 1) * 7 + (dayOfWeek - 1));
  return d;
}

/** Check if two dates fall on the same calendar day (UTC). */
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth()    === b.getUTCMonth()    &&
    a.getUTCDate()     === b.getUTCDate()
  );
}

// ─── Day completion check ─────────────────────────────────────────────────────

/**
 * After linking, check if every entry in the day has ≥1 confirmed/auto link.
 * If so, mark the day as COMPLETED.
 */
async function maybeCompleteDayAfterLink(dayId: string) {
  const entries = await prisma.workoutEntry.findMany({
    where: { dayId },
    include: {
      links: { where: { status: { in: ["AUTO", "MANUAL"] } } },
    },
  });

  // REST days have no entries — skip
  if (entries.length === 0) return;

  const allLinked = entries.every((e) => e.links.length > 0);
  if (allLinked) {
    await prisma.workoutDay.update({
      where: { id: dayId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }
}

// ─── Core reconciler ─────────────────────────────────────────────────────────

/**
 * Reconcile a single activity against the user's active plan.
 * Called after every Garmin sync and can also be triggered manually.
 *
 * Returns a summary of what was linked/suggested.
 */
export async function reconcileActivity(
  activityId: string,
  userId: string
): Promise<{ linked: number; suggested: number; skipped: number }> {
  const result = { linked: 0, suggested: 0, skipped: 0 };

  // Load activity
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, userId },
    select: { id: true, type: true, distance: true, duration: true, avgPace: true, startTime: true },
  });
  if (!activity) return result;

  // Find active plan with a startDate (required for date anchoring)
  const plan = await prisma.workoutPlan.findFirst({
    where: { userId, isActive: true, startDate: { not: null } },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          days: {
            orderBy: { dayOfWeek: "asc" },
            include: {
              entries: {
                include: { links: true },
              },
            },
          },
        },
      },
    },
  });
  if (!plan || !plan.startDate) return result;

  const activityDate = new Date(activity.startTime);

  // Find which plan day this activity falls on
  let targetDay: (typeof plan.weeks[0]["days"][0]) | null = null;
  let targetWeek: (typeof plan.weeks[0]) | null = null;

  outer:
  for (const week of plan.weeks) {
    for (const day of week.days) {
      const dayDate = planDayDate(plan.startDate, week.weekNumber, day.dayOfWeek);
      if (sameDay(activityDate, dayDate)) {
        targetDay = day;
        targetWeek = week;
        break outer;
      }
    }
  }

  if (!targetDay) {
    result.skipped++;
    return result;
  }

  // Score each entry in the target day
  for (const entry of targetDay.entries) {
    // Any existing link for this (entry, activity) pair that the user has already
    // decided on (AUTO/MANUAL/REJECTED) must not be overwritten — a REJECTED pair
    // must never be resurrected, and confirmed links must never be downgraded.
    const existingLink = entry.links.find((l) => l.activityId === activity.id);
    if (existingLink && existingLink.status !== "SUGGESTED") continue;

    // Entry already matched to some other activity → nothing to suggest
    const entryMatched = entry.links.some(
      (l) => l.status === "AUTO" || l.status === "MANUAL"
    );

    const confidence = scoreMatch(
      {
        id: activity.id,
        type: activity.type,
        distance: activity.distance,
        duration: activity.duration,
        avgPace: activity.avgPace,
      },
      {
        id: entry.id,
        type: entry.type,
        durationMin: entry.durationMin,
        description: entry.description,
        title: entry.title,
      }
    );

    if (confidence >= AUTO_LINK_THRESHOLD && !entryMatched) {
      await prisma.planActivityLink.upsert({
        where: { entryId_activityId: { entryId: entry.id, activityId: activity.id } },
        update: { confidence, status: "AUTO" },
        create: { entryId: entry.id, activityId: activity.id, confidence, status: "AUTO" },
      });
      result.linked++;
      await maybeCompleteDayAfterLink(targetDay.id);
    } else if (confidence >= SUGGEST_THRESHOLD && !entryMatched) {
      await prisma.planActivityLink.upsert({
        where: { entryId_activityId: { entryId: entry.id, activityId: activity.id } },
        update: { confidence, status: "SUGGESTED" },
        create: { entryId: entry.id, activityId: activity.id, confidence, status: "SUGGESTED" },
      });
      result.suggested++;
    } else {
      result.skipped++;
    }
  }

  return result;
}

/**
 * Reconcile ALL unlinked activities for a user against their active plan.
 * Used when a plan is activated or when user manually triggers "Check matches" for a day.
 */
export async function reconcileDay(
  dayId: string,
  userId: string
): Promise<{ linked: number; suggested: number; skipped: number }> {
  const totals = { linked: 0, suggested: 0, skipped: 0 };

  // Find the plan day and compute its calendar date
  const day = await prisma.workoutDay.findFirst({
    where: { id: dayId },
    include: {
      week: {
        include: {
          plan: { select: { id: true, startDate: true, userId: true } },
        },
      },
      entries: { include: { links: true } },
    },
  });

  if (!day || !day.week.plan || day.week.plan.userId !== userId || !day.week.plan.startDate) return totals;

  const { plan } = day.week;
  const calDate = planDayDate(plan.startDate, day.week.weekNumber, day.dayOfWeek);

  // Find all activities from the user on that calendar date
  const startOfDay = new Date(calDate);
  const endOfDay   = new Date(calDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const activities = await prisma.activity.findMany({
    where: {
      userId,
      startTime: { gte: startOfDay, lte: endOfDay },
    },
    select: { id: true, type: true, distance: true, duration: true, avgPace: true, startTime: true },
  });

  for (const activity of activities) {
    for (const entry of day.entries) {
      // Never overwrite links the user has decided on (REJECTED stays rejected,
      // AUTO/MANUAL stay confirmed) — only existing SUGGESTED rows may be re-scored.
      const existingLink = entry.links.find((l) => l.activityId === activity.id);
      if (existingLink && existingLink.status !== "SUGGESTED") continue;

      // Entry already matched to some other activity → nothing to link or suggest
      const entryMatched = entry.links.some(
        (l) => l.status === "AUTO" || l.status === "MANUAL"
      );
      if (entryMatched) { totals.skipped++; continue; }

      const confidence = scoreMatch(
        { id: activity.id, type: activity.type, distance: activity.distance, duration: activity.duration, avgPace: activity.avgPace },
        { id: entry.id, type: entry.type, durationMin: entry.durationMin, description: entry.description, title: entry.title }
      );

      if (confidence >= AUTO_LINK_THRESHOLD) {
        await prisma.planActivityLink.upsert({
          where: { entryId_activityId: { entryId: entry.id, activityId: activity.id } },
          update: { confidence, status: "AUTO" },
          create: { entryId: entry.id, activityId: activity.id, confidence, status: "AUTO" },
        });
        totals.linked++;
      } else if (confidence >= SUGGEST_THRESHOLD) {
        await prisma.planActivityLink.upsert({
          where: { entryId_activityId: { entryId: entry.id, activityId: activity.id } },
          update: { confidence, status: "SUGGESTED" },
          create: { entryId: entry.id, activityId: activity.id, confidence, status: "SUGGESTED" },
        });
        totals.suggested++;
      } else {
        totals.skipped++;
      }
    }
  }

  await maybeCompleteDayAfterLink(dayId);
  return totals;
}
