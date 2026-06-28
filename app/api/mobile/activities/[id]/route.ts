import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await verifyMobileToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const activity = await prisma.activity.findFirst({
    where: { id, userId },
    include: { laps: { orderBy: { lapIndex: "asc" } } },
  });

  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(activity);
}
