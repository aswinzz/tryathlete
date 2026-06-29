import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUser";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.trackerConnection.deleteMany({
    where: { userId, provider: "whoop" },
  });

  return NextResponse.json({ success: true });
}
