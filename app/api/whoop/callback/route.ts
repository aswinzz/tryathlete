import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeWhoopCode, DEFAULT_WHOOP_PREFS, syncWhoopData } from "@/lib/whoop";
import { captureServerEvent } from "@/lib/posthog";
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL("/settings?whoop=error", process.env.NEXTAUTH_URL!)
    );
  }

  // Decode userId (and optional :mobile flag) from state
  let userId: string;
  let isMobile = false;
  try {
    const decoded = Buffer.from(state, "base64url").toString();
    if (decoded.endsWith(":mobile")) {
      isMobile = true;
      userId = decoded.slice(0, -":mobile".length);
    } else {
      userId = decoded;
    }
  } catch {
    return NextResponse.redirect(new URL("/settings?whoop=error", process.env.NEXTAUTH_URL!));
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/whoop/callback`;

  try {
    const { accessToken, refreshToken, expiresIn } = await exchangeWhoopCode(code, redirectUri);
    const expiry = new Date(Date.now() + expiresIn * 1000);

    await prisma.trackerConnection.upsert({
      where: { userId_provider: { userId, provider: "whoop" } },
      update: {
        accessToken,
        refreshToken,
        tokenExpiry: expiry,
        connectedAt: new Date(),
        // Preserve existing dataPrefs if reconnecting
      },
      create: {
        userId,
        provider:     "whoop",
        accessToken,
        refreshToken,
        tokenExpiry:  expiry,
        dataPrefs:    JSON.stringify(DEFAULT_WHOOP_PREFS),
      },
    });

    captureServerEvent(userId, "tracker_connected", {
      provider: "whoop",
      platform: isMobile ? "ios" : "web",
    });
  } catch (err) {
    console.error("WHOOP callback error:", err);
    Sentry.captureException(err, { tags: { route: "whoop.callback" } });
    return NextResponse.redirect(new URL("/settings?whoop=error", process.env.NEXTAUTH_URL!));
  }

  // Kick off initial sync in background (fire and forget).
  // Call directly — no HTTP round-trip needed, and avoids auth header issues in mobile flow.
  syncWhoopData(userId).catch(() => {});

  // For mobile: redirect back to the iOS app via deep link
  if (isMobile) {
    return NextResponse.redirect("tryathlete://oauth/callback?service=whoop&status=connected");
  }
  return NextResponse.redirect(new URL("/settings?whoop=connected", process.env.NEXTAUTH_URL!));
}
