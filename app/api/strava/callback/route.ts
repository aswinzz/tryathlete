import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeStravaCode, DEFAULT_STRAVA_PREFS } from "@/lib/strava";
import { captureServerEvent } from "@/lib/posthog";
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL("/settings?strava=error", process.env.NEXTAUTH_URL!)
    );
  }

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
    return NextResponse.redirect(new URL("/settings?strava=error", process.env.NEXTAUTH_URL!));
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/strava/callback`;

  try {
    const { accessToken, refreshToken, expiresAt, athleteId } = await exchangeStravaCode(code, redirectUri);
    const expiry = new Date(expiresAt * 1000);

    // Auto-enable syncActivities unless another provider already owns it
    const others = await prisma.trackerConnection.findMany({
      where: { userId, provider: { not: "strava" } },
    });
    const anotherSourceActive = others.some((c) => {
      try {
        return JSON.parse(c.dataPrefs as string ?? "{}").syncActivities === true;
      } catch { return false; }
    });
    const prefs = {
      ...DEFAULT_STRAVA_PREFS,
      syncActivities: !anotherSourceActive,
    };

    await prisma.trackerConnection.upsert({
      where: { userId_provider: { userId, provider: "strava" } },
      update: {
        accessToken,
        refreshToken,
        tokenExpiry:     expiry,
        connectedAt:     new Date(),
        dataPrefs:       JSON.stringify(prefs),
        stravaAthleteId: athleteId ? String(athleteId) : undefined,
      },
      create: {
        userId,
        provider:        "strava",
        accessToken,
        refreshToken,
        tokenExpiry:     expiry,
        dataPrefs:       JSON.stringify(prefs),
        stravaAthleteId: athleteId ? String(athleteId) : undefined,
      },
    });

    captureServerEvent(userId, "tracker_connected", {
      provider: "strava",
      platform: isMobile ? "ios" : "web",
    });
  } catch (err) {
    console.error("Strava callback error:", err);
    Sentry.captureException(err, { tags: { route: "strava.callback" } });
    return NextResponse.redirect(new URL("/settings?strava=error", process.env.NEXTAUTH_URL!));
  }

  // Kick off initial sync in background
  fetch(`${process.env.NEXTAUTH_URL}/api/strava/sync`, {
    method: "POST",
    headers: { Cookie: req.headers.get("cookie") ?? "" },
  }).catch(() => {});

  // For mobile: redirect back to the iOS app via deep link
  if (isMobile) {
    return NextResponse.redirect("tryathlete://oauth/callback?service=strava&status=connected");
  }
  return NextResponse.redirect(new URL("/settings?strava=connected", process.env.NEXTAUTH_URL!));
}
