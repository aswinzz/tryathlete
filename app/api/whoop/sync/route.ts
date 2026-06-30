import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUser";
import { syncWhoopData } from "@/lib/whoop";
import { captureServerEvent } from "@/lib/posthog";
import { withApiHandler } from "@/lib/apiError";

export const POST = withApiHandler(async (req: NextRequest) => {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncWhoopData(userId);
  captureServerEvent(userId, "recovery_synced", { provider: "whoop" });
  return NextResponse.json({ success: true });
}, "whoop.sync");
