import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.workoutPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      weeks: {
        include: {
          days: {
            include: { entries: { orderBy: { orderIndex: "asc" } } },
          },
        },
        orderBy: { weekNumber: "asc" },
      },
    },
  });

  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, startDate, endDate } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const plan = await prisma.workoutPlan.create({
    data: {
      userId: session.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isDraft: true,
      isActive: false,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
