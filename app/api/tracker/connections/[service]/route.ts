import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ service: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { service } = await params;

  await prisma.trackerConnection.updateMany({
    where: { userId, provider: service },
    data: { connected: false, accessToken: null, refreshToken: null },
  });

  return NextResponse.json({ ok: true });
}
