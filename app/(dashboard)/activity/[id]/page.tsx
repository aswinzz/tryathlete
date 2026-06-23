/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Share2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  formatDuration,
  formatDistance,
  formatPace,
  getActivityIcon,
  ZONE_COLORS,
  lapDistanceLabel,
} from "@/lib/utils";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const activity = await prisma.activity.findFirst({
    where: { id, userId: session!.user!.id! },
    include: { laps: { orderBy: { lapIndex: "asc" } } },
  });

  if (!activity) notFound();

  const fastestLap = activity.laps.reduce(
    (best: typeof activity.laps[0] | null, l) =>
      !best || (l.avgPace && (!best.avgPace || l.avgPace < best.avgPace))
        ? l
        : best,
    null
  );

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-[var(--text-2)] hover:text-white transition-colors"
        >
          ← Feed
        </Link>
        <button className="text-[var(--text-2)] hover:text-white transition-colors p-1">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Hero */}
      <div className="px-5 pb-6">
        <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
          {activity.type.toUpperCase()}
        </p>
        <p className="text-xs text-[var(--text-2)] mt-0.5">
          {format(new Date(activity.startTime), "MMMM d, yyyy · h:mm a")}
        </p>
        <div className="flex items-baseline gap-3 mt-2">
          <span className="text-7xl font-black text-white">
            {activity.distance ? formatDistance(activity.distance) : "—"}
          </span>
          <span className="text-2xl font-bold text-[var(--text-2)]">KM</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mx-5 border-y border-[var(--border)] py-4">
        <div className="grid grid-cols-3 gap-4">
          {activity.avgPace && (
            <QuickStat label="Avg Pace" value={formatPace(activity.avgPace)} />
          )}
          <QuickStat label="Duration" value={formatDuration(activity.duration)} />
          {activity.avgHeartRate && (
            <QuickStat label="Avg HR" value={`${activity.avgHeartRate} bpm`} />
          )}
        </div>
      </div>

      {/* Splits table */}
      {activity.laps.length > 0 && (
        <div className="px-5 mt-6 flex-1">
          {/* Header */}
          <div className="grid grid-cols-[3fr_2.5fr_1fr_2.5fr_2fr] text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest pb-2 border-b border-[var(--border)]">
            <span>Split</span>
            <span className="text-center">Pace</span>
            <span className="text-center">Zn</span>
            <span className="text-center">Time</span>
            <span className="text-right">HR</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[var(--border)]">
            {activity.laps.map((lap) => {
              const zone = lap.zone || 2;
              const zoneColor = ZONE_COLORS[zone];
              const isFastest = fastestLap?.lapIndex === lap.lapIndex;
              return (
                <div
                  key={lap.lapIndex}
                  className="grid grid-cols-[3fr_2.5fr_1fr_2.5fr_2fr] items-center py-2.5 text-sm"
                >
                  <span className="font-medium text-white flex items-center gap-1.5">
                    {lapDistanceLabel(lap.distance)}
                    {isFastest && activity.laps.length > 2 && (
                      <Badge variant="accent">FAST</Badge>
                    )}
                  </span>
                  <span className="text-center font-semibold text-white">
                    {lap.avgPace ? formatPace(lap.avgPace) : "—"}
                  </span>
                  <span className="flex justify-center">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: zoneColor }}
                    />
                  </span>
                  <span className="text-center text-[var(--text-2)]">
                    {formatDuration(lap.duration)}
                  </span>
                  <span className="text-right text-[var(--text-2)]">
                    {lap.avgHeartRate ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* HR Summary */}
          <div className="flex items-center justify-between py-3 border-t border-[var(--border)] text-xs">
            <span className="font-semibold text-[var(--text-2)] uppercase tracking-wider">
              Heart Rate
            </span>
            <span className="text-[var(--text-2)]">
              {activity.avgHeartRate} ~ {activity.maxHeartRate} BPM
            </span>
            <span className="font-bold text-white">
              {activity.avgHeartRate} AVG
            </span>
          </div>
        </div>
      )}

      {/* Additional stats */}
      <div className="mx-5 mt-4 mb-4 bg-[var(--surface-2)] rounded-2xl p-4 space-y-2">
        {[
          { l: "Calories", v: activity.calories ? `${activity.calories} kcal` : "—" },
          { l: "Elevation gain", v: activity.elevGain ? `+${Math.round(activity.elevGain)}m` : "—" },
          { l: "Steps", v: activity.steps ? activity.steps.toLocaleString() : "—" },
        ].map(({ l, v }) => (
          <div key={l} className="flex justify-between text-sm">
            <span className="text-[var(--text-2)]">{l}</span>
            <span className="font-semibold text-white">{v}</span>
          </div>
        ))}
      </div>

      {/* Share bar */}
      <div className="sticky bottom-20 px-5 pb-4 pt-2 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
        <div className="flex gap-3">
          <Link href={`/share/${activity.id}`} className="flex-1">
            <Button variant="accent" size="lg" fullWidth>
              <Share2 size={16} />
              Share This Run
            </Button>
          </Link>
          <Button variant="surface" size="lg">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[9px] font-bold text-[var(--text-2)] uppercase tracking-widest mt-0.5">
        {label}
      </p>
    </div>
  );
}
