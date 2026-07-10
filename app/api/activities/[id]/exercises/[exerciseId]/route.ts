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

/** DELETE — remove an exercise (and its logged sets) from an activity */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, exerciseId } = await params;
  if (!(await ownedExercise(userId, id, exerciseId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.exerciseEntry.delete({ where: { id: exerciseId } });
  return NextResponse.json({ ok: true });
}
