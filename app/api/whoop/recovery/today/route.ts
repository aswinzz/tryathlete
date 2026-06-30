import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Build a UTC [startOfToday, startOfTomorrow) window so we only return
  // a record whose date field falls on today — never yesterday's stale data.
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

  const record = await prisma.whoopRecovery.findFirst({
    where: {
      userId,
      date: { gte: startOfToday, lt: startOfTomorrow },
    },
    orderBy: { date: "desc" },
    select: {
      id: true, date: true,
      recoveryScore: true, hrv: true, restingHR: true, spo2: true,
      totalSleepMin: true, remMin: true, deepMin: true, lightMin: true, awakeMin: true,
      sleepScore: true, sleepEff: true,
      strain: true, kilojoule: true, avgHR: true, maxHR: true,
    },
  });

  return NextResponse.json({ record: record ?? null });
}
