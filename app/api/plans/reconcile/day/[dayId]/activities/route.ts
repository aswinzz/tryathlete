import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

type Ctx = { params: Promise<{ dayId: string }> };

/** GET — activities from this user that fall on the same calendar date as this plan day */
export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { dayId } = await params;

  const day = await prisma.workoutDay.findFirst({
    where: { id: dayId },
    include: { week: { include: { plan: { select: { startDate: true, userId: true } } } } },
  });

  if (!day || day.week.plan?.userId !== userId || !day.week.plan?.startDate)
    return NextResponse.json([]);

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
