import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";

type Ctx = { params: Promise<{ entryId: string }> };

async function ownedEntry(userId: string, entryId: string) {
  const entry = await prisma.workoutEntry.findFirst({
    where: { id: entryId },
    include: { day: { include: { week: { include: { plan: { select: { userId: true } } } } } } },
  });
  return entry?.day.week.plan.userId === userId ? entry : null;
}

/** GET — list all links for an entry (with activity data) */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(_req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId } = await params;
  if (!(await ownedEntry(userId, entryId)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const links = await prisma.planActivityLink.findMany({
    where: { entryId },
    include: {
      activity: {
        select: {
          id: true, name: true, type: true, startTime: true,
          distance: true, duration: true, avgPace: true,
          avgHeartRate: true, calories: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(links);
}

/** POST — manually link an activity to an entry */
export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entryId } = await params;

  const entry = await ownedEntry(userId, entryId);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { activityId } = await req.json();
  if (!activityId) return NextResponse.json({ error: "activityId required" }, { status: 400 });

  const activity = await prisma.activity.findFirst({ where: { id: activityId, userId } });
  if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  const link = await prisma.planActivityLink.upsert({
    where: { entryId_activityId: { entryId, activityId } },
    update: { status: "MANUAL", confidence: 1.0 },
    create: { entryId, activityId, confidence: 1.0, status: "MANUAL" },
    include: { activity: { select: { id: true, name: true, type: true, startTime: true, distance: true, duration: true, avgPace: true, avgHeartRate: true, calories: true } } },
  });

  // Auto-complete day if all entries now have confirmed links
  const dayId = entry.dayId;
  const allEntries = await prisma.workoutEntry.findMany({
    where: { dayId },
    include: { links: { where: { status: { in: ["AUTO", "MANUAL"] } } } },
  });
  if (allEntries.length > 0 && allEntries.every((e) => e.links.length > 0)) {
    await prisma.workoutDay.update({
      where: { id: dayId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  return NextResponse.json(link, { status: 201 });
}
