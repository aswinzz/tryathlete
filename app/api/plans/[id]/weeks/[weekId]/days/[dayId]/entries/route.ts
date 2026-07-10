import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";
import { EntryType } from "@/lib/planEnums";

type Ctx = { params: Promise<{ id: string; weekId: string; dayId: string }> };

async function ownedDay(userId: string, planId: string, weekId: string, dayId: string) {
  const day = await prisma.workoutDay.findFirst({
    where: { id: dayId, weekId },
    include: { week: { include: { plan: { select: { userId: true, id: true } } } } },
  });
  return day?.week.plan.userId === userId && day.week.plan.id === planId ? day : null;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, weekId, dayId } = await params;

  if (!(await ownedDay(userId, id, weekId, dayId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entries = await prisma.workoutEntry.findMany({
    where: { dayId },
    orderBy: { orderIndex: "asc" },
    include: {
      links: {
        where: { status: { not: "REJECTED" } },
        include: {
          activity: {
            select: {
              id: true, name: true, type: true, startTime: true,
              distance: true, duration: true, avgPace: true,
              avgHeartRate: true, calories: true,
            },
          },
        },
      },
      exercises: {
        orderBy: { orderIndex: "asc" },
        include: { sets: { orderBy: { setIndex: "asc" } } },
      },
    },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, weekId, dayId } = await params;

  if (!(await ownedDay(userId, id, weekId, dayId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { type, title, description, durationMin, orderIndex } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

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
