import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ dayId: string }> };

/** GET — list activities from the user that fall on the same calendar date as this plan day */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { dayId } = await params;
  const userId = session.user.id;

  const day = await prisma.workoutDay.findFirst({
    where: { id: dayId },
    include: {
      week: {
        include: { plan: { select: { startDate: true, userId: true } } },
      },
    },
  });

  // Verify ownership
  if (!day || day.week.plan?.userId !== userId || !day.week.plan?.startDate) return NextResponse.json([]);

  const startDate = new Date(day.week.plan.startDate);
  startDate.setUTCHours(0, 0, 0, 0);
  const dayOffset = (day.week.weekNumber - 1) * 7 + (day.dayOfWeek - 1);
  const calDate = new Date(startDate);
  calDate.setUTCDate(calDate.getUTCDate() + dayOffset);

  const startOfDay = new Date(calDate);
  const endOfDay = new Date(calDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const activities = await prisma.activity.findMany({
    where: { userId, startTime: { gte: startOfDay, lte: endOfDay } },
    select: {
      id: true, name: true, type: true, startTime: true,
      distance: true, duration: true, avgPace: true,
      avgHeartRate: true, calories: true,
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(activities);
}
