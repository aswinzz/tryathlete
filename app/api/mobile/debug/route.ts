import { NextRequest, NextResponse } from "next/server";
import { verifyMobileToken } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

// Temporary debug endpoint — REMOVE BEFORE PRODUCTION
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "(none)";
  const userId = await verifyMobileToken(req);
  return NextResponse.json({
    authHeaderPresent: authHeader !== "(none)",
    authHeaderPrefix: authHeader.substring(0, 20),
    tokenLength: authHeader.startsWith("Bearer ") ? authHeader.length - 7 : 0,
    verifiedUserId: userId,
    secretSource:
      process.env.MOBILE_JWT_SECRET
        ? "MOBILE_JWT_SECRET"
        : process.env.NEXTAUTH_SECRET
        ? "NEXTAUTH_SECRET"
        : "fallback",
  });
}
