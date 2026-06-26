"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { getHRZone } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Activity {
  id: string;
  name: string;
  type: string;
  startTime: Date;
  duration: number;
  distance?: number | null;
  avgHeartRate?: number | null;
  avgPace?: number | null;
  elevGain?: number | null;
  calories?: number | null;
}

interface Props {
  initial: Activity[];
  initialCursor: string | null;
  totalCount: number;
}

export function ActivityList({ initial, initialCursor, totalCount }: Props) {
  const [activities, setActivities] = useState<Activity[]>(initial);
  const [cursor, setCursor]         = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cursor) return; // nothing more to load

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isPending) {
          startTransition(async () => {
            const res  = await fetch(`/api/activities?cursor=${cursor}`);
            const data = await res.json();
            setActivities((prev) => [...prev, ...data.activities]);
            setCursor(data.nextCursor);
          });
        }
      },
      { rootMargin: "200px" }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [cursor, isPending]);

  return (
    <div className="space-y-3">
      {activities.map((act) => {
        const zone = act.avgHeartRate ? getHRZone(act.avgHeartRate) : 2;
        return (
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
            zone={zone}
          />
        );
      })}

      {/* Sentinel — triggers next fetch when visible */}
      {cursor && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {isPending && <Loader2 size={18} className="animate-spin text-[var(--text-3)]" />}
        </div>
      )}

      {/* End of list */}
      {!cursor && activities.length > 0 && (
        <p className="text-center text-xs text-[var(--text-3)] py-6">
          All {totalCount} workouts loaded
        </p>
      )}
    </div>
  );
}
