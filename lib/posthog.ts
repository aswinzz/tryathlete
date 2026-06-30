import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

/**
 * Server-side PostHog client (singleton).
 * Use this in API routes and server components to capture backend events.
 */
export function getPostHogClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (!_client) {
    _client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      flushAt: 1,      // flush immediately — important in serverless
      flushInterval: 0,
    });
  }
  return _client;
}

/**
 * Fire-and-forget server event. Safe to call from any API route.
 * Silently swallows errors so analytics never break the actual response.
 */
export function captureServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  try {
    const ph = getPostHogClient();
    if (!ph) return;
    ph.capture({ distinctId: userId, event, properties });
  } catch {
    // never throw from analytics
  }
}
