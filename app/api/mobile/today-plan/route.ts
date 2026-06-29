import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

const ACTIVITY_SELECT = {
  id: true, name: true, type: true, startTime: true,
  distance: true, duration: true, avgPace: true,
  avgHeartRate: true, calories: true,
} as const;

export async function GET(req: NextRequest) {
  const userId = await verifyMobileToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find the user's active plan
  const plan = await prisma.workoutPlan.findFirst({
    where: { userId, isActive: true },
    select: { id: true, title: true, startDate: true },
  });
  if (!plan?.startDate) return NextResponse.json({ day: null });

  // Compute today's week number and day of week (1=Mon…7=Sun) in local wall time
  const now = new Date();
  const startDate = plan.startDate;

  // Strip time — compare date-only in UTC to avoid timezone drift on startDate (stored as UTC midnight)
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const startUTC = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );

  const daysElapsed = Math.floor((todayUTC - startUTC) / 86_400_000);
  if (daysElapsed < 0) return NextResponse.json({ day: null }); // plan hasn't started yet

  const weekNumber = Math.floor(daysElapsed / 7) + 1;

  // JS getDay: 0=Sun → our model: 1=Mon…7=Sun
  const jsDow = now.getDay();
  const dayOfWeek = jsDow === 0 ? 7 : jsDow;

  const week = await prisma.workoutWeek.findFirst({
    where: { planId: plan.id, weekNumber },
    select: { id: true, weekNumber: true },
  });
  if (!week) return NextResponse.json({ day: null });

  const day = await prisma.workoutDay.findFirst({
    where: { weekId: week.id, dayOfWeek },
    include: {
      entries: {
        orderBy: { orderIndex: "asc" },
        include: {
          links: {
            where: { status: { not: "REJECTED" } },
            include: { activity: { select: ACTIVITY_SELECT } },
          },
        },
      },
    },
  });
  if (!day) return NextResponse.json({ day: null });

  return NextResponse.json({
    day,
    planId: plan.id,
    weekId: week.id,
    weekNumber: week.weekNumber,
  });
}
