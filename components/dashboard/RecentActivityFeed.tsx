"use client";
import Link from "next/link";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { getHRZone } from "@/lib/utils";

interface Act {
  id: string;
  name: string;
  type: string;
  startTime: string; // ISO
  duration: number;
  distance: number | null;
  avgHeartRate: number | null;
  avgPace: number | null;
  elevGain: number | null;
  calories: number | null;
}

/**
 * iOS-parity recent feed: only the last 2 calendar days (grouped under
 * Today / Yesterday in the viewer's LOCAL timezone), falling back to the
 * 3 most recent activities when those days are empty. Full history lives
 * on the Activities tab.
 */
export function RecentActivityFeed({ activities }: { activities: Act[] }) {
  const now = new Date();
  const isSameDay = (d: Date, ref: Date) =>
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const today = activities.filter((a) => isSameDay(new Date(a.startTime), now));
  const yday  = activities.filter((a) => isSameDay(new Date(a.startTime), yesterday));
  const fallback = today.length === 0 && yday.length === 0 ? activities.slice(0, 3) : [];

  const renderCards = (list: Act[]) =>
    list.map((act) => (
      <ActivityCard
        key={act.id}
        id={act.id}
        name={act.name}
        type={act.type}
        startTime={new Date(act.startTime)}
        duration={act.duration}
        distance={act.distance}
        avgHeartRate={act.avgHeartRate}
        avgPace={act.avgPace}
        elevGain={act.elevGain}
        calories={act.calories}
        zone={act.avgHeartRate ? getHRZone(act.avgHeartRate) : 2}
      />
    ));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white">Recent Activity</h2>
        <Link href="/activity" className="text-xs text-[var(--text-2)] hover:text-white transition-colors">
          See all →
        </Link>
      </div>

      {today.length > 0 && (
        <>
          <p className="text-[10px] font-bold tracking-[0.1em] text-[var(--text-3)]">TODAY</p>
          <div className="space-y-3">{renderCards(today)}</div>
        </>
      )}
      {yday.length > 0 && (
        <>
          <p className="text-[10px] font-bold tracking-[0.1em] text-[var(--text-3)]">YESTERDAY</p>
          <div className="space-y-3">{renderCards(yday)}</div>
        </>
      )}
      {fallback.length > 0 && <div className="space-y-3">{renderCards(fallback)}</div>}
    </div>
  );
}
