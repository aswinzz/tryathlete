import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DayType, DayStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string; weekId: string }> };

async function ownedWeek(userId: string, planId: string, weekId: string) {
  const week = await prisma.workoutWeek.findFirst({
    where: { id: weekId, planId },
    include: { plan: { select: { userId: true } } },
  });
  return week?.plan.userId === userId ? week : null;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, weekId } = await params;

  if (!(await ownedWeek(session.user.id, id, weekId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { dayOfWeek, type, coachNotes } = body;

  if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7)
    return NextResponse.json({ error: "dayOfWeek must be 1–7" }, { status: 400 });

  const day = await prisma.workoutDay.create({
    data: {
      weekId,
      dayOfWeek: Number(dayOfWeek),
      type: (type as DayType) || DayType.REGULAR,
      status: DayStatus.PLANNED,
      coachNotes: coachNotes?.trim() || null,
    },
    include: { entries: true },
  });

  return NextResponse.json(day, { status: 201 });
}
