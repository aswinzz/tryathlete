import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await verifyMobileToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.trackerConnection.findMany({
    where: { userId },
    select: { provider: true, connected: true, lastSyncAt: true },
  });

  const connections = rows.map((c) => ({
    id: c.provider,
    service: c.provider,
    isConnected: c.connected,
    lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ connections });
}
