import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeStravaCode, DEFAULT_STRAVA_PREFS } from "@/lib/strava";

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
  try {
    userId = Buffer.from(state, "base64url").toString();
  } catch {
    return NextResponse.redirect(new URL("/settings?strava=error", process.env.NEXTAUTH_URL!));
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/strava/callback`;

  try {
    const { accessToken, refreshToken, expiresAt } = await exchangeStravaCode(code, redirectUri);
    const expiry = new Date(expiresAt * 1000);

    await prisma.trackerConnection.upsert({
      where: { userId_provider: { userId, provider: "strava" } },
      update: {
        accessToken,
        refreshToken,
        tokenExpiry: expiry,
        connectedAt: new Date(),
      },
      create: {
        userId,
        provider:    "strava",
        accessToken,
        refreshToken,
        tokenExpiry: expiry,
        dataPrefs:   JSON.stringify(DEFAULT_STRAVA_PREFS),
      },
    });
  } catch (err) {
    console.error("Strava callback error:", err);
    return NextResponse.redirect(new URL("/settings?strava=error", process.env.NEXTAUTH_URL!));
  }

  // Kick off initial sync in background
  fetch(`${process.env.NEXTAUTH_URL}/api/strava/sync`, {
    method: "POST",
    headers: { Cookie: req.headers.get("cookie") ?? "" },
  }).catch(() => {});

  return NextResponse.redirect(new URL("/settings?strava=connected", process.env.NEXTAUTH_URL!));
}
