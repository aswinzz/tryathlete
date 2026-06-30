import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";
import { captureServerEvent } from "@/lib/posthog";
import { withApiHandler } from "@/lib/apiError";

export const GET = withApiHandler(async (req: NextRequest) => {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.workoutPlan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      weeks: {
        include: {
          days: {
            include: { entries: { orderBy: { orderIndex: "asc" } } },
            orderBy: { dayOfWeek: "asc" },
          },
        },
        orderBy: { weekNumber: "asc" },
      },
    },
  });

  return NextResponse.json(plans);
}, "plans.list");

export const POST = withApiHandler(async (req: NextRequest) => {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, startDate, endDate } = body;
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const plan = await prisma.workoutPlan.create({
    data: {
      userId,
      title: title.trim(),
      description: description?.trim() || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isDraft: true,
      isActive: false,
    },
  });

  captureServerEvent(userId, "plan_created", { planId: plan.id, title: plan.title });

  return NextResponse.json(plan, { status: 201 });
}, "plans.create");
