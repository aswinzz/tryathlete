import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUser";
import { syncGarminActivities } from "@/lib/garmin";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await syncGarminActivities(userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
