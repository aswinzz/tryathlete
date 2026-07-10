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

/**
 * PUT — log or update a set.
 * Body: { setIndex: number, reps?, weightKg?, rpe?, completed? }
 * Upserts on (exerciseId, setIndex) so re-logging a set just updates it.
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId, exerciseId } = await params;
  if (!(await ownedExercise(userId, entryId, exerciseId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const setIndex = Number(body.setIndex);
  if (!Number.isInteger(setIndex) || setIndex < 1) {
    return NextResponse.json({ error: "setIndex (1-based integer) is required" }, { status: 400 });
  }

  const fields = {
    reps:      body.reps      === undefined ? undefined : body.reps      === null ? null : Number(body.reps),
    weightKg:  body.weightKg  === undefined ? undefined : body.weightKg  === null ? null : Number(body.weightKg),
    rpe:       body.rpe       === undefined ? undefined : body.rpe       === null ? null : Number(body.rpe),
    completed: body.completed === undefined ? undefined : Boolean(body.completed),
    loggedAt:  new Date(),
  };

  const set = await prisma.exerciseSet.upsert({
    where:  { exerciseId_setIndex: { exerciseId, setIndex } },
    update: fields,
    create: {
      exerciseId,
      setIndex,
      reps:      fields.reps      ?? null,
      weightKg:  fields.weightKg  ?? null,
      rpe:       fields.rpe       ?? null,
      completed: fields.completed ?? true,
    },
  });
  return NextResponse.json(set);
}

/** DELETE — remove a logged set. Body: { setIndex: number } */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId, exerciseId } = await params;
  if (!(await ownedExercise(userId, entryId, exerciseId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const setIndex = Number(body.setIndex);
  if (!Number.isInteger(setIndex) || setIndex < 1) {
    return NextResponse.json({ error: "setIndex (1-based integer) is required" }, { status: 400 });
  }

  await prisma.exerciseSet.deleteMany({ where: { exerciseId, setIndex } });
  return NextResponse.json({ ok: true });
}
