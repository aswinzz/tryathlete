import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";
import { captureServerEvent } from "@/lib/posthog";

type Ctx = { params: Promise<{ id: string }> };

async function ownedPlan(userId: string, id: string) {
  return prisma.workoutPlan.findFirst({ where: { id, userId } });
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const plan = await prisma.workoutPlan.findFirst({
    where: { id, userId },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          days: {
            orderBy: { dayOfWeek: "asc" },
            include: { entries: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  if (!(await ownedPlan(userId, id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.isDraft !== undefined) data.isDraft = Boolean(body.isDraft);

  const updated = await prisma.workoutPlan.update({ where: { id }, data });

  if (data.isActive === true) {
    captureServerEvent(userId, "plan_activated", { planId: id, title: updated.title });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  if (!(await ownedPlan(userId, id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workoutPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
