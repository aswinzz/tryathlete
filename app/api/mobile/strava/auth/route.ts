import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getStravaAuthUrl } from "@/lib/strava";

const SECRET = new TextEncoder().encode(
  process.env.MOBILE_JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? "mobile-secret-change-me"
);

/**
 * Mobile Strava OAuth entry point.
 * The iOS app opens this URL in ASWebAuthenticationSession passing its JWT as a query param.
 * We verify it, build the Strava OAuth URL with a mobile-flagged state, and redirect.
 *
 * Usage: GET /api/mobile/strava/auth?token=<mobile_jwt>
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    userId = payload.sub as string;
    if (!userId) throw new Error("No sub");
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Encode userId + mobile flag in state so the callback knows to deep-link back
  const state = Buffer.from(`${userId}:mobile`).toString("base64url");
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/strava/callback`;
  const authUrl = getStravaAuthUrl(redirectUri, state);

  return NextResponse.redirect(authUrl);
}
