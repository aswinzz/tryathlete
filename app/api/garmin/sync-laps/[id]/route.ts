import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGarminClient, getHRZone } from "@/lib/garmin";

interface GarminLap {
  distance?: number;
  duration?: number;
  averageHR?: number;
  maxHR?: number;
  averageSpeed?: number;
  startTimeLocal?: string;
}

interface GarminLapsResponse {
  lapDTOs?: GarminLap[];
  laps?: GarminLap[];
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const activity = await prisma.activity.findFirst({
    where: { id, userId: session.user.id },
    include: { _count: { select: { laps: true } } },
  });

  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  if (!activity.garminId) {
    return NextResponse.json({ error: "No Garmin ID for this activity" }, { status: 400 });
  }

  if (activity._count.laps > 0) {
    return NextResponse.json({ message: "Laps already synced", count: activity._count.laps });
  }

  try {
    const client = await getGarminClient(session.user.id);

    // Try multiple Garmin endpoints for lap data
    let laps: GarminLap[] = [];

    const endpoints = [
      `https://connect.garmin.com/activity-service/activity/${activity.garminId}/splits`,
      `https://connect.garmin.com/activity-service/activity/${activity.garminId}/laps`,
    ];

    for (const url of endpoints) {
      try {
        const data = await client.get<GarminLapsResponse>(url);
        const found = data?.lapDTOs || data?.laps || [];
        if (found.length > 0) {
          laps = found;
          break;
        }
      } catch {
        // try next endpoint
      }
    }

    if (laps.length === 0) {
      return NextResponse.json({ error: "No lap data available from Garmin" }, { status: 404 });
    }

    // Store laps
    for (let i = 0; i < laps.length; i++) {
      const lap = laps[i];
      const lapPace = lap.averageSpeed ? 1 / lap.averageSpeed : null;
      const zone = lap.averageHR ? getHRZone(lap.averageHR) : null;

      await prisma.activityLap.create({
        data: {
          activityId: activity.id,
          lapIndex: i + 1,
          distance: lap.distance || 0,
          duration: Math.round(lap.duration || 0),
          avgHeartRate: lap.averageHR || null,
          maxHeartRate: lap.maxHR || null,
          avgPace: lapPace,
          zone,
          startTime: lap.startTimeLocal ? new Date(lap.startTimeLocal) : null,
        },
      });
    }

    return NextResponse.json({ success: true, count: laps.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
