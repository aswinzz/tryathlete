import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.MOBILE_JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? "mobile-secret-change-me"
);

const ALG = "HS256";
const EXPIRY = "30d";

export async function signMobileToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET);
}

/**
 * Extracts the raw JWT string from the request.
 * Checks two places in order:
 *  1. "Authorization: Bearer <token>" header (standard)
 *  2. "X-App-Token: <token>" header (fallback for proxies that strip Authorization)
 */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);

  const customHeader = req.headers.get("x-app-token");
  if (customHeader) return customHeader;

  return null;
}

export async function verifyMobileToken(req: NextRequest): Promise<string | null> {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: [ALG] });
    return (payload.sub as string) ?? null;
  } catch (err) {
    const secretSource = process.env.MOBILE_JWT_SECRET
      ? "MOBILE_JWT_SECRET"
      : process.env.NEXTAUTH_SECRET
      ? "NEXTAUTH_SECRET"
      : "fallback";
    console.error("[mobileAuth] verify failed:", (err as Error).message, "| secret:", secretSource);
    return null;
  }
}
