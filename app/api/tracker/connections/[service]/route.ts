import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ service: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { service } = await params;

  // Hard-delete the row so the endpoint works before the `connected` migration is applied.
  // After running `npx prisma migrate dev && npx prisma generate`, change this back to:
  //   updateMany({ where: { userId, provider: service }, data: { connected: false, accessToken: null, refreshToken: null } })
  await prisma.trackerConnection.deleteMany({
    where: { userId, provider: service },
  });

  return NextResponse.json({ ok: true });
}
