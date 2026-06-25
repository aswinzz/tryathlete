import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EntryType } from "@/lib/planEnums";

type Ctx = { params: Promise<{ id: string; weekId: string; dayId: string }> };

async function ownedDay(userId: string, planId: string, weekId: string, dayId: string) {
  const day = await prisma.workoutDay.findFirst({
    where: { id: dayId, weekId },
    include: { week: { include: { plan: { select: { userId: true, id: true } } } } },
  });
  return day?.week.plan.userId === userId && day.week.plan.id === planId ? day : null;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, weekId, dayId } = await params;

  if (!(await ownedDay(session.user.id, id, weekId, dayId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entries = await prisma.workoutEntry.findMany({
    where: { dayId },
    orderBy: { orderIndex: "asc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, weekId, dayId } = await params;

  if (!(await ownedDay(session.user.id, id, weekId, dayId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { type, title, description, durationMin, orderIndex } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  // Auto-assign orderIndex if not provided
  let order = orderIndex;
  if (order === undefined) {
    const count = await prisma.workoutEntry.count({ where: { dayId } });
    order = count;
  }

  const entry = await prisma.workoutEntry.create({
    data: {
      dayId,
      type: (type as EntryType) || EntryType.OTHER,
      title: title.trim(),
      description: description?.trim() || null,
      durationMin: durationMin ? Number(durationMin) : null,
      orderIndex: Number(order),
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
