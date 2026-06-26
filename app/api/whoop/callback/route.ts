import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeWhoopCode, DEFAULT_WHOOP_PREFS } from "@/lib/whoop";

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

  // Decode userId from state
  let userId: string;
  try {
    userId = Buffer.from(state, "base64url").toString();
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
  } catch (err) {
    console.error("WHOOP callback error:", err);
    return NextResponse.redirect(new URL("/settings?whoop=error", process.env.NEXTAUTH_URL!));
  }

  // Kick off initial sync in background (fire and forget)
  fetch(`${process.env.NEXTAUTH_URL}/api/whoop/sync`, {
    method: "POST",
    headers: { Cookie: req.headers.get("cookie") ?? "" },
  }).catch(() => {});

  return NextResponse.redirect(new URL("/settings?whoop=connected", process.env.NEXTAUTH_URL!));
}
