import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncStravaData } from "@/lib/strava";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncStravaData(session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("[strava/sync]", message, err instanceof Error ? err.stack : "");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
