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
  formatSpeed,
  formatPace100m,
  getActivityCategory,
  ZONE_COLORS,
  lapDistanceLabel,
} from "@/lib/utils";
import { format } from "date-fns";
import { SyncLapsButton } from "./SyncLapsButton";

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

  const typeLabel = activity.type.toUpperCase().replace(/_/g, " ");
  const category = getActivityCategory(activity.type);
  const t = activity.type.toLowerCase();
  const isRun = t.includes("run");
  const isCycle = t.includes("cycl") || t.includes("bike") || t.includes("ride");
  const isSwim = t.includes("swim");
  const isEndurance = category === "endurance";

  // Hero value: distance for endurance, duration for strength/HIIT
  const heroValue = isEndurance && activity.distance
    ? (isSwim
        ? `${Math.round(activity.distance)}` // metres for swim
        : formatDistance(activity.distance))
    : formatDuration(activity.duration);
  const heroUnit = isEndurance && activity.distance
    ? (isSwim ? "M" : "KM")
    : "";

  // Quick stats (3 columns)
  type QuickStatDef = { label: string; value: string };
  let quickStats: QuickStatDef[];
  if (isRun) {
    quickStats = [
      { label: "AVG PACE", value: activity.avgPace ? formatPace(activity.avgPace) : "—" },
      { label: "DURATION", value: formatDuration(activity.duration) },
      { label: "AVG HR", value: activity.avgHeartRate ? `${activity.avgHeartRate}` : "—" },
    ];
  } else if (isCycle) {
    const speed = activity.avgPace ? formatSpeed(1 / activity.avgPace) : "—";
    quickStats = [
      { label: "AVG SPEED", value: speed !== "—" ? `${speed} km/h` : "—" },
      { label: "DURATION", value: formatDuration(activity.duration) },
      { label: "ELEV GAIN", value: activity.elevGain ? `+${Math.round(activity.elevGain)}m` : "—" },
    ];
  } else if (isSwim) {
    quickStats = [
      { label: "PACE/100M", value: activity.avgPace ? formatPace100m(activity.avgPace) : "—" },
      { label: "DURATION", value: formatDuration(activity.duration) },
      { label: "AVG HR", value: activity.avgHeartRate ? `${activity.avgHeartRate}` : "—" },
    ];
  } else {
    // strength / hiit / other
    quickStats = [
      { label: "DURATION", value: formatDuration(activity.duration) },
      { label: "AVG HR", value: activity.avgHeartRate ? `${activity.avgHeartRate} bpm` : "—" },
      { label: "KCAL", value: activity.calories ? activity.calories.toLocaleString() : "—" },
    ];
  }

  // HR zone breakdown for strength/HIIT (when no laps)
  const hrZoneCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (!isEndurance && activity.avgHeartRate) {
    // Estimate zone from avg HR
    const bpm = activity.avgHeartRate;
    const pct = bpm / 190;
    const zone = pct < 0.6 ? 1 : pct < 0.7 ? 2 : pct < 0.8 ? 3 : pct < 0.9 ? 4 : 5;
    hrZoneCounts[zone] = 1;
  }

  const hasLaps = activity.laps.length > 0;

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-5">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-[var(--text-2)] hover:text-white transition-colors"
        >
          ← Feed
        </Link>
        <button className="text-[var(--text-2)] hover:text-white transition-colors p-2">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Sub-header */}
      <div className="px-5 pb-3">
        <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
          {typeLabel}
        </p>
        <p className="text-sm text-[var(--text-2)] mt-1">
          {format(new Date(activity.startTime), "MMMM d, yyyy").toUpperCase()} · OUTDOOR
        </p>
      </div>

      {/* Hero stat */}
      <div className="px-5 pb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-[72px] font-black leading-none text-white">
            {heroValue}
          </span>
          {heroUnit && (
            <span className="text-[26px] font-bold text-[var(--text-2)] mb-1">{heroUnit}</span>
          )}
        </div>
      </div>

      {/* Quick stats — 3 columns with vertical dividers */}
      <div className="mx-5 border-y border-[var(--border)] py-5 mb-6">
        <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
          {quickStats.map(({ label, value }) => (
            <QuickStat key={label} label={label} value={value} />
          ))}
        </div>
      </div>

      {/* Splits / laps — endurance only */}
      {isEndurance && (
        <div className="px-5 flex-1 overflow-y-auto">
          {hasLaps ? (
            <>
              {/* Splits header */}
              <div className="grid grid-cols-[3fr_2.5fr_1fr_2.5fr_2fr] text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest pb-2 border-b border-[var(--border)]">
                <span>Splits</span>
                <span className="text-center">{isSwim ? "Pace/100m" : "Pace"}</span>
                <span className="text-center">Zone</span>
                <span className="text-center">Time</span>
                <span className="text-right">HR</span>
              </div>

              <div className="divide-y divide-[var(--border)]">
                {activity.laps.map((lap) => {
                  const zone = lap.zone || 2;
                  const zoneColor = ZONE_COLORS[zone];
                  const isFastest = fastestLap?.lapIndex === lap.lapIndex;
                  const lapPaceDisplay = lap.avgPace
                    ? isSwim
                      ? formatPace100m(lap.avgPace)
                      : isCycle
                        ? `${formatSpeed(1 / lap.avgPace)} km/h`
                        : formatPace(lap.avgPace)
                    : "—";
                  return (
                    <div
                      key={lap.lapIndex}
                      className="grid grid-cols-[3fr_2.5fr_1fr_2.5fr_2fr] items-center py-4 text-sm"
                    >
                      <span className="font-medium text-white flex items-center gap-1.5">
                        {lapDistanceLabel(lap.distance)}
                        {isFastest && activity.laps.length > 2 && (
                          <Badge variant="accent">FAST</Badge>
                        )}
                      </span>
                      <span className="text-center font-semibold text-white">
                        {lapPaceDisplay}
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
              <div className="flex items-center justify-between py-4 border-t border-[var(--border)] text-xs mt-1">
                <span className="font-bold text-[var(--text-3)] uppercase tracking-widest text-[9px]">
                  Heart Rate
                </span>
                <span className="text-[var(--text-2)]">
                  {activity.avgHeartRate} ~ {activity.maxHeartRate} BPM
                </span>
                <span className="font-bold text-white">
                  {activity.avgHeartRate} BPM AVG
                </span>
              </div>
            </>
          ) : (
            /* No laps — show placeholder + sync button */
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-2xl">📊</p>
              <p className="text-sm font-semibold text-[var(--text-2)]">No split data yet</p>
              <p className="text-xs text-[var(--text-3)] max-w-[200px]">
                Splits are fetched when you sync. Tap below to load them now.
              </p>
              {activity.garminId && (
                <SyncLapsButton activityId={activity.id} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Strength / HIIT — summary rows */}
      {!isEndurance && (
        <div className="px-5 space-y-5 flex-1">
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
            Summary
          </p>
          <div className="space-y-1">
            {[
              { label: "Duration", value: formatDuration(activity.duration) },
              { label: "Calories", value: activity.calories ? `${activity.calories.toLocaleString()} kcal` : "—" },
              { label: "Avg Heart Rate", value: activity.avgHeartRate ? `${activity.avgHeartRate} bpm` : "—" },
              { label: "Max Heart Rate", value: activity.maxHeartRate ? `${activity.maxHeartRate} bpm` : "—" },
              { label: "Elevation Gain", value: activity.elevGain ? `+${Math.round(activity.elevGain)} m` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-4 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-2)]">{label}</span>
                <span className="text-sm font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share bar — fixed at bottom */}
      <div className="sticky bottom-0 px-5 pb-10 pt-5 bg-[var(--bg)] border-t border-[var(--border)]">
        <div className="flex gap-3">
          <Link href={`/share/${activity.id}`} className="flex-1">
            <Button variant="accent" size="lg" fullWidth>
              <Share2 size={15} />
              Share This {isRun ? "Run" : isSwim ? "Swim" : isCycle ? "Ride" : "Workout"}
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
    <div className="px-4 first:pl-0">
      <p className="text-[18px] font-bold text-white leading-tight">{value}</p>
      <p className="text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-widest mt-1.5">
        {label}
      </p>
    </div>
  );
}
