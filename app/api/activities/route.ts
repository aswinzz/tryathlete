import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit  = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20"), PAGE_SIZE);

  const [activities, totalCount] = await Promise.all([
    prisma.activity.findMany({
      where: { userId },
      orderBy: { startTime: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true, name: true, type: true, startTime: true,
        duration: true, distance: true, avgHeartRate: true,
        avgPace: true, elevGain: true, calories: true,
      },
    }),
    cursor ? Promise.resolve(null) : prisma.activity.count({ where: { userId } }),
  ]);

  const hasMore    = activities.length > limit;
  const page       = hasMore ? activities.slice(0, limit) : activities;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({ activities: page, nextCursor, totalCount });
}
