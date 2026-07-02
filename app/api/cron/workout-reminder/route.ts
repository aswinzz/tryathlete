import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the local hour (0-23) and ISO date string ("YYYY-MM-DD") for the
 * given IANA timezone. Uses the Swedish locale which produces
 * "YYYY-MM-DD HH:MM:SS" — convenient for splitting.
 */
function getLocalInfo(timezone: string): { hour: number; dateStr: string } {
  const now = new Date();
  const localStr = now.toLocaleString("sv", { timeZone: timezone });
  // "2024-01-15 07:30:00"
  const [datePart, timePart] = localStr.split(" ");
  const hour = parseInt(timePart.split(":")[0], 10);
  return { hour, dateStr: datePart };
}

/**
 * Returns today's day of week (1=Mon…7=Sun) in the user's local timezone,
 * plus the days-elapsed since plan start (for week number calculation).
 */
function getLocalDayOfWeek(
  timezone: string,
  planStartDate: Date
): { dayOfWeek: number; daysElapsed: number } | null {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year  = parseInt(parts.find(p => p.type === "year")!.value,  10);
  const month = parseInt(parts.find(p => p.type === "month")!.value, 10) - 1;
  const day   = parseInt(parts.find(p => p.type === "day")!.value,   10);
  const weekdayName = parts.find(p => p.type === "weekday")!.value;

  const DOW: Record<string, number> = {
    Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4,
    Friday: 5, Saturday: 6, Sunday: 7,
  };
  const dayOfWeek = DOW[weekdayName];
  if (!dayOfWeek) return null;

  // Compare date-only values (both in local/plan-start calendar space)
  const localToday = Date.UTC(year, month, day);
  const planStart  = Date.UTC(
    planStartDate.getUTCFullYear(),
    planStartDate.getUTCMonth(),
    planStartDate.getUTCDate(),
  );
  const daysElapsed = Math.floor((localToday - planStart) / 86_400_000);
  return { dayOfWeek, daysElapsed };
}

/**
 * Fetches today's workout entry titles from the user's active plan, using
 * their local timezone to determine the correct week/day.
 * Returns an empty array if no entries exist or the plan hasn't started.
 */
async function getTodayEntries(
  userId: string,
  timezone: string,
): Promise<{ title: string }[]> {
  const plan = await prisma.workoutPlan.findFirst({
    where:  { userId, isActive: true },
    select: { id: true, startDate: true },
  });
  if (!plan?.startDate) return [];

  const info = getLocalDayOfWeek(timezone, plan.startDate);
  if (!info || info.daysElapsed < 0) return [];

  const weekNumber = Math.floor(info.daysElapsed / 7) + 1;

  const week = await prisma.workoutWeek.findFirst({
    where:  { planId: plan.id, weekNumber },
    select: { id: true },
  });
  if (!week) return [];

  const planDay = await prisma.workoutDay.findFirst({
    where:   { weekId: week.id, dayOfWeek: info.dayOfWeek },
    include: { entries: { select: { title: true }, orderBy: { orderIndex: "asc" } } },
  });
  return planDay?.entries ?? [];
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * GET /api/cron/workout-reminder
 *
 * Called every hour by Vercel Cron. For each user who has a push token with
 * a timezone, checks whether it's currently 7 AM in their local time. If so,
 * looks up today's workout entries from their active plan and fires a push
 * notification. Deduplication is done via `lastReminderDate` (ISO date string)
 * so only one notification per user per calendar day is sent even if the cron
 * runs multiple times in the same hour.
 *
 * Protected by ADMIN_SECRET (Vercel Cron sends it via Authorization header).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  const auth   = req.headers.get("Authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // One row per user (we only need userId, timezone, lastReminderDate)
  const rows = await prisma.devicePushToken.findMany({
    where:    { timezone: { not: null } },
    select:   { userId: true, timezone: true, lastReminderDate: true },
    distinct: ["userId"],
  });

  let sent    = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.timezone) continue;

    let hour: number;
    let dateStr: string;
    try {
      ({ hour, dateStr } = getLocalInfo(row.timezone));
    } catch {
      skipped++;
      continue; // invalid IANA timezone stored
    }

    // Only fire between 07:00 and 07:59 local time
    if (hour !== 7) { skipped++; continue; }

    // Already sent today?
    if (row.lastReminderDate === dateStr) { skipped++; continue; }

    const entries = await getTodayEntries(row.userId, row.timezone);
    if (!entries.length) { skipped++; continue; }

    // Build notification copy
    const count    = entries.length;
    const countStr = count === 1 ? "1 workout" : `${count} workouts`;
    const titles   = entries.map(e => e.title).join(", ");

    sendPushToUser(row.userId, {
      title: "Today's workout 💪",
      body:  `${countStr}: ${titles}`,
      data:  { type: "plan" },
    }).catch(() => {});

    // Mark all this user's tokens as reminded for today (dedup on next run)
    await prisma.devicePushToken.updateMany({
      where: { userId: row.userId },
      data:  { lastReminderDate: dateStr },
    });

    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
