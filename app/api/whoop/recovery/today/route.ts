import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // The WHOOP date field is stored as midnight UTC of the date string WHOOP sends,
  // which reflects the user's local timezone — not the server's UTC clock. A user
  // in UTC+14 will have today's record stored as "tomorrow" in UTC, and a user in
  // UTC-12 will have it stored as "yesterday" in UTC. We use a ±2-day window
  // (48 hours back, 48 hours forward) to cover every possible timezone offset,
  // then let the mobile client's Calendar.isDateInToday() make the final call using
  // the user's actual device timezone.
  const now = new Date();
  const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const windowEnd   = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const record = await prisma.whoopRecovery.findFirst({
    where: {
      userId,
      date: { gte: windowStart, lt: windowEnd },
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
