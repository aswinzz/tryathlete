import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const activity = await prisma.activity.findFirst({
    where: { id, userId },
    include: { laps: { orderBy: { lapIndex: "asc" } } },
  });

  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(activity);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : null;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const updated = await prisma.activity.updateMany({
    where: { id, userId },
    data: { name },
  });

  if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, name });
}
