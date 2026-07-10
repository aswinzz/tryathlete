import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

type Ctx = { params: Promise<{ entryId: string }> };

async function ownsEntry(userId: string, entryId: string): Promise<boolean> {
  const entry = await prisma.workoutEntry.findFirst({
    where: { id: entryId },
    select: { day: { select: { week: { select: { plan: { select: { userId: true } } } } } } },
  });
  return entry?.day.week.plan.userId === userId;
}

const SETS_INCLUDE = { sets: { orderBy: { setIndex: "asc" as const } } };

function sanitizeTargets(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (body.name !== undefined)           out.name = String(body.name).trim();
  if (body.orderIndex !== undefined)     out.orderIndex = Number(body.orderIndex);
  if (body.targetSets !== undefined)     out.targetSets = body.targetSets === null ? null : Number(body.targetSets);
  if (body.targetReps !== undefined)     out.targetReps = body.targetReps === null ? null : String(body.targetReps);
  if (body.targetWeightKg !== undefined) out.targetWeightKg = body.targetWeightKg === null ? null : Number(body.targetWeightKg);
  if (body.targetRpe !== undefined)      out.targetRpe = body.targetRpe === null ? null : Number(body.targetRpe);
  if (body.restSec !== undefined)        out.restSec = body.restSec === null ? null : Number(body.restSec);
  if (body.notes !== undefined)          out.notes = body.notes === null ? null : String(body.notes);
  return out;
}

/** GET — list exercises (with logged sets) for an entry */
export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId } = await params;
  if (!(await ownsEntry(userId, entryId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const exercises = await prisma.exerciseEntry.findMany({
    where: { entryId },
    orderBy: { orderIndex: "asc" },
    include: SETS_INCLUDE,
  });
  return NextResponse.json(exercises);
}

/** POST — add one exercise to an entry */
export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId } = await params;
  if (!(await ownsEntry(userId, entryId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (!body.name?.trim())
    return NextResponse.json({ error: "name is required" }, { status: 400 });

  const data = sanitizeTargets(body);
  if (data.orderIndex === undefined) {
    data.orderIndex = await prisma.exerciseEntry.count({ where: { entryId } });
  }

  const exercise = await prisma.exerciseEntry.create({
    data: { entryId, ...data, name: data.name as string },
    include: SETS_INCLUDE,
  });
  return NextResponse.json(exercise, { status: 201 });
}

/**
 * PUT — bulk-set the planned exercises for an entry (used by the app's editor
 * and the MCP `set_entry_exercises` tool).
 *
 * Semantics (safe for logged data):
 *  - matches existing exercises by name (case-insensitive) → updates targets
 *  - creates exercises that don't exist yet
 *  - removes absent exercises ONLY if they have no logged sets
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId } = await params;
  if (!(await ownsEntry(userId, entryId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const list = body.exercises;
  if (!Array.isArray(list))
    return NextResponse.json({ error: "exercises array is required" }, { status: 400 });
  for (const e of list) {
    if (!e?.name?.trim())
      return NextResponse.json({ error: "every exercise needs a name" }, { status: 400 });
  }

  const existing = await prisma.exerciseEntry.findMany({
    where: { entryId },
    include: { _count: { select: { sets: true } } },
  });
  const byName = new Map<string, { id: string; name: string }>(
    existing.map((e: { id: string; name: string }) =>
      [e.name.trim().toLowerCase(), e] as [string, { id: string; name: string }]
    )
  );

  const keptIds = new Set<string>();
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const data = sanitizeTargets(item);
    data.orderIndex = i;
    const match = byName.get(String(item.name).trim().toLowerCase());
    if (match) {
      keptIds.add(match.id);
      await prisma.exerciseEntry.update({ where: { id: match.id }, data });
    } else {
      const created = await prisma.exerciseEntry.create({
        data: { entryId, ...data, name: data.name as string },
      });
      keptIds.add(created.id);
    }
  }

  // Remove absent exercises that have no logged sets (keep any with logs)
  const removable = existing
    .filter((e: { id: string; _count: { sets: number } }) => !keptIds.has(e.id) && e._count.sets === 0)
    .map((e: { id: string }) => e.id);
  if (removable.length > 0) {
    await prisma.exerciseEntry.deleteMany({ where: { id: { in: removable } } });
  }

  const exercises = await prisma.exerciseEntry.findMany({
    where: { entryId },
    orderBy: { orderIndex: "asc" },
    include: SETS_INCLUDE,
  });
  return NextResponse.json(exercises);
}
