import { NextRequest, NextResponse } from "next/server";
import { verifyMobileToken } from "@/lib/mobileAuth";
import { syncWhoopData } from "@/lib/whoop";

export async function POST(req: NextRequest) {
  const userId = await verifyMobileToken(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await syncWhoopData(userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
