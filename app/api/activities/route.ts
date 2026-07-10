import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";
import { reconcileActivity } from "@/lib/planReconciler";

const PAGE_SIZE = 20;

/**
 * POST /api/activities — create a manual activity (ad-hoc workout log).
 * Body: { name?, type?, startTime?, durationMin? }
 * Used by the app's "Log workout" flow so users can log strength sessions
 * (with exercises/sets) even without a plan or a synced device activity.
 */
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const type = typeof body.type === "string" && body.type.trim() ? body.type.trim() : "strength";
  const name = typeof body.name === "string" && body.name.trim()
    ? body.name.trim()
    : "Workout";
  const startTime = body.startTime ? new Date(body.startTime) : new Date();
  const durationMin = Number(body.durationMin);
  const duration = Number.isFinite(durationMin) && durationMin > 0 ? Math.round(durationMin * 60) : 0;

  const activity = await prisma.activity.create({
    data: { userId, source: "manual", name, type, startTime, duration },
  });

  // A manual log can still match a planned session for that day
  reconcileActivity(activity.id, userId).catch(() => {});

  return NextResponse.json(activity, { status: 201 });
}

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
        id: true, name: true, type: true, source: true, startTime: true,
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
