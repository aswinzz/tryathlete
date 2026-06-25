/**
 * POST /api/activities/:id/route-sync
 * Fetches the GPS polyline from Garmin for an existing activity and stores it.
 * Used for activities synced before route support was added, or where the initial
 * fetch failed (e.g. indoor activities temporarily classified as outdoor).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGarminClient } from "@/lib/garmin";
import { downsample } from "@/lib/routeUtils";

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
    select: { id: true, garminId: true, routePoints: true },
  });

  if (!activity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!activity.garminId) {
    return NextResponse.json({ error: "No Garmin ID for this activity" }, { status: 400 });
  }

  // If route already cached, return it
  if (activity.routePoints) {
    return NextResponse.json({ routePoints: JSON.parse(activity.routePoints) });
  }

  try {
    const client = await getGarminClient(session.user.id);
    const detailsUrl = `https://connectapi.garmin.com/activity-service/activity/${activity.garminId}/details`;
    const details = await client.get<{ geoPolylineDTO?: { polyline?: { lat: number; lon: number }[] } }>(detailsUrl);
    const polyline = details?.geoPolylineDTO?.polyline;

    if (!Array.isArray(polyline) || polyline.length < 2) {
      return NextResponse.json({ error: "No GPS data available for this activity" }, { status: 404 });
    }

    const pts = polyline.map((p) => ({ lat: p.lat, lon: p.lon }));
    const downsampled = downsample(pts, 200);

    await prisma.activity.update({
      where: { id },
      data: { routePoints: JSON.stringify(downsampled) },
    });

    return NextResponse.json({ routePoints: downsampled });
  } catch (err) {
    console.error("Route sync error:", err);
    return NextResponse.json({ error: "Failed to fetch route from Garmin" }, { status: 500 });
  }
}
