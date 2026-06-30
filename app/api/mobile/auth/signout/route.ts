import { NextRequest, NextResponse } from "next/server";
import { captureServerEvent } from "@/lib/posthog";
import { withApiHandler } from "@/lib/apiError";

// JWT is stateless — client just drops the token. Nothing to revoke server-side.
// We accept an optional userId in the body to fire a PostHog event.
export const POST = withApiHandler(async (req: NextRequest) => {
  try {
    const body = await req.json();
    if (body?.userId) {
      captureServerEvent(body.userId, "user_signed_out", { platform: "ios" });
    }
  } catch {
    // body is optional
  }
  return NextResponse.json({ ok: true });
}, "auth.signout");
