import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUser";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/apiError";

// POST /api/mobile/device-token   body: { token: string }
// Called by the iOS app right after APNs gives it a device token.
export const POST = withApiHandler(async (req: NextRequest) => {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  // Upsert — if the token already exists (same device, different user after
  // re-install) reassign it to the current user.
  await prisma.devicePushToken.upsert({
    where:  { token },
    update: { userId },
    create: { userId, token, platform: "ios" },
  });

  return NextResponse.json({ ok: true });
}, "mobile.device-token.register");

// DELETE /api/mobile/device-token   body: { token: string }
// Called on sign-out so the device stops receiving notifications.
export const DELETE = withApiHandler(async (req: NextRequest) => {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  await prisma.devicePushToken.deleteMany({ where: { token, userId } });
  return NextResponse.json({ ok: true });
}, "mobile.device-token.unregister");
