"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { ConfirmSheet } from "./ConfirmSheet";
import type { WorkoutPlan, WorkoutWeek, WorkoutDay, WorkoutEntry } from "@prisma/client";

type PlanWithWeeks = WorkoutPlan & {
  weeks: (WorkoutWeek & {
    days: (WorkoutDay & { entries: WorkoutEntry[] })[];
  })[];
};

interface Props {
  plan: PlanWithWeeks;
  variant: "active" | "draft" | "archived";
  onDeleted?: (id: string) => void;
}

function totalDays(plan: PlanWithWeeks) {
  return plan.weeks.reduce((s, w) => s + w.days.length, 0);
}
function completedDays(plan: PlanWithWeeks) {
  return plan.weeks.reduce(
    (s, w) => s + w.days.filter((d) => d.status === "COMPLETED").length,
    0
  );
}

export function PlanCard({ plan, variant, onDeleted }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const total = totalDays(plan);
  const done = completedDays(plan);
  const progress = total > 0 ? done / total : 0;
  const weeks = plan.weeks.length;

  const ACCENT =
    variant === "active" ? "var(--accent)" : variant === "draft" ? "var(--text-3)" : "#555";

  const BADGE =
    variant === "active"
      ? { bg: "rgba(204,255,0,0.12)", color: "var(--accent)", label: "ACTIVE" }
      : variant === "draft"
      ? { bg: "rgba(255,255,255,0.06)", color: "var(--text-2)", label: "DRAFT" }
      : { bg: "rgba(255,255,255,0.04)", color: "var(--text-3)", label: "ARCHIVED" };

  async function deletePlan() {
    setDeleting(true);
    const res = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
    if (res.ok) {
      setConfirm(false);
      onDeleted?.(plan.id);
      router.refresh();
    }
    setDeleting(false);
  }

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface-1)",
          borderTop: `2px solid ${ACCENT}`,
          opacity: variant === "archived" ? 0.6 : 1,
        }}
      >
        <Link href={`/plans/${plan.id}`} className="block p-4 space-y-3">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-white text-base leading-tight flex-1">{plan.title}</p>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: BADGE.bg, color: BADGE.color }}
              >
                {BADGE.label}
              </span>
              <button
                onClick={(e) => { e.preventDefault(); setConfirm(true); }}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--surface-2)] transition-colors"
              >
                <MoreHorizontal size={15} className="text-[var(--text-3)]" />
              </button>
            </div>
          </div>

          {plan.description && (
            <p className="text-xs text-[var(--text-3)] leading-relaxed line-clamp-2">
              {plan.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-[var(--text-3)]">
            <span>{weeks} {weeks === 1 ? "week" : "weeks"}</span>
            {total > 0 && <span>{done}/{total} days done</span>}
            {plan.startDate && (
              <span>
                {new Date(plan.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>

          {variant === "active" && total > 0 && (
            <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: "var(--surface-3)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.round(progress * 100)}%`, background: ACCENT }}
              />
            </div>
          )}
        </Link>
      </div>

      {confirm && (
        <ConfirmSheet
          title="Delete Plan"
          message={`Delete "${plan.title}"? This will remove all weeks, days, and workouts. This cannot be undone.`}
          onConfirm={deletePlan}
          onCancel={() => setConfirm(false)}
          loading={deleting}
        />
      )}
    </>
  );
}
