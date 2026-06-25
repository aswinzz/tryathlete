import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DayType, DayStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string; weekId: string; dayId: string }> };

async function ownedDay(userId: string, planId: string, weekId: string, dayId: string) {
  const day = await prisma.workoutDay.findFirst({
    where: { id: dayId, weekId },
    include: { week: { include: { plan: { select: { userId: true, id: true } } } } },
  });
  return day?.week.plan.userId === userId && day.week.plan.id === planId ? day : null;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, weekId, dayId } = await params;

  if (!(await ownedDay(session.user.id, id, weekId, dayId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.type !== undefined) data.type = body.type as DayType;
  if (body.status !== undefined) {
    data.status = body.status as DayStatus;
    if (body.status === DayStatus.COMPLETED) data.completedAt = new Date();
  }
  if (body.coachNotes !== undefined) data.coachNotes = body.coachNotes?.trim() || null;

  const updated = await prisma.workoutDay.update({
    where: { id: dayId },
    data,
    include: { entries: { orderBy: { orderIndex: "asc" } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, weekId, dayId } = await params;

  if (!(await ownedDay(session.user.id, id, weekId, dayId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workoutDay.delete({ where: { id: dayId } });
  return NextResponse.json({ ok: true });
}
