import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

type RouteHandler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>;

/**
 * Wraps a route handler with:
 * - Consistent error response shape  { error: string }
 * - Sentry capture with request context
 * - Optional tag for grouping in Sentry (e.g. "strava.sync")
 *
 * Usage:
 *   export const POST = withApiHandler(async (req) => { ... }, "strava.sync");
 */
export function withApiHandler(handler: RouteHandler, tag?: string): RouteHandler {
  return async (req: NextRequest, ctx?: unknown) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      Sentry.captureException(error, {
        tags: { route: tag ?? req.nextUrl.pathname },
        extra: {
          method: req.method,
          url: req.nextUrl.pathname,
          search: req.nextUrl.search,
        },
      });

      console.error(`[API Error]${tag ? ` [${tag}]` : ""}`, error.message);

      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }
  };
}
