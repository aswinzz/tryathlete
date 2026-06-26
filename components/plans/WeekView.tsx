"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import type { WorkoutPlan, WorkoutWeek, WorkoutDay, WorkoutEntry } from "@prisma/client";
import { ConfirmSheet } from "./ConfirmSheet";

type DayWithEntries = WorkoutDay & { entries: WorkoutEntry[] };
type WeekWithDays = WorkoutWeek & { days: DayWithEntries[] };
type PlanFull = WorkoutPlan & { weeks: WeekWithDays[] };

const DAY_LABELS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LABELS_FULL  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const WEEK_TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  REGULAR:  { label: "Regular Week",  color: "#aaa",    bg: "rgba(255,255,255,0.06)" },
  PEAK:     { label: "Peak Week",     color: "#ff6b6b", bg: "rgba(255,107,107,0.12)" },
  TAPER:    { label: "Taper Week",    color: "#ffd700", bg: "rgba(255,215,0,0.12)"   },
  RECOVERY: { label: "Recovery Week", color: "#7ed3f4", bg: "rgba(126,211,244,0.12)" },
  DELOAD:   { label: "Deload Week",   color: "#a8e6cf", bg: "rgba(168,230,207,0.12)" },
};

const DAY_TYPE_COLOR: Record<string, string> = {
  REGULAR:  "var(--text-2)",
  RACE:     "#ffd700",
  REST:     "var(--text-3)",
  RECOVERY: "#7ed3f4",
};

function isToday(day: WorkoutDay, plan: PlanFull, week: WeekWithDays): boolean {
  if (!plan.startDate) return false;
  const start = new Date(plan.startDate);
  const dayOffset = (week.weekNumber - 1) * 7 + (day.dayOfWeek - 1);
  const dayDate = new Date(start);
  dayDate.setDate(dayDate.getDate() + dayOffset);
  const now = new Date();
  return (
    dayDate.getFullYear() === now.getFullYear() &&
    dayDate.getMonth() === now.getMonth() &&
    dayDate.getDate() === now.getDate()
  );
}

export function WeekView({ plan: initialPlan, currentWeekNumber }: { plan: PlanFull; currentWeekNumber: number }) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [weekNum, setWeekNum] = useState(currentWeekNumber);
  const [activeDay, setActiveDay] = useState<number | null>(null); // covers both create + navigate
  const [addingWeek, setAddingWeek] = useState(false);
  const [confirmDeleteWeek, setConfirmDeleteWeek] = useState(false);
  const [deletingWeek, setDeletingWeek] = useState(false);

  const totalWeeks = plan.weeks.length;
  const week = plan.weeks.find((w) => w.weekNumber === weekNum);
  const badge = week ? WEEK_TYPE_BADGE[week.type] : null;

  function navigate(n: number) {
    const next = weekNum + n;
    if (next < 1) return;
    setWeekNum(next);
    router.replace(`/plans/${plan.id}?week=${next}`, { scroll: false });
  }

  async function addWeek() {
    setAddingWeek(true);
    const nextNum = totalWeeks + 1;
    const res = await fetch(`/api/plans/${plan.id}/weeks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekNumber: nextNum, type: "REGULAR" }),
    });
    if (res.ok) {
      const newWeek: WeekWithDays = { ...(await res.json()), days: [] };
      setPlan((p) => ({ ...p, weeks: [...p.weeks, newWeek] }));
      setWeekNum(nextNum);
      router.replace(`/plans/${plan.id}?week=${nextNum}`, { scroll: false });
    }
    setAddingWeek(false);
  }

  async function deleteWeek() {
    if (!week) return;
    setDeletingWeek(true);
    const res = await fetch(`/api/plans/${plan.id}/weeks/${week.id}`, { method: "DELETE" });
    if (res.ok) {
      const remaining = plan.weeks.filter((w) => w.id !== week.id);
      setPlan((p) => ({ ...p, weeks: remaining }));
      const prevNum = remaining.length > 0 ? Math.min(weekNum, remaining[remaining.length - 1].weekNumber) : 0;
      setConfirmDeleteWeek(false);
      if (remaining.length === 0) {
        setWeekNum(1);
      } else {
        setWeekNum(prevNum);
        router.replace(`/plans/${plan.id}?week=${prevNum}`, { scroll: false });
      }
    }
    setDeletingWeek(false);
  }

  async function openOrCreateDay(dow: number) {
    if (!week || activeDay !== null) return;
    setActiveDay(dow);
    const existing = week.days.find((d) => d.dayOfWeek === dow);
    if (existing) {
      router.push(`/plans/${plan.id}/day/${week.weekNumber}/${dow}`);
      // leave activeDay set — we're navigating away
      return;
    }
    const res = await fetch(
      `/api/plans/${plan.id}/weeks/${week.id}/days`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayOfWeek: dow, type: "REGULAR" }),
      }
    );
    if (res.ok) {
      router.push(`/plans/${plan.id}/day/${week.weekNumber}/${dow}`);
    } else {
      setActiveDay(null);
    }
  }

  return (
    <div className="flex flex-col min-h-dvh pb-28">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 pt-14 pb-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/plans" className="flex items-center gap-2 text-[var(--text-2)]">
          <ArrowLeft size={18} />
          <span className="text-sm">Plans</span>
        </Link>
        <p className="font-bold text-white text-base truncate max-w-[180px]">{plan.title}</p>
        {week && (
          <button
            onClick={() => setConfirmDeleteWeek(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--surface-2)] transition-colors"
          >
            <Trash2 size={16} className="text-[var(--text-3)]" />
          </button>
        )}
        {!week && <div className="w-9" />}
      </div>

      {/* Week navigator */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            disabled={weekNum <= 1}
            className="w-9 h-9 flex items-center justify-center rounded-full disabled:opacity-30"
            style={{ background: "var(--surface-2)" }}
          >
            <ChevronLeft size={18} className="text-white" />
          </button>

          <div className="text-center space-y-1">
            <p className="text-white font-bold text-lg">Week {weekNum}</p>
            {badge && (
              <span
                className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.label.toUpperCase()}
              </span>
            )}
          </div>

          <button
            onClick={() => navigate(1)}
            disabled={weekNum >= totalWeeks}
            className="w-9 h-9 flex items-center justify-center rounded-full disabled:opacity-30"
            style={{ background: "var(--surface-2)" }}
          >
            <ChevronRight size={18} className="text-white" />
          </button>
        </div>

        {/* 7-day mini strip */}
        {week && (
          <div className="flex gap-1 justify-between">
            {Array.from({ length: 7 }, (_, i) => i + 1).map((dow) => {
              const day = week.days.find((d) => d.dayOfWeek === dow);
              const isRace = day?.type === "RACE";
              const isRest = day?.type === "REST";
              const isDone = day?.status === "COMPLETED";
              const today = day ? isToday(day, plan, week) : false;
              const isActive = activeDay === dow;
              return (
                <button
                  key={dow}
                  onClick={() => openOrCreateDay(dow)}
                  disabled={activeDay !== null}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-opacity disabled:opacity-60"
                  style={{
                    background: today ? "rgba(204,255,0,0.1)" : isRace ? "rgba(255,215,0,0.1)" : "var(--surface-1)",
                    border: today ? "1px solid var(--accent)" : "1px solid transparent",
                  }}
                >
                  <span style={{ color: today ? "var(--accent)" : isRace ? "#ffd700" : "var(--text-3)", fontWeight: 600 }}>
                    {DAY_LABELS_SHORT[dow - 1]}
                  </span>
                  <span style={{ fontSize: 14 }}>
                    {isActive
                      ? <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
                      : isRace ? "🏆" : isRest ? "😴" : isDone ? "✅" : day ? "⚡" : "·"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* No plan weeks yet */}
      {totalWeeks === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 px-5 text-center">
          <span className="text-4xl">📅</span>
          <p className="font-semibold text-[var(--text-2)]">No weeks yet</p>
          <p className="text-sm text-[var(--text-3)]">Add your first week to start building your plan</p>
          <button
            onClick={addWeek}
            disabled={addingWeek}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            {addingWeek ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} strokeWidth={2.5} />}
            {addingWeek ? "Adding…" : "Add Week 1"}
          </button>
        </div>
      )}

      {/* Week exists — show all 7 days */}
      {week && (
        <div className="px-5 space-y-2 flex-1">
          {Array.from({ length: 7 }, (_, i) => i + 1).map((dow) => {
            const day = week.days.find((d) => d.dayOfWeek === dow);
            const today = day ? isToday(day, plan, week) : false;
            const isRace = day?.type === "RACE";
            const isRest = day?.type === "REST";
            const isDone = day?.status === "COMPLETED";
            const isActive = activeDay === dow;
            const isEmpty = !day;

            return (
              <button
                key={dow}
                onClick={() => openOrCreateDay(dow)}
                disabled={activeDay !== null}
                className="w-full text-left p-4 rounded-2xl space-y-2 transition-opacity disabled:opacity-60"
                style={{
                  background: isRace ? "rgba(255,215,0,0.07)" : "var(--surface-1)",
                  border: today
                    ? "1px solid var(--accent)"
                    : isRace
                    ? "1px solid rgba(255,215,0,0.3)"
                    : isEmpty
                    ? "1px dashed var(--border)"
                    : "1px solid transparent",
                  opacity: isEmpty && activeDay === null ? 0.6 : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-bold text-sm"
                      style={{ color: isEmpty ? "var(--text-3)" : DAY_TYPE_COLOR[day!.type] }}
                    >
                      {DAY_LABELS_FULL[dow - 1]}
                    </span>
                    {today && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "var(--accent)", color: "#000" }}
                      >
                        TODAY
                      </span>
                    )}
                    {isRace && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(255,215,0,0.2)", color: "#ffd700" }}
                      >
                        RACE DAY
                      </span>
                    )}
                    {isRest && !isEmpty && (
                      <span className="text-[10px] text-[var(--text-3)]">Rest</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isDone && !isActive && <span className="text-xs text-[var(--accent)]">✓ Done</span>}
                    {isActive ? (
                      <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
                    ) : isEmpty ? (
                      <span className="flex items-center gap-1 text-xs text-[var(--text-3)]">
                        <Plus size={12} /> Add
                      </span>
                    ) : (
                      <ChevronRight size={14} className="text-[var(--text-3)]" />
                    )}
                  </div>
                </div>

                {day && day.entries.length > 0 && (
                  <div className="space-y-1">
                    {day.entries.slice(0, 3).map((entry) => (
                      <p key={entry.id} className="text-xs text-[var(--text-2)] truncate">
                        · {entry.title}
                        {entry.durationMin && (
                          <span className="text-[var(--text-3)]"> · {entry.durationMin}min</span>
                        )}
                      </p>
                    ))}
                    {day.entries.length > 3 && (
                      <p className="text-xs text-[var(--text-3)]">+{day.entries.length - 3} more</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {confirmDeleteWeek && week && (
        <ConfirmSheet
          title="Delete Week"
          message={`Delete Week ${week.weekNumber}? All days and workouts in this week will be removed.`}
          onConfirm={deleteWeek}
          onCancel={() => setConfirmDeleteWeek(false)}
          loading={deletingWeek}
        />
      )}

      {/* Add next week button */}
      {totalWeeks > 0 && weekNum === totalWeeks && (
        <div className="px-5 pt-4">
          <button
            onClick={addWeek}
            disabled={addingWeek}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "var(--surface-1)",
              border: "1px dashed var(--border)",
              color: "var(--text-2)",
            }}
          >
            {addingWeek
              ? <Loader2 size={15} className="animate-spin" />
              : <Plus size={15} />}
            {addingWeek ? "Adding…" : `Add Week ${totalWeeks + 1}`}
          </button>
        </div>
      )}
    </div>
  );
}
