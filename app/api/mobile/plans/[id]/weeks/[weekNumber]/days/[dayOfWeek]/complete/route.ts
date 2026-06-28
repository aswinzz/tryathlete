import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; weekNumber: string; dayOfWeek: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await verifyMobileToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: planId, weekNumber, dayOfWeek } = await params;

  const plan = await prisma.workoutPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const week = await prisma.workoutWeek.findFirst({
    where: { planId, weekNumber: parseInt(weekNumber) },
  });
  if (!week) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const day = await prisma.workoutDay.findFirst({
    where: { weekId: week.id, dayOfWeek: parseInt(dayOfWeek) },
  });
  if (!day) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workoutDay.update({
    where: { id: day.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
