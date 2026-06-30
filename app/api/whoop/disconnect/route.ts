import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUser";
import { prisma } from "@/lib/prisma";
import { captureServerEvent } from "@/lib/posthog";
import { withApiHandler } from "@/lib/apiError";

export const DELETE = withApiHandler(async (req: NextRequest) => {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.trackerConnection.deleteMany({
    where: { userId, provider: "whoop" },
  });

  captureServerEvent(userId, "tracker_disconnected", { provider: "whoop", platform: "web" });
  return NextResponse.json({ success: true });
}, "whoop.disconnect");
