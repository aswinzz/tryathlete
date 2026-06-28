import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.trackerConnection.findMany({
    where: { userId },
    select: { provider: true, connected: true, lastSyncAt: true },
  });

  const connections = rows.map((c) => ({
    id: c.provider,
    service: c.provider,
    connected: c.connected,
    lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ connections });
}
