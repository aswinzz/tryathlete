import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUser";
import { syncGarminActivities, syncGarminWellness } from "@/lib/garmin";
import { captureServerEvent } from "@/lib/posthog";
import { withApiHandler } from "@/lib/apiError";

export const POST = withApiHandler(async (req: NextRequest) => {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncGarminActivities(userId);

  // Wellness (Training Readiness / HRV / sleep) — never fails the sync
  try { await syncGarminWellness(userId); } catch {}

  captureServerEvent(userId, "activities_synced", { provider: "garmin" });
  return NextResponse.json({ success: true });
}, "garmin.sync");
