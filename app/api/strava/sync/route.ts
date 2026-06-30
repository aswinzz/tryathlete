import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUser";
import { syncStravaData } from "@/lib/strava";
import { captureServerEvent } from "@/lib/posthog";
import { withApiHandler } from "@/lib/apiError";

export const POST = withApiHandler(async (req: NextRequest) => {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncStravaData(userId);
  captureServerEvent(userId, "activities_synced", { provider: "strava" });
  return NextResponse.json({ success: true });
}, "strava.sync");
