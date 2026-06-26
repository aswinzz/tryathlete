/**
 * POST /api/activities/:id/route-sync
 * Fetches GPS route and HR data from Garmin for an existing activity.
 *
 * GPS and HR are written in separate Prisma calls so that a missing HR
 * migration never prevents the route from being saved.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGarminClient, extractDetailsData, type GarminDetailsResponse } from "@/lib/garmin";

async function fetchAndSaveHR(
  garminId: string,
  activityId: string,
  startTime: Date,
  client: Awaited<ReturnType<typeof getGarminClient>>
): Promise<boolean> {
  try {
    const hrUrl = `https://connectapi.garmin.com/activity-service/activity/${garminId}/details?maxChartSize=2000`;
    const hrDetails = await client.get<GarminDetailsResponse>(hrUrl);
    const hrData = extractDetailsData(hrDetails, startTime);

    const hrUpdate: Record<string, unknown> = {};
    if (hrData.hrStream)     hrUpdate.hrStream     = hrData.hrStream;
    if (hrData.hrZones)      hrUpdate.hrZones      = hrData.hrZones;
    if (hrData.minHeartRate) hrUpdate.minHeartRate = hrData.minHeartRate;

    if (Object.keys(hrUpdate).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.activity.update as any)({ where: { id: activityId }, data: hrUpdate });
      return true;
    }
  } catch { /* HR columns may not exist yet, or no HR data — ignore */ }
  return false;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const activity = await prisma.activity.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, garminId: true, startTime: true, routePoints: true },
  });

  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!activity.garminId) return NextResponse.json({ error: "No Garmin ID for this activity" }, { status: 400 });

  const client = await getGarminClient(session.user.id);

  // ── GPS: return cached immediately, only fetch if missing ─────────────────
  let routePoints: { lat: number; lon: number }[] | null = null;

  if (activity.routePoints) {
    routePoints = JSON.parse(activity.routePoints as string);
  } else {
    try {
      const detailsUrl = `https://connectapi.garmin.com/activity-service/activity/${activity.garminId}/details`;
      const details = await client.get<GarminDetailsResponse>(detailsUrl);
      const extracted = extractDetailsData(details, activity.startTime);

      if (!extracted.routePoints) {
        return NextResponse.json({ error: "No GPS data available for this activity" }, { status: 404 });
      }

      routePoints = JSON.parse(extracted.routePoints as string);

      // Write GPS only — isolated so a missing HR migration can't break this
      await prisma.activity.update({
        where: { id },
        data: { routePoints: extracted.routePoints as string },
      });
    } catch (err) {
      console.error("GPS sync error:", err);
      return NextResponse.json({ error: "Failed to fetch GPS from Garmin" }, { status: 500 });
    }
  }

  // ── HR: always attempt with maxChartSize for denser data ─────────────────
  const hrSynced = await fetchAndSaveHR(activity.garminId, id, activity.startTime, client);

  return NextResponse.json({ routePoints, hrSynced });
}
