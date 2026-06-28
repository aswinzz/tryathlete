/**
 * POST /api/activities/:id/strava-hr-sync
 * Fetches HR stream + zones from Strava for an already-imported activity.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchStravaHR } from "@/lib/strava";
import { getUserId } from "@/lib/getUser";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(_req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activity = await (prisma.activity.findFirst as any)({
    where: { id, userId },
    select: { id: true, stravaId: true, avgHeartRate: true },
  });

  if (!activity)           return NextResponse.json({ error: "Not found" },              { status: 404 });
  if (!activity.stravaId)  return NextResponse.json({ error: "Not a Strava activity" },  { status: 400 });

  const { hrStream, hrZones, minHeartRate } = await fetchStravaHR(userId, activity.stravaId);

  if (!hrStream && !hrZones) {
    return NextResponse.json({ error: "No HR stream available from Strava" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.activity.update as any)({
    where: { id },
    data: {
      ...(hrStream    ? { hrStream }             : {}),
      ...(hrZones     ? { hrZones }              : {}),
      ...(minHeartRate ? { minHeartRate }         : {}),
    },
  });

  return NextResponse.json({ hrSynced: true });
}
