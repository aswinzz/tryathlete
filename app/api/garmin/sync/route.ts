import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncGarminActivities } from "@/lib/garmin";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncGarminActivities(session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
