/**
 * Admin endpoint for managing the Strava webhook subscription.
 *
 * Protected by ADMIN_SECRET — only you can call this.
 *
 * GET    — view current subscription(s)
 * POST   — create a new subscription (one-time setup)
 * DELETE — remove the subscription (by subscription_id query param)
 *
 * Usage after deploying:
 *   curl -X POST https://your-domain.com/api/strava/webhook/subscribe \
 *     -H "Authorization: Bearer $ADMIN_SECRET"
 */

import { NextRequest, NextResponse } from "next/server";

const STRAVA_SUBS_URL = "https://www.strava.com/api/v3/push_subscriptions";

function authed(req: NextRequest): boolean {
  const auth   = req.headers.get("authorization") ?? "";
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

// ─── GET — view current subscription ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const res = await fetch(
    `${STRAVA_SUBS_URL}?client_id=${process.env.STRAVA_CLIENT_ID}&client_secret=${process.env.STRAVA_CLIENT_SECRET}`
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

// ─── POST — create subscription ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const callbackUrl  = `${process.env.NEXTAUTH_URL}/api/strava/webhook`;
  const verifyToken  = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    return NextResponse.json(
      { error: "STRAVA_WEBHOOK_VERIFY_TOKEN env var is not set" },
      { status: 500 }
    );
  }

  const res = await fetch(STRAVA_SUBS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
      callback_url:  callbackUrl,
      verify_token:  verifyToken,
    }),
  });

  const data = await res.json();
  console.log("[strava/subscribe] result:", data);
  return NextResponse.json(data, { status: res.status });
}

// ─── DELETE — remove subscription ────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "?id= required" }, { status: 400 });

  const res = await fetch(`${STRAVA_SUBS_URL}/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.STRAVA_CLIENT_ID!,
      client_secret: process.env.STRAVA_CLIENT_SECRET!,
    }),
  });

  if (res.status === 204) return NextResponse.json({ ok: true });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
