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
      skinTemp: true, respRate: true,
      totalSleepMin: true, remMin: true, deepMin: true, lightMin: true, awakeMin: true,
      sleepScore: true, sleepEff: true,
      strain: true, kilojoule: true, avgHR: true, maxHR: true,
    },
  });

  if (record) return NextResponse.json({ record });

  // No WHOOP data — fall back to today's Garmin wellness (Training Readiness /
  // Body Battery), mapped into the same record shape. Garmin days are calendar
  // dates, so a 48h window covers "today" in any timezone.
  const gCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const g = await prisma.garminWellness.findFirst({
    where: { userId, date: { gte: gCutoff } },
    orderBy: { date: "desc" },
  });

  if (!g) return NextResponse.json({ record: null });

  return NextResponse.json({
    record: {
      id: g.id,
      date: g.date,
      recoveryScore: g.trainingReadiness ?? g.bodyBattery ?? null,
      hrv: g.hrv,
      restingHR: g.restingHR,
      spo2: null, skinTemp: null, respRate: null,
      totalSleepMin: g.totalSleepMin,
      remMin: g.remMin, deepMin: g.deepMin, lightMin: g.lightMin, awakeMin: g.awakeMin,
      sleepScore: g.sleepScore,
      sleepEff: null,
      strain: null, kilojoule: null, avgHR: null, maxHR: null,
      vo2Max: g.vo2Max, vo2MaxCycling: g.vo2MaxCycling,
      stressAvg: g.stressAvg, stressMax: g.stressMax,
      source: "garmin",
    },
  });
}
