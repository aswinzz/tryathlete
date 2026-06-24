/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Bell, RefreshCw } from "lucide-react";
import Link from "next/link";
import { formatDuration, getHRZone } from "@/lib/utils";
import { startOfWeek, endOfWeek, format as dateFmt } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const activities = await prisma.activity.findMany({
    where: { userId },
    orderBy: { startTime: "desc" },
    take: 20,
    include: { laps: { orderBy: { lapIndex: "asc" }, take: 1 } },
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weekActivities = activities.filter(
    (a) => new Date(a.startTime) >= weekStart && new Date(a.startTime) <= weekEnd
  );

  const weekStats = {
    runs: weekActivities.filter((a) => a.type.toLowerCase().includes("run")).length,
    totalKm: weekActivities.reduce((s, a) => s + (a.distance || 0), 0) / 1000,
    totalTime: weekActivities.reduce((s, a) => s + a.duration, 0),
    totalKcal: weekActivities.reduce((s, a) => s + (a.calories || 0), 0),
  };

  const garminConn = await prisma.trackerConnection.findUnique({
    where: { userId_provider: { userId, provider: "garmin" } },
  });

  const name = session?.user?.name?.split(" ")[0] || "Athlete";

  return (
    <div className="px-5 pt-14 pb-28 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-2)]">Good morning,</p>
          <h1 className="text-2xl font-bold text-white">{name} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          {garminConn && (
            <form action="/api/garmin/sync" method="POST">
              <button
                type="submit"
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--accent)] transition-colors"
                title="Sync Garmin"
              >
                <RefreshCw size={15} />
              </button>
            </form>
          )}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-2)]">
            <Bell size={15} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF9500]" />
          </button>
        </div>
      </div>

      {/* Weekly summary */}
      <Card accentTop>
        <CardContent className="p-5">
          <p className="text-[10px] font-semibold text-[var(--text-2)] uppercase tracking-widest mb-1">
            This Week
          </p>
          <p className="text-[10px] text-[var(--text-3)] mb-3">
            {dateFmt(weekStart, "MMM d")} – {dateFmt(weekEnd, "MMM d")}
          </p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { v: weekStats.runs.toString(), l: "RUNS" },
              { v: `${weekStats.totalKm.toFixed(1)}`, l: "KM" },
              { v: formatDuration(weekStats.totalTime), l: "HRS" },
              { v: weekStats.totalKcal.toLocaleString(), l: "KCAL" },
            ].map(({ v, l }, i) => (
              <div key={i} className={i > 0 ? "border-l border-[var(--border)] pl-2" : ""}>
                <p className="text-[20px] font-bold text-white leading-tight">{v}</p>
                <p className="text-[9px] font-semibold text-[var(--text-2)] uppercase tracking-widest">
                  {l}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-[var(--text-3)] mb-1.5">Weekly goal: 30 KM</p>
          {/* Progress bar */}
          <div className="h-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min((weekStats.totalKm / 30) * 100, 100)}%`,
                background: "var(--accent)",
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* No activities yet */}
      {activities.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-4xl">🏃</p>
          <p className="font-semibold text-[var(--text-2)]">No activities yet</p>
          <p className="text-sm text-[var(--text-3)]">
            Connect your tracker to import workouts
          </p>
          <Link href="/connect">
            <Button variant="accent" size="sm">
              Connect Tracker
            </Button>
          </Link>
        </div>
      )}

      {/* Activity feed */}
      {activities.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Recent Activity</h2>
            <button className="text-xs text-[var(--text-2)] hover:text-white transition-colors">
              See all →
            </button>
          </div>

          <div className="space-y-3">
            {activities.map((act) => {
              const zone = act.avgHeartRate ? getHRZone(act.avgHeartRate) : 2;
              return (
                <ActivityCard
                  key={act.id}
                  id={act.id}
                  name={act.name}
                  type={act.type}
                  startTime={act.startTime}
                  duration={act.duration}
                  distance={act.distance}
                  avgHeartRate={act.avgHeartRate}
                  avgPace={act.avgPace}
                  elevGain={act.elevGain}
                  calories={act.calories}
                  zone={zone}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
