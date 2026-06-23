import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activities = await prisma.activity.findMany({
    where: { userId: session.user.id },
    orderBy: { startTime: "desc" },
    take: 50,
    include: { laps: { orderBy: { lapIndex: "asc" } } },
  });

  return NextResponse.json(activities);
}
