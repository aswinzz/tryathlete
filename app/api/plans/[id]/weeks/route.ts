import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUser";
import { prisma } from "@/lib/prisma";
import { WeekType } from "@/lib/planEnums";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const plan = await prisma.workoutPlan.findFirst({ where: { id, userId } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { weekNumber, type, title, notes } = body;

  if (!weekNumber) return NextResponse.json({ error: "weekNumber is required" }, { status: 400 });

  const week = await prisma.workoutWeek.create({
    data: {
      planId: id,
      weekNumber: Number(weekNumber),
      type: (type as WeekType) || WeekType.REGULAR,
      title: title?.trim() || null,
      notes: notes?.trim() || null,
    },
    include: { days: { include: { entries: true } } },
  });

  return NextResponse.json(week, { status: 201 });
}
