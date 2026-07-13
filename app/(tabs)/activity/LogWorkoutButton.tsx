"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, X } from "lucide-react";

const TYPES = [
  { id: "strength", label: "Strength" },
  { id: "hiit", label: "HIIT" },
  { id: "other", label: "Other" },
];

/**
 * Create a manual workout (no plan or device needed) and jump into it to log
 * exercises. If a watch session syncs later, the log merges into it.
 */
export function LogWorkoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("strength");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || "Workout",
        type,
        durationMin: duration ? Number(duration) : undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const activity = await res.json();
      router.push(`/activity/${activity.id}`);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Log a workout"
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        style={{ background: "var(--surface-2)", color: "var(--accent)" }}
      >
        <Plus size={16} strokeWidth={2.5} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => !saving && setOpen(false)} />
          <div
            className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
            style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white">Log Workout</h2>
              <button onClick={() => !saving && setOpen(false)}>
                <X size={16} className="text-[var(--text-3)]" />
              </button>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold tracking-widest text-[var(--text-3)]">NAME</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gym — Upper Body"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none text-white placeholder:text-[var(--text-3)]"
                style={{ background: "var(--surface-2)" }}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold tracking-widest text-[var(--text-3)]">TYPE</p>
              <div className="flex gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className="px-4 py-2 rounded-full text-xs font-semibold transition-colors"
                    style={{
                      background: type === t.id ? "var(--accent)" : "var(--surface-2)",
                      color: type === t.id ? "#000" : "var(--text-2)",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold tracking-widest text-[var(--text-3)]">DURATION (MIN, OPTIONAL)</p>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45"
                inputMode="numeric"
                className="w-28 px-3 py-2.5 rounded-xl text-sm text-center outline-none text-white placeholder:text-[var(--text-3)]"
                style={{ background: "var(--surface-2)" }}
              />
            </div>

            <p className="text-[11px] text-[var(--text-3)] leading-relaxed">
              Add exercises, sets and weights on the next screen — even mid-workout.
              When your watch session syncs later, this log merges into it automatically.
            </p>

            <button
              onClick={create}
              disabled={saving}
              className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Creating…" : "Create & Log Exercises"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
