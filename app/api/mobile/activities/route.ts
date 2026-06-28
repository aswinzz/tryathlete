import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const userId = await verifyMobileToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20");
  const take = Math.min(limit, PAGE_SIZE) + 1;

  const activities = await prisma.activity.findMany({
    where: { userId },
    orderBy: { startTime: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, name: true, type: true, startTime: true,
      duration: true, distance: true, avgHeartRate: true,
      avgPace: true, elevGain: true, calories: true,
    },
  });

  const hasMore = activities.length > take - 1;
  const page = hasMore ? activities.slice(0, take - 1) : activities;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({ activities: page, nextCursor });
}
