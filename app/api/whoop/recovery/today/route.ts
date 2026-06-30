import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // WHOOP's `date` field is the timestamp when the sleep/recovery cycle *began*,
  // not a calendar date for the day the user woke up. A user who slept at 23:00
  // local time will have a recovery record whose `date` falls on the previous
  // calendar day. Checking "is this date == today?" therefore always fails for
  // nighttime sleepers. Instead we check recency: if the most recent record is
  // within the last 36 hours it is today's recovery data (a full sleep cycle is
  // at most ~12h, so 36h gives comfortable headroom without surfacing old data).
  const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000);

  const record = await prisma.whoopRecovery.findFirst({
    where: {
      userId,
      date: { gte: cutoff },
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
