import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";
import { EntryType } from "@/lib/planEnums";

type Ctx = { params: Promise<{ id: string; weekId: string; dayId: string; entryId: string }> };

async function ownedEntry(userId: string, planId: string, dayId: string, entryId: string) {
  const entry = await prisma.workoutEntry.findFirst({
    where: { id: entryId, dayId },
    include: { day: { include: { week: { include: { plan: { select: { userId: true, id: true } } } } } } },
  });
  return entry?.day.week.plan.userId === userId && entry.day.week.plan.id === planId ? entry : null;
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, dayId, entryId } = await params;

  if (!(await ownedEntry(userId, id, dayId, entryId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.type !== undefined) data.type = body.type as EntryType;
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.durationMin !== undefined) data.durationMin = body.durationMin ? Number(body.durationMin) : null;
  if (body.orderIndex !== undefined) data.orderIndex = Number(body.orderIndex);

  const updated = await prisma.workoutEntry.update({ where: { id: entryId }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, dayId, entryId } = await params;

  if (!(await ownedEntry(userId, id, dayId, entryId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workoutEntry.delete({ where: { id: entryId } });
  return NextResponse.json({ ok: true });
}
