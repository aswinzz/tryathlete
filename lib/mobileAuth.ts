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

export async function verifyMobileToken(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
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
    console.error("[mobileAuth] verify failed:", (err as Error).message, "| secret:", secretSource, "| tokenLen:", token.length);
    return null;
  }
}
