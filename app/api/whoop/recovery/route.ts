import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30");
  const since = new Date();
  since.setDate(since.getDate() - days);

  const records = await prisma.whoopRecovery.findMany({
    where: { userId, date: { gte: since } },
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

  if (records.length > 0) return NextResponse.json({ records });

  // No WHOOP data — fall back to Garmin wellness (Training Readiness / Body
  // Battery / HRV / sleep) mapped into the exact same record shape.
  const garmin = await prisma.garminWellness.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "desc" },
  });

  const mapped = garmin.map((g: {
    id: string; date: Date;
    trainingReadiness: number | null; bodyBattery: number | null;
    hrv: number | null; restingHR: number | null; sleepScore: number | null;
    totalSleepMin: number | null; remMin: number | null; deepMin: number | null;
    lightMin: number | null; awakeMin: number | null;
    vo2Max: number | null; vo2MaxCycling: number | null;
    stressAvg: number | null; stressMax: number | null;
  }) => ({
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
  }));

  return NextResponse.json({ records: mapped });
}
