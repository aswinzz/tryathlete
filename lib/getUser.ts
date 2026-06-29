import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobileAuth";

/**
 * Unified auth helper — works for both web (NextAuth cookie) and iOS (Bearer JWT).
 * Use this in every API route instead of `await auth()` so the same endpoint
 * serves both clients without duplication.
 */
export async function getUserId(req: NextRequest): Promise<string | null> {
  // Mobile clients send JWT via Authorization: Bearer or X-App-Token (fallback
  // for proxies that strip the Authorization header).
  const authHeader = req.headers.get("authorization");
  const customHeader = req.headers.get("x-app-token");
  if (authHeader?.startsWith("Bearer ") || customHeader) {
    return verifyMobileToken(req);
  }
  const session = await auth();
  return session?.user?.id ?? null;
}
