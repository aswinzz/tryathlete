import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";
import { parseDataPrefs, DEFAULT_WHOOP_PREFS, DEFAULT_GARMIN_PREFS } from "@/lib/whoop";
import { DEFAULT_STRAVA_PREFS } from "@/lib/strava";

export const dynamic = "force-dynamic";

const PREF_DEFAULTS: Record<string, typeof DEFAULT_WHOOP_PREFS> = {
  whoop:  DEFAULT_WHOOP_PREFS,
  garmin: DEFAULT_GARMIN_PREFS as typeof DEFAULT_WHOOP_PREFS,
  strava: DEFAULT_STRAVA_PREFS as typeof DEFAULT_WHOOP_PREFS,
};

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.trackerConnection.findMany({
    where: { userId },
    select: { provider: true, connected: true, lastSyncAt: true, dataPrefs: true },
  });

  const connections = rows.map((c) => ({
    id: c.provider,
    service: c.provider,
    connected: c.connected,
    lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
    prefs: parseDataPrefs(c.dataPrefs, PREF_DEFAULTS[c.provider] ?? DEFAULT_WHOOP_PREFS),
  }));

  return NextResponse.json({ connections });
}
