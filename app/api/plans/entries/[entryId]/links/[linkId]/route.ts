import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

type Ctx = { params: Promise<{ entryId: string; linkId: string }> };

async function ownedLink(userId: string, entryId: string, linkId: string) {
  const link = await prisma.planActivityLink.findFirst({
    where: { id: linkId, entryId },
    include: { entry: { include: { day: { include: { week: { include: { plan: { select: { userId: true } } } } } } } } },
  });
  return link?.entry.day.week.plan.userId === userId ? link : null;
}

/** DELETE — unlink (or reject a suggestion) */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId, linkId } = await params;

  const link = await ownedLink(userId, entryId, linkId);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body.reject) {
    await prisma.planActivityLink.update({ where: { id: linkId }, data: { status: "REJECTED" } });
  } else {
    await prisma.planActivityLink.delete({ where: { id: linkId } });
  }

  return NextResponse.json({ ok: true });
}

/** PATCH — confirm a SUGGESTED link → MANUAL */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId, linkId } = await params;

  const link = await ownedLink(userId, entryId, linkId);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.planActivityLink.update({
    where: { id: linkId },
    data: { status: "MANUAL" },
    include: { activity: { select: { id: true, name: true, type: true, startTime: true, distance: true, duration: true, avgPace: true, avgHeartRate: true, calories: true } } },
  });
  return NextResponse.json(updated);
}
