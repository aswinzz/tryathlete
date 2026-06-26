"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Map, ListOrdered, Activity, Check, X } from "lucide-react";

type StepState = "idle" | "loading" | "done" | "failed";

interface Props {
  activityId: string;
  needsRoute: boolean;
  needsLaps: boolean;
  needsHR: boolean;
}

export function LoadDetailsButton({ activityId, needsRoute, needsLaps, needsHR }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [routeState, setRouteState] = useState<StepState>("idle");
  const [lapsState, setLapsState]   = useState<StepState>("idle");
  const [hrState, setHrState]       = useState<StepState>("idle");

  const started = running || routeState !== "idle" || lapsState !== "idle" || hrState !== "idle";

  async function loadAll() {
    if (running) return;
    setRunning(true);

    // route-sync fetches both GPS and HR — show both steps while it runs
    if (needsRoute || needsHR) setRouteState("loading");
    if (needsHR)               setHrState("loading");
    if (needsLaps)             setLapsState("loading");

    await Promise.allSettled([
      // route-sync handles GPS + HR in one call; response carries hrSynced
      (needsRoute || needsHR) &&
        fetch(`/api/activities/${activityId}/route-sync`, { method: "POST" })
          .then(async (r) => {
            if (!r.ok) {
              setRouteState(needsRoute ? "failed" : "idle");
              if (needsHR) setHrState("failed");
              return;
            }
            const data = await r.json();
            setRouteState(data.routePoints ? "done" : needsRoute ? "failed" : "idle");
            if (needsHR) setHrState(data.hrSynced ? "done" : "failed");
          })
          .catch(() => {
            if (needsRoute) setRouteState("failed");
            if (needsHR)    setHrState("failed");
          }),

      needsLaps &&
        fetch(`/api/garmin/sync-laps/${activityId}`, { method: "POST" })
          .then((r) => setLapsState(r.ok ? "done" : "failed"))
          .catch(() => setLapsState("failed")),
    ]);

    setRunning(false);
    router.refresh();
  }

  return (
    <div className="mx-5 mb-6">
      {!started ? (
        <button
          onClick={loadAll}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-opacity active:opacity-70"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border)", color: "var(--text-2)" }}
        >
          <span className="text-base">⬇</span>
          Load Details
        </button>
      ) : (
        <div
          className="w-full px-5 py-4 rounded-2xl space-y-3"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
        >
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
            Loading details
          </p>
          <div className="space-y-2.5">
            {needsRoute && (
              <StepRow icon={<Map size={13} />} label="GPS Route" state={routeState} />
            )}
            {needsLaps && (
              <StepRow icon={<ListOrdered size={13} />} label="Splits" state={lapsState} />
            )}
            {needsHR && (
              <StepRow icon={<Activity size={13} />} label="Heart Rate Zones" state={hrState} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepRow({ icon, label, state }: { icon: React.ReactNode; label: string; state: StepState }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[var(--text-3)]">{icon}</span>
      <span className="text-sm text-[var(--text-2)] flex-1">{label}</span>
      {state === "loading" && <Loader2 size={14} className="animate-spin text-[var(--accent)]" />}
      {state === "done"    && <Check  size={14} className="text-[var(--accent)]" />}
      {state === "failed"  && <X      size={14} className="text-red-400" />}
    </div>
  );
}
