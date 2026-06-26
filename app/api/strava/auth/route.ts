import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStravaAuthUrl } from "@/lib/strava";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", process.env.NEXTAUTH_URL!));
  }

  const state       = Buffer.from(session.user.id).toString("base64url");
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/strava/callback`;
  const authUrl     = getStravaAuthUrl(redirectUri, state);

  return NextResponse.redirect(authUrl);
}
