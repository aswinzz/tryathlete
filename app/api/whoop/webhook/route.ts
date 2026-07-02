/**
 * WHOOP Webhook Events
 *
 * Unlike Strava, WHOOP webhooks are configured entirely through the developer
 * dashboard at https://developer.whoop.com — there is no subscription API.
 * Set this URL as your callback there:
 *   https://your-domain.com/api/whoop/webhook
 *
 * WHOOP verifies each event with an HMAC-SHA256 signature over the raw
 * request body, sent in the X-Whoop-Signature header. We check that
 * signature against WHOOP_CLIENT_SECRET before processing.
 *
 * Event types handled:
 *   recovery.updated  → sync recovery + sleep
 *   sleep.updated     → sync recovery + sleep
 *   cycle.updated     → sync recovery + sleep
 *   workout.updated   → sync workouts (only if syncActivities is enabled)
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { syncWhoopData } from "@/lib/whoop";
import { captureServerEvent } from "@/lib/posthog";

// ─── Signature verification ───────────────────────────────────────────────────

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = process.env.WHOOP_CLIENT_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  // WHOOP may prefix with "sha256=" — handle both
  const normalized = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  return normalized === expected;
}

// ─── Event types ──────────────────────────────────────────────────────────────

interface WhoopWebhookEvent {
  user_id:  number;
  event:    string;   // "recovery.updated" | "sleep.updated" | "workout.updated" | "cycle.updated"
  trace_id?: string;
  data?:    Record<string, unknown>;
}

// Events that touch recovery / sleep data
const RECOVERY_EVENTS = new Set(["recovery.updated", "sleep.updated", "cycle.updated"]);

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-whoop-signature");

  if (!verifySignature(rawBody, signature)) {
    console.warn("[whoop/webhook] invalid signature — rejected");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let event: WhoopWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  console.log(`[whoop/webhook] ${event.event} — whoopUserId=${event.user_id}`);

  // Look up user by WHOOP's numeric user id
  const conn = await prisma.trackerConnection.findFirst({
    where: { provider: "whoop", whoopUserId: String(event.user_id) },
  });

  if (!conn) {
    // User not found — they may have connected before whoopUserId was stored.
    // They'll be backfilled on the next manual sync.
    console.warn(`[whoop/webhook] no user found for whoopUserId=${event.user_id}`);
    return NextResponse.json({ ok: true });
  }

  const { userId } = conn;

  // Handle recovery / sleep / cycle events
  if (RECOVERY_EVENTS.has(event.event)) {
    syncWhoopData(userId)
      .then(() => {
        captureServerEvent(userId, "recovery_synced", {
          provider: "whoop",
          trigger:  "webhook",
          event:    event.event,
        });
      })
      .catch((err) => {
        console.error(`[whoop/webhook] sync failed for ${userId}:`, err instanceof Error ? err.message : err);
      });
  }

  // Handle workout events (only syncs if user has syncActivities=true)
  if (event.event === "workout.updated") {
    syncWhoopData(userId)
      .then(() => {
        captureServerEvent(userId, "activities_synced", {
          provider: "whoop",
          trigger:  "webhook",
        });
      })
      .catch((err) => {
        console.error(`[whoop/webhook] workout sync failed for ${userId}:`, err instanceof Error ? err.message : err);
      });
  }

  // Always respond quickly — WHOOP requires 200 within 2 seconds
  return NextResponse.json({ ok: true });
}
