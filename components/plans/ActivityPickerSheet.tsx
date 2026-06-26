"use client";
import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { formatPace, formatDistanceKm, formatDurationShort } from "@/lib/utils";

interface ActivityOption {
  id: string;
  name: string;
  type: string;
  startTime: string;
  distance: number | null;
  duration: number;
  avgPace: number | null;
  avgHeartRate: number | null;
  calories: number | null;
}

interface Props {
  dayId: string;
  entryId: string;
  entryTitle: string;
  onClose: () => void;
  onLinked: (link: { id: string; activityId: string; activity: ActivityOption }) => void;
}

export function ActivityPickerSheet({ dayId, entryId, entryTitle, onClose, onLinked }: Props) {
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/plans/reconcile/day/${dayId}/activities`)
      .then((r) => r.json())
      .then((data) => { setActivities(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dayId]);

  async function handleLink(activity: ActivityOption) {
    setLinking(activity.id);
    const res = await fetch(`/api/plans/entries/${entryId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityId: activity.id }),
    });
    if (res.ok) {
      const link = await res.json();
      onLinked({ ...link, activity });
    }
    setLinking(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[480px] rounded-t-2xl pb-[calc(1.5rem+env(safe-area-inset-bottom,0px)+80px)]"
        style={{ background: "var(--surface-1)" }}
      >
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-base">Link Activity</p>
              <p className="text-xs text-[var(--text-3)] mt-0.5">to "{entryTitle}"</p>
            </div>
            <button onClick={onClose}><X size={20} className="text-[var(--text-3)]" /></button>
          </div>

          {loading && (
            <p className="text-sm text-[var(--text-3)] text-center py-8">Loading activities…</p>
          )}

          {!loading && activities.length === 0 && (
            <div className="text-center py-8 space-y-1">
              <p className="text-2xl">🏃</p>
              <p className="text-sm text-[var(--text-3)]">No activities found for this day</p>
              <p className="text-xs text-[var(--text-3)]">Sync your tracker to import activities</p>
            </div>
          )}

          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {activities.map((act) => (
              <button
                key={act.id}
                onClick={() => handleLink(act)}
                disabled={linking === act.id}
                className="w-full text-left p-4 rounded-2xl space-y-1.5 transition-opacity disabled:opacity-50"
                style={{ background: "var(--surface-2)" }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white text-sm truncate flex-1">{act.name}</p>
                  {linking === act.id
                    ? <span className="text-xs text-[var(--text-3)]">Linking…</span>
                    : <Check size={14} className="text-[var(--accent)] opacity-0 group-hover:opacity-100" />
                  }
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-3)]">
                  {act.distance && (
                    <span>{formatDistanceKm(act.distance)}</span>
                  )}
                  <span>{formatDurationShort(act.duration)}</span>
                  {act.avgPace && (
                    <span>{formatPace(act.avgPace)}/km</span>
                  )}
                  {act.avgHeartRate && (
                    <span>{Math.round(act.avgHeartRate)} bpm</span>
                  )}
                  <span className="ml-auto">
                    {new Date(act.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
