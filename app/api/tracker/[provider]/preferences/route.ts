/**
 * PATCH /api/tracker/:provider/preferences
 * Body: Partial<WhoopDataPrefs>  e.g. { syncActivities: true }
 *
 * Activity source is mutually exclusive — if syncActivities is set to true
 * for one provider, it is automatically set to false for all others.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDataPrefs, DEFAULT_WHOOP_PREFS, DEFAULT_GARMIN_PREFS } from "@/lib/whoop";
import { DEFAULT_STRAVA_PREFS } from "@/lib/strava";

const DEFAULTS: Record<string, typeof DEFAULT_WHOOP_PREFS> = {
  whoop:  DEFAULT_WHOOP_PREFS,
  garmin: DEFAULT_GARMIN_PREFS as typeof DEFAULT_WHOOP_PREFS,
  strava: DEFAULT_STRAVA_PREFS as typeof DEFAULT_WHOOP_PREFS,
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await params;
  const userId = session.user.id;
  const body: Partial<typeof DEFAULT_WHOOP_PREFS> = await req.json();

  const conn = await prisma.trackerConnection.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!conn) return NextResponse.json({ error: "Not connected" }, { status: 404 });

  const current = parseDataPrefs(conn.dataPrefs, DEFAULTS[provider] ?? DEFAULT_WHOOP_PREFS);
  const updated = { ...current, ...body };

  // Enforce mutual exclusivity for syncActivities
  if (body.syncActivities === true) {
    const others = await prisma.trackerConnection.findMany({
      where: { userId, provider: { not: provider } },
    });
    for (const other of others) {
      const otherPrefs = parseDataPrefs(
        other.dataPrefs,
        DEFAULTS[other.provider] ?? DEFAULT_WHOOP_PREFS
      );
      if (otherPrefs.syncActivities) {
        await prisma.trackerConnection.update({
          where: { id: other.id },
          data: { dataPrefs: JSON.stringify({ ...otherPrefs, syncActivities: false }) },
        });
      }
    }
  }

  await prisma.trackerConnection.update({
    where: { userId_provider: { userId, provider } },
    data: { dataPrefs: JSON.stringify(updated) },
  });

  return NextResponse.json({ success: true, prefs: updated });
}
