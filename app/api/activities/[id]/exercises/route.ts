import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

type Ctx = { params: Promise<{ id: string }> };

async function ownsActivity(userId: string, activityId: string): Promise<boolean> {
  const a = await prisma.activity.findFirst({
    where: { id: activityId, userId },
    select: { id: true },
  });
  return !!a;
}

const SETS_INCLUDE = { sets: { orderBy: { setIndex: "asc" as const } } };

/** GET — list exercises (with logged sets) attached to an activity */
export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownsActivity(userId, id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const exercises = await prisma.exerciseEntry.findMany({
    where: { activityId: id },
    orderBy: { orderIndex: "asc" },
    include: SETS_INCLUDE,
  });
  return NextResponse.json(exercises);
}

/** POST — add one exercise to an activity (ad-hoc logging, no plan needed) */
export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownsActivity(userId, id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (!body.name?.trim())
    return NextResponse.json({ error: "name is required" }, { status: 400 });

  const orderIndex = body.orderIndex !== undefined
    ? Number(body.orderIndex)
    : await prisma.exerciseEntry.count({ where: { activityId: id } });

  const exercise = await prisma.exerciseEntry.create({
    data: {
      activityId: id,
      name: String(body.name).trim(),
      orderIndex,
      targetSets:     body.targetSets     != null ? Number(body.targetSets)     : null,
      targetReps:     body.targetReps     != null ? String(body.targetReps)     : null,
      targetWeightKg: body.targetWeightKg != null ? Number(body.targetWeightKg) : null,
      targetRpe:      body.targetRpe      != null ? Number(body.targetRpe)      : null,
      restSec:        body.restSec        != null ? Number(body.restSec)        : null,
      notes:          body.notes          != null ? String(body.notes)          : null,
    },
    include: SETS_INCLUDE,
  });
  return NextResponse.json(exercise, { status: 201 });
}
