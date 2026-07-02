/**
 * APNs push notification helper
 *
 * Uses Apple's HTTP/2 API with JWT auth (no new npm packages needed —
 * jose is already in the project for mobile JWT signing).
 *
 * Required env vars:
 *   APNS_KEY_ID       — 10-char key ID from Apple Developer → Certificates, IDs & Profiles → Keys
 *   APNS_TEAM_ID      — 10-char Team ID from Apple Developer → Membership
 *   APNS_PRIVATE_KEY  — contents of the .p8 file (newlines as \n or literal)
 *   APNS_BUNDLE_ID    — iOS bundle identifier, e.g. com.tryathlete.app
 *
 * Uses api.push.apple.com in production, api.sandbox.push.apple.com otherwise.
 */

import * as http2 from "http2";
import { SignJWT, importPKCS8 } from "jose";
import { prisma } from "./prisma";

// ─── JWT caching ──────────────────────────────────────────────────────────────

// APNs JWTs are valid for 1 hour; we refresh at 50 min to stay safe.
let _jwt: { token: string; exp: number } | null = null;

async function getAPNsJwt(): Promise<string> {
  if (_jwt && _jwt.exp > Date.now()) return _jwt.token;

  const raw = process.env.APNS_PRIVATE_KEY ?? "";
  // Support both literal newlines and \n-escaped strings (common in env files)
  const pkcs8 = raw.replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(pkcs8, "ES256");

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: process.env.APNS_KEY_ID! })
    .setIssuedAt()
    .setIssuer(process.env.APNS_TEAM_ID!)
    .setExpirationTime("1h")
    .sign(privateKey);

  _jwt = { token, exp: Date.now() + 50 * 60 * 1000 };
  return token;
}

// ─── HTTP/2 delivery ──────────────────────────────────────────────────────────

const APNS_HOST =
  process.env.NODE_ENV === "production"
    ? "api.push.apple.com"
    : "api.sandbox.push.apple.com";

/**
 * Send one APNs request. Returns the HTTP status code.
 *   200 — delivered
 *   410 — device token no longer valid (unregister it)
 *   4xx — bad request / auth issue
 */
function deliverToAPNs(
  deviceToken: string,
  payload: object,
  jwt: string,
  bundleId: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${APNS_HOST}`);
    client.on("error", reject);

    const body = JSON.stringify(payload);
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body),
    });

    let status = 0;
    req.on("response", (headers) => {
      status = headers[":status"] as number;
    });
    req.on("end", () => {
      client.close();
      resolve(status);
    });
    req.on("error", (err) => {
      client.close();
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body:  string;
  /** Extra key-value pairs forwarded in the root of the APNs payload (not inside aps) */
  data?: Record<string, string>;
}

/**
 * Send a push notification to all registered iOS devices for a user.
 * Silently removes tokens that APNs reports as invalid (410).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  const required = ["APNS_PRIVATE_KEY", "APNS_KEY_ID", "APNS_TEAM_ID", "APNS_BUNDLE_ID"];
  if (required.some((k) => !process.env[k])) {
    console.warn("[push] APNs env vars not fully configured — skipping");
    return;
  }

  const tokens = await prisma.devicePushToken.findMany({ where: { userId } });
  if (!tokens.length) return;

  const jwt       = await getAPNsJwt();
  const bundleId  = process.env.APNS_BUNDLE_ID!;
  const apnsBody  = {
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
    },
    ...(payload.data ?? {}),
  };

  const staleIds: string[] = [];

  await Promise.allSettled(
    tokens.map(async ({ id, token }) => {
      try {
        const status = await deliverToAPNs(token, apnsBody, jwt, bundleId);
        if (status === 410) {
          staleIds.push(id);
        } else if (status !== 200) {
          console.warn(`[push] APNs ${status} for token ${token.slice(0, 8)}…`);
        }
      } catch (err) {
        console.error("[push] delivery error:", err instanceof Error ? err.message : err);
      }
    })
  );

  if (staleIds.length) {
    await prisma.devicePushToken.deleteMany({ where: { id: { in: staleIds } } });
    console.log(`[push] removed ${staleIds.length} stale token(s) for user ${userId}`);
  }
}
