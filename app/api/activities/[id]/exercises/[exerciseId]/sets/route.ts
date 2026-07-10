import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

type Ctx = { params: Promise<{ id: string; exerciseId: string }> };

async function ownedExercise(userId: string, activityId: string, exerciseId: string) {
  const ex = await prisma.exerciseEntry.findFirst({
    where: { id: exerciseId, activityId, activity: { userId } },
    select: { id: true },
  });
  return !!ex;
}

/** PUT — log or update a set on an activity-attached exercise (upsert by setIndex) */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, exerciseId } = await params;
  if (!(await ownedExercise(userId, id, exerciseId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const setIndex = Number(body.setIndex);
  if (!Number.isInteger(setIndex) || setIndex < 1) {
    return NextResponse.json({ error: "setIndex (1-based integer) is required" }, { status: 400 });
  }

  const set = await prisma.exerciseSet.upsert({
    where:  { exerciseId_setIndex: { exerciseId, setIndex } },
    update: {
      reps:      body.reps      === undefined ? undefined : body.reps     === null ? null : Number(body.reps),
      weightKg:  body.weightKg  === undefined ? undefined : body.weightKg === null ? null : Number(body.weightKg),
      rpe:       body.rpe       === undefined ? undefined : body.rpe      === null ? null : Number(body.rpe),
      completed: body.completed === undefined ? undefined : Boolean(body.completed),
      loggedAt:  new Date(),
    },
    create: {
      exerciseId,
      setIndex,
      reps:      body.reps     != null ? Number(body.reps)     : null,
      weightKg:  body.weightKg != null ? Number(body.weightKg) : null,
      rpe:       body.rpe      != null ? Number(body.rpe)      : null,
      completed: body.completed !== undefined ? Boolean(body.completed) : true,
    },
  });
  return NextResponse.json(set);
}

/** DELETE — remove a logged set. Body: { setIndex } */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, exerciseId } = await params;
  if (!(await ownedExercise(userId, id, exerciseId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const setIndex = Number(body.setIndex);
  if (!Number.isInteger(setIndex) || setIndex < 1) {
    return NextResponse.json({ error: "setIndex (1-based integer) is required" }, { status: 400 });
  }

  await prisma.exerciseSet.deleteMany({ where: { exerciseId, setIndex } });
  return NextResponse.json({ ok: true });
}
