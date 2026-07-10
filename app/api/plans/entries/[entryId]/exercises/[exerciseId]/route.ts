import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

type Ctx = { params: Promise<{ entryId: string; exerciseId: string }> };

async function ownedExercise(userId: string, entryId: string, exerciseId: string) {
  const ex = await prisma.exerciseEntry.findFirst({
    where: { id: exerciseId, entryId },
    select: {
      id: true,
      entry: { select: { day: { select: { week: { select: { plan: { select: { userId: true } } } } } } } },
    },
  });
  return ex?.entry.day.week.plan.userId === userId;
}

/** PATCH — update an exercise's name/targets/notes */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId, exerciseId } = await params;
  if (!(await ownedExercise(userId, entryId, exerciseId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if (body.orderIndex !== undefined)     data.orderIndex = Number(body.orderIndex);
  if (body.targetSets !== undefined)     data.targetSets = body.targetSets === null ? null : Number(body.targetSets);
  if (body.targetReps !== undefined)     data.targetReps = body.targetReps === null ? null : String(body.targetReps);
  if (body.targetWeightKg !== undefined) data.targetWeightKg = body.targetWeightKg === null ? null : Number(body.targetWeightKg);
  if (body.targetRpe !== undefined)      data.targetRpe = body.targetRpe === null ? null : Number(body.targetRpe);
  if (body.restSec !== undefined)        data.restSec = body.restSec === null ? null : Number(body.restSec);
  if (body.notes !== undefined)          data.notes = body.notes === null ? null : String(body.notes);

  const updated = await prisma.exerciseEntry.update({
    where: { id: exerciseId },
    data,
    include: { sets: { orderBy: { setIndex: "asc" } } },
  });
  return NextResponse.json(updated);
}

/** DELETE — remove an exercise (and its logged sets) */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId, exerciseId } = await params;
  if (!(await ownedExercise(userId, entryId, exerciseId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.exerciseEntry.delete({ where: { id: exerciseId } });
  return NextResponse.json({ ok: true });
}
