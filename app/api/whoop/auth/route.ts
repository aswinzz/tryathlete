import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWhoopAuthUrl } from "@/lib/whoop";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", process.env.NEXTAUTH_URL!));
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/whoop/callback`;
  // State = userId so we can associate the callback with the right user
  const state = Buffer.from(session.user.id).toString("base64url");
  const url   = getWhoopAuthUrl(redirectUri, state);

  return NextResponse.redirect(url);
}
