import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const record = await prisma.whoopRecovery.findFirst({
    where: { userId },
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
