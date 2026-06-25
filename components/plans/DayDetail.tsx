"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Check, Trash2, MoreHorizontal } from "lucide-react";
import type { WorkoutWeek, WorkoutDay, WorkoutEntry } from "@prisma/client";
import { AddEntrySheet } from "./AddEntrySheet";
import { ConfirmSheet } from "./ConfirmSheet";

type DayWithEntries = WorkoutDay & { entries: WorkoutEntry[] };

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ENTRY_TYPE_COLOR: Record<string, string> = {
  RUN:      "var(--accent)",
  CYCLING:  "#7ed3f4",
  SWIMMING: "#4fc3f7",
  STRENGTH: "#ff6b6b",
  HIIT:     "#ff9500",
  OTHER:    "var(--text-3)",
};

const ENTRY_TYPE_ICON: Record<string, string> = {
  RUN:      "🏃",
  CYCLING:  "🚴",
  SWIMMING: "🏊",
  STRENGTH: "🏋️",
  HIIT:     "⚡",
  OTHER:    "📋",
};

interface Props {
  planId: string;
  planTitle: string;
  week: WorkoutWeek;
  day: DayWithEntries;
}

export function DayDetail({ planId, planTitle, week, day: initialDay }: Props) {
  const router = useRouter();
  const [day, setDay] = useState(initialDay);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingDay, setDeletingDay] = useState(false);

  const isRace = day.type === "RACE";
  const isRest = day.type === "REST";
  const isDone = day.status === "COMPLETED";
  const dayLabel = DAY_LABELS[day.dayOfWeek - 1];

  async function markAsDone() {
    setMarkingDone(true);
    const res = await fetch(
      `/api/plans/${planId}/weeks/${week.id}/days/${day.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      }
    );
    if (res.ok) {
      const updated = await res.json();
      setDay({ ...day, status: updated.status, completedAt: updated.completedAt });
    }
    setMarkingDone(false);
  }

  async function deleteEntry(entryId: string) {
    await fetch(
      `/api/plans/${planId}/weeks/${week.id}/days/${day.id}/entries/${entryId}`,
      { method: "DELETE" }
    );
    setDay({ ...day, entries: day.entries.filter((e) => e.id !== entryId) });
  }

  async function deleteDay() {
    setDeletingDay(true);
    const res = await fetch(
      `/api/plans/${planId}/weeks/${week.id}/days/${day.id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      router.push(`/plans/${planId}?week=${week.weekNumber}`);
    }
    setDeletingDay(false);
  }

  function onEntryAdded(entry: WorkoutEntry) {
    setDay({ ...day, entries: [...day.entries, entry] });
    setShowAddEntry(false);
  }

  return (
    <div className="flex flex-col min-h-dvh pb-28">
      {/* Race day banner */}
      {isRace && (
        <div
          className="w-full flex flex-col items-center justify-center py-8 gap-2"
          style={{
            background: "linear-gradient(180deg, rgba(255,215,0,0.15) 0%, transparent 100%)",
            borderBottom: "2px solid rgba(255,215,0,0.4)",
          }}
        >
          <span className="text-4xl">🏆</span>
          <p className="text-xl font-bold" style={{ color: "#ffd700" }}>
            RACE DAY
          </p>
          <p className="text-xs text-[var(--text-3)]">Week {week.weekNumber} · {dayLabel}</p>
        </div>
      )}

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 pt-14 pb-4"
        style={{ borderBottom: isRace ? "none" : "1px solid var(--border)" }}
      >
        <Link
          href={`/plans/${planId}?week=${week.weekNumber}`}
          className="flex items-center gap-2 text-[var(--text-2)]"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Week {week.weekNumber}</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="font-bold text-white text-base">{dayLabel}</p>
            {isRace && (
              <p className="text-xs" style={{ color: "#ffd700" }}>Race Day</p>
            )}
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--surface-2)] transition-colors"
          >
            <Trash2 size={16} className="text-[var(--text-3)]" />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4 flex-1">
        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {isDone && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ background: "rgba(204,255,0,0.12)", color: "var(--accent)" }}
            >
              <Check size={11} strokeWidth={3} /> Completed
            </span>
          )}
          {week.type !== "REGULAR" && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: week.type === "TAPER" ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.06)",
                color: week.type === "TAPER" ? "#ffd700" : "var(--text-2)",
              }}
            >
              {week.type} WEEK
            </span>
          )}
        </div>

        {/* Coach notes */}
        {day.coachNotes && (
          <div
            className="p-4 rounded-xl space-y-1"
            style={{ background: "var(--surface-1)", borderLeft: "3px solid var(--accent)" }}
          >
            <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
              Coach Notes
            </p>
            <p className="text-sm text-[var(--text-2)] leading-relaxed">{day.coachNotes}</p>
          </div>
        )}

        {/* Rest day */}
        {isRest ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="text-5xl">😴</span>
            <p className="font-semibold text-[var(--text-2)]">Rest Day</p>
            <p className="text-sm text-[var(--text-3)]">Recovery is part of the plan.</p>
          </div>
        ) : (
          <>
            {/* Entries */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">
                  Workouts
                </p>
                <button
                  onClick={() => setShowAddEntry(true)}
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  <Plus size={13} strokeWidth={2.5} /> Add
                </button>
              </div>

              {day.entries.length === 0 ? (
                <button
                  onClick={() => setShowAddEntry(true)}
                  className="w-full flex flex-col items-center gap-2 py-10 rounded-2xl"
                  style={{
                    background: "var(--surface-1)",
                    border: "1px dashed var(--border)",
                  }}
                >
                  <Plus size={24} className="text-[var(--text-3)]" />
                  <p className="text-sm text-[var(--text-3)]">Add a workout</p>
                </button>
              ) : (
                day.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-4 rounded-2xl"
                    style={{
                      background: "var(--surface-1)",
                      borderLeft: `3px solid ${isRace ? "#ffd700" : ENTRY_TYPE_COLOR[entry.type]}`,
                    }}
                  >
                    <span className="text-xl mt-0.5">{ENTRY_TYPE_ICON[entry.type]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-white truncate">{entry.title}</p>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="ml-2 shrink-0 text-[var(--text-3)] hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {entry.durationMin && (
                        <p className="text-xs text-[var(--text-3)] mt-0.5">
                          {entry.durationMin} min
                        </p>
                      )}
                      {entry.description && (
                        <p className="text-xs text-[var(--text-2)] mt-1.5 leading-relaxed whitespace-pre-wrap">
                          {entry.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom action */}
      {!isDone && (
        <div className="px-5 pb-6">
          <button
            onClick={markAsDone}
            disabled={markingDone}
            className="w-full py-4 rounded-2xl font-bold text-sm transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: isRace ? "#ffd700" : "var(--accent)",
              color: "#000",
            }}
          >
            <Check size={16} strokeWidth={3} />
            {markingDone ? "Saving…" : isRace ? "Mark Race as Completed" : "Mark as Done"}
          </button>
        </div>
      )}

      {confirmDelete && (
        <ConfirmSheet
          title="Delete Day"
          message={`Delete ${dayLabel}? All workouts added to this day will be removed.`}
          onConfirm={deleteDay}
          onCancel={() => setConfirmDelete(false)}
          loading={deletingDay}
        />
      )}

      {showAddEntry && (
        <AddEntrySheet
          planId={planId}
          weekId={week.id}
          dayId={day.id}
          onClose={() => setShowAddEntry(false)}
          onAdded={onEntryAdded}
        />
      )}
    </div>
  );
}
