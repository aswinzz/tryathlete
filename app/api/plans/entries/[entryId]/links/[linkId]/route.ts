import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId, linkId } = await params;

  const link = await ownedLink(session.user.id, entryId, linkId);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body.reject) {
    // Mark as REJECTED so reconciler won't re-suggest this pair
    await prisma.planActivityLink.update({ where: { id: linkId }, data: { status: "REJECTED" } });
  } else {
    await prisma.planActivityLink.delete({ where: { id: linkId } });
  }

  return NextResponse.json({ ok: true });
}

/** PATCH — confirm a SUGGESTED link → MANUAL */
export async function PATCH(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId, linkId } = await params;

  const link = await ownedLink(session.user.id, entryId, linkId);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.planActivityLink.update({
    where: { id: linkId },
    data: { status: "MANUAL" },
    include: { activity: { select: { id: true, name: true, type: true, distance: true, duration: true } } },
  });
  return NextResponse.json(updated);
}
