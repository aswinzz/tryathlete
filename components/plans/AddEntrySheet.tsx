"use client";
import { useState } from "react";
import { X } from "lucide-react";
import type { WorkoutEntry, EntryType } from "@prisma/client";

const TYPES: { id: EntryType; icon: string; label: string }[] = [
  { id: "RUN",      icon: "🏃", label: "Run"      },
  { id: "CYCLING",  icon: "🚴", label: "Cycling"  },
  { id: "SWIMMING", icon: "🏊", label: "Swimming" },
  { id: "STRENGTH", icon: "🏋️", label: "Strength" },
  { id: "HIIT",     icon: "⚡", label: "HIIT"     },
  { id: "OTHER",    icon: "📋", label: "Other"    },
];

interface Props {
  planId: string;
  weekId: string;
  dayId: string;
  onClose: () => void;
  onAdded: (entry: WorkoutEntry) => void;
}

export function AddEntrySheet({ planId, weekId, dayId, onClose, onAdded }: Props) {
  const [type, setType] = useState<EntryType>("RUN");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setLoading(true);
    const res = await fetch(
      `/api/plans/${planId}/weeks/${weekId}/days/${dayId}/entries`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim() || undefined,
          durationMin: durationMin ? parseInt(durationMin) : undefined,
        }),
      }
    );
    if (res.ok) {
      const entry = await res.json();
      onAdded(entry);
    }
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[480px] rounded-t-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px)+80px)] space-y-5"
        style={{ background: "var(--surface-1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="font-bold text-white text-lg">Add Workout</p>
          <button onClick={onClose}>
            <X size={20} className="text-[var(--text-3)]" />
          </button>
        </div>

        {/* Type chips */}
        <div>
          <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider mb-2">
            Type
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => {
              const active = type === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: active ? "rgba(204,255,0,0.12)" : "var(--surface-2)",
                    border: active ? "1px solid var(--accent)" : "1px solid transparent",
                    color: active ? "var(--accent)" : "var(--text-2)",
                  }}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
            Title
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Easy 5K run, Tempo intervals…"
            className="w-full mt-1 px-4 py-3 rounded-xl text-white text-sm outline-none"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Stations, sets, pace targets, instructions…"
            rows={4}
            className="w-full mt-1 px-4 py-3 rounded-xl text-white text-sm outline-none resize-none leading-relaxed"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
            Duration (minutes, optional)
          </label>
          <input
            type="number"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            placeholder="e.g. 45"
            min={1}
            className="w-full mt-1 px-4 py-3 rounded-xl text-white text-sm outline-none"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!title.trim() || loading}
          className="w-full py-3 rounded-xl font-bold text-sm transition-opacity disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {loading ? "Saving…" : "Save Workout"}
        </button>
      </div>
    </div>
  );
}
