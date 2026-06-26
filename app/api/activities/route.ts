import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cursor = req.nextUrl.searchParams.get("cursor"); // activity id

  const activities = await prisma.activity.findMany({
    where: { userId: session.user.id },
    orderBy: { startTime: "desc" },
    take: PAGE_SIZE + 1, // fetch one extra to know if there's a next page
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, name: true, type: true, startTime: true,
      duration: true, distance: true, avgHeartRate: true,
      avgPace: true, elevGain: true, calories: true,
    },
  });

  const hasMore = activities.length > PAGE_SIZE;
  const page    = hasMore ? activities.slice(0, PAGE_SIZE) : activities;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({ activities: page, nextCursor });
}
