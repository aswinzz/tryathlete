/**
 * Strava Webhook Events API
 *
 * GET  /api/strava/webhook  — Strava sends this once to verify the endpoint
 *                             during subscription creation (hub challenge).
 * POST /api/strava/webhook  — Strava pushes events here when activities are
 *                             created, updated, or deleted.
 *
 * Strava requires a 200 response within 2 seconds. All heavy work happens
 * in the background via fire-and-forget.
 *
 * One-time setup: call POST /api/strava/webhook/subscribe (see subscribe/route.ts)
 * or run the curl command in the README to register this URL with Strava.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importSingleStravaActivity } from "@/lib/strava";
import { captureServerEvent } from "@/lib/posthog";

// ─── GET — hub challenge verification ────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode      = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");
  const token     = searchParams.get("hub.verify_token");

  if (
    mode      === "subscribe" &&
    challenge &&
    token     === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN
  ) {
    console.log("[strava/webhook] challenge verified ✓");
    return NextResponse.json({ "hub.challenge": challenge });
  }

  console.warn("[strava/webhook] challenge rejected — bad verify_token or mode");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── POST — incoming events ───────────────────────────────────────────────────

interface StravaEvent {
  object_type:     "activity" | "athlete";
  aspect_type:     "create" | "update" | "delete";
  object_id:       number;   // activity id or athlete id
  owner_id:        number;   // Strava athlete id of the user
  subscription_id: number;
  event_time:      number;   // unix timestamp
  updates?:        Record<string, string>;
}

export async function POST(req: NextRequest) {
  let event: StravaEvent;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  console.log(`[strava/webhook] ${event.object_type}.${event.aspect_type} — owner=${event.owner_id} object=${event.object_id}`);

  // We only care about activity events
  if (event.object_type !== "activity") {
    return NextResponse.json({ ok: true });
  }

  // Look up user by Strava athlete id
  const conn = await prisma.trackerConnection.findFirst({
    where: { provider: "strava", stravaAthleteId: String(event.owner_id) },
  });

  if (!conn) {
    // Athlete not in our system (or connected before stravaAthleteId was stored)
    console.warn(`[strava/webhook] no user found for athlete ${event.owner_id}`);
    return NextResponse.json({ ok: true });
  }

  const { userId } = conn;

  if (event.aspect_type === "create") {
    // Import the new activity in the background — return 200 immediately
    importSingleStravaActivity(userId, event.object_id)
      .then(() => {
        captureServerEvent(userId, "activities_synced", {
          provider: "strava",
          trigger:  "webhook",
          activityId: String(event.object_id),
        });
      })
      .catch((err) => {
        console.error(`[strava/webhook] import failed for ${event.object_id}:`, err instanceof Error ? err.message : err);
      });
  }

  if (event.aspect_type === "delete") {
    // Remove the activity from our DB
    prisma.activity
      .deleteMany({ where: { stravaId: String(event.object_id), userId } })
      .catch((err) => {
        console.error(`[strava/webhook] delete failed for ${event.object_id}:`, err instanceof Error ? err.message : err);
      });
  }

  if (event.aspect_type === "update" && event.updates?.title) {
    // Sync name updates
    prisma.activity
      .updateMany({
        where: { stravaId: String(event.object_id), userId },
        data:  { name: event.updates.title },
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
