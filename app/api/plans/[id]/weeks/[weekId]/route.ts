import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WeekType } from "@/lib/planEnums";

type Ctx = { params: Promise<{ id: string; weekId: string }> };

async function ownedWeek(userId: string, planId: string, weekId: string) {
  const week = await prisma.workoutWeek.findFirst({
    where: { id: weekId, planId },
    include: { plan: { select: { userId: true } } },
  });
  return week?.plan.userId === userId ? week : null;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, weekId } = await params;

  if (!(await ownedWeek(session.user.id, id, weekId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.type !== undefined) data.type = body.type as WeekType;
  if (body.title !== undefined) data.title = body.title?.trim() || null;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

  const updated = await prisma.workoutWeek.update({ where: { id: weekId }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, weekId } = await params;

  if (!(await ownedWeek(session.user.id, id, weekId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workoutWeek.delete({ where: { id: weekId } });
  return NextResponse.json({ ok: true });
}
