"use client";
import { useState } from "react";
import { Plus, Check, Trash2, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExerciseSet {
  id: string;
  setIndex: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  orderIndex: number;
  targetSets: number | null;
  targetReps: string | null;
  targetWeightKg: number | null;
  targetRpe: number | null;
  restSec: number | null;
  notes: string | null;
  sets: ExerciseSet[];
}

export type ExerciseScope =
  | { kind: "entry"; id: string }
  | { kind: "activity"; id: string };

function basePath(scope: ExerciseScope): string {
  return scope.kind === "entry"
    ? `/api/plans/entries/${scope.id}/exercises`
    : `/api/activities/${scope.id}/exercises`;
}

function fmtWeight(w: number): string {
  return w % 1 === 0 ? String(w) : w.toFixed(1);
}

function targetSummary(ex: Exercise): string {
  const parts: string[] = [];
  if (ex.targetSets && ex.targetReps) parts.push(`${ex.targetSets}×${ex.targetReps}`);
  else if (ex.targetSets) parts.push(`${ex.targetSets} sets`);
  else if (ex.targetReps) parts.push(`${ex.targetReps} reps`);
  if (ex.targetWeightKg != null) parts.push(`@ ${fmtWeight(ex.targetWeightKg)}kg`);
  if (ex.targetRpe != null) parts.push(`RPE ${ex.targetRpe}`);
  return parts.join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  scope: ExerciseScope;
  initialExercises: Exercise[];
  /** Render the section (with the Add button) even when there are no exercises */
  showWhenEmpty?: boolean;
}

export function ExercisesSection({ scope, initialExercises, showWhenEmpty = false }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { reps: string; weight: string }>>({});
  const [extraRows, setExtraRows] = useState<Record<string, number>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingExId, setDeletingExId] = useState<string | null>(null);

  // Add-exercise form
  const [addName, setAddName] = useState("");
  const [addSets, setAddSets] = useState("");
  const [addReps, setAddReps] = useState("");
  const [addWeight, setAddWeight] = useState("");
  const [adding, setAdding] = useState(false);

  if (!showWhenEmpty && exercises.length === 0) return null;

  async function refresh() {
    const res = await fetch(basePath(scope));
    if (res.ok) setExercises(await res.json());
  }

  async function addExercise() {
    if (!addName.trim()) return;
    setAdding(true);
    const res = await fetch(basePath(scope), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addName.trim(),
        targetSets: addSets ? Number(addSets) : undefined,
        targetReps: addReps.trim() || undefined,
        targetWeightKg: addWeight ? Number(addWeight.replace(",", ".")) : undefined,
      }),
    });
    setAdding(false);
    if (res.ok) {
      setAddName(""); setAddSets(""); setAddReps(""); setAddWeight("");
      setShowAdd(false);
      await refresh();
    }
  }

  async function deleteExercise(exId: string) {
    setDeletingExId(exId);
    await fetch(`${basePath(scope)}/${exId}`, { method: "DELETE" });
    setDeletingExId(null);
    setExercises((list) => list.filter((e) => e.id !== exId));
  }

  function draftFor(ex: Exercise, i: number): { reps: string; weight: string } {
    const key = `${ex.id}:${i}`;
    if (drafts[key]) return drafts[key];
    const logged = ex.sets.find((s) => s.setIndex === i);
    const defaultReps = ex.targetReps?.match(/\d+/)?.[0] ?? "";
    return {
      reps: logged?.reps != null ? String(logged.reps) : defaultReps,
      weight: logged?.weightKg != null ? fmtWeight(logged.weightKg)
        : ex.targetWeightKg != null ? fmtWeight(ex.targetWeightKg) : "",
    };
  }

  function setDraft(ex: Exercise, i: number, field: "reps" | "weight", value: string) {
    const key = `${ex.id}:${i}`;
    setDrafts((d) => ({ ...d, [key]: { ...draftFor(ex, i), [field]: value } }));
  }

  async function saveSet(ex: Exercise, i: number) {
    const key = `${ex.id}:${i}`;
    const d = draftFor(ex, i);
    setSavingKey(key);
    const res = await fetch(`${basePath(scope)}/${ex.id}/sets`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setIndex: i,
        reps: d.reps ? Number(d.reps) : null,
        weightKg: d.weight ? Number(d.weight.replace(",", ".")) : null,
      }),
    });
    setSavingKey(null);
    if (res.ok) await refresh();
  }

  async function deleteSet(ex: Exercise, i: number) {
    const key = `${ex.id}:${i}`;
    setSavingKey(key);
    await fetch(`${basePath(scope)}/${ex.id}/sets`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setIndex: i }),
    });
    setSavingKey(null);
    await refresh();
  }

  function rowCount(ex: Exercise): number {
    const maxLogged = ex.sets.reduce((m, s) => Math.max(m, s.setIndex), 0);
    return Math.max(ex.targetSets ?? 0, maxLogged, 1) + (extraRows[ex.id] ?? 0);
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.15em] text-[var(--text-3)]">EXERCISES</p>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)]"
        >
          {showAdd ? <X size={11} /> : <Plus size={11} />}
          {showAdd ? "Cancel" : "Add"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: "var(--surface-2)" }}>
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="Exercise name — e.g. Back Squat"
            className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none text-[var(--text-1)] placeholder:text-[var(--text-3)]"
            style={{ background: "var(--surface-3)" }}
          />
          <div className="flex gap-2">
            <input value={addSets} onChange={(e) => setAddSets(e.target.value)} placeholder="Sets"
              className="w-16 px-2 py-2 rounded-lg text-sm text-center outline-none text-[var(--text-1)] placeholder:text-[var(--text-3)]"
              style={{ background: "var(--surface-3)" }} />
            <input value={addReps} onChange={(e) => setAddReps(e.target.value)} placeholder="Reps (8-10)"
              className="w-24 px-2 py-2 rounded-lg text-sm text-center outline-none text-[var(--text-1)] placeholder:text-[var(--text-3)]"
              style={{ background: "var(--surface-3)" }} />
            <input value={addWeight} onChange={(e) => setAddWeight(e.target.value)} placeholder="kg"
              className="w-20 px-2 py-2 rounded-lg text-sm text-center outline-none text-[var(--text-1)] placeholder:text-[var(--text-3)]"
              style={{ background: "var(--surface-3)" }} />
            <button
              onClick={addExercise}
              disabled={adding || !addName.trim()}
              className="flex-1 rounded-lg text-xs font-bold disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {adding ? <Loader2 size={13} className="animate-spin mx-auto" /> : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Empty hint */}
      {exercises.length === 0 && !showAdd && (
        <p className="text-xs text-[var(--text-3)] py-2">
          No exercises yet — add what you&apos;re doing and log sets as you go.
        </p>
      )}

      {/* Exercise list */}
      {exercises.map((ex) => {
        const isOpen = expandedId === ex.id;
        const done = ex.sets.filter((s) => s.completed).length;
        return (
          <div key={ex.id} className="rounded-xl overflow-hidden" style={{ background: "var(--surface-2)" }}>
            {/* Row header */}
            <div className="w-full flex items-center gap-2 px-3 py-2.5">
              <button
                onClick={() => setExpandedId(isOpen ? null : ex.id)}
                className="flex-1 flex items-center gap-2 text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text-1)] truncate">{ex.name}</p>
                  {targetSummary(ex) && (
                    <p className="text-[11px] text-[var(--text-3)]">{targetSummary(ex)}</p>
                  )}
                </div>
                {ex.targetSets ? (
                  <span
                    className="text-[11px] font-mono font-bold"
                    style={{ color: done >= ex.targetSets ? "var(--accent)" : "var(--text-2)" }}
                  >
                    {done}/{ex.targetSets}
                  </span>
                ) : done > 0 ? (
                  <span className="text-[11px] text-[var(--text-2)]">{done} logged</span>
                ) : null}
                {isOpen ? <ChevronUp size={13} className="text-[var(--text-3)]" /> : <ChevronDown size={13} className="text-[var(--text-3)]" />}
              </button>
              <button
                onClick={() => deleteExercise(ex.id)}
                disabled={deletingExId === ex.id}
                title="Delete exercise"
                className="p-1 text-[var(--text-3)] hover:text-[#ff4757] transition-colors"
              >
                {deletingExId === ex.id
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Trash2 size={13} />}
              </button>
            </div>

            {/* Set editor */}
            {isOpen && (
              <div className="px-3 pb-3 space-y-1.5" style={{ borderTop: "1px solid var(--border)" }}>
                {ex.notes && (
                  <p className="text-[11px] text-[var(--text-3)] pt-2">{ex.notes}</p>
                )}
                <div className="pt-2 space-y-1.5">
                  {Array.from({ length: rowCount(ex) }, (_, idx) => idx + 1).map((i) => {
                    const key = `${ex.id}:${i}`;
                    const logged = ex.sets.some((s) => s.setIndex === i && s.completed);
                    const d = draftFor(ex, i);
                    const saving = savingKey === key;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-10 text-[10px] font-mono font-bold text-[var(--text-3)]">SET {i}</span>
                        <input
                          value={d.reps}
                          onChange={(e) => setDraft(ex, i, "reps", e.target.value)}
                          placeholder="reps"
                          className="w-14 px-2 py-1.5 rounded-lg text-sm text-center outline-none text-[var(--text-1)]"
                          style={{ background: "var(--surface-3)" }}
                        />
                        <span className="text-[10px] text-[var(--text-3)]">×</span>
                        <input
                          value={d.weight}
                          onChange={(e) => setDraft(ex, i, "weight", e.target.value)}
                          placeholder="kg"
                          className="w-16 px-2 py-1.5 rounded-lg text-sm text-center outline-none text-[var(--text-1)]"
                          style={{ background: "var(--surface-3)" }}
                        />
                        <span className="text-[10px] text-[var(--text-3)]">kg</span>
                        <div className="flex-1" />
                        {logged && !saving && (
                          <button onClick={() => deleteSet(ex, i)} title="Remove logged set"
                            className="p-1 text-[var(--text-3)] hover:text-[#ff4757] transition-colors">
                            <Trash2 size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => saveSet(ex, i)}
                          disabled={saving}
                          title={logged ? "Update set" : "Log set"}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                          style={{
                            background: logged ? "var(--accent)" : "var(--surface-3)",
                            color: logged ? "#000" : "var(--text-3)",
                          }}
                        >
                          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} strokeWidth={3} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => setExtraRows((m) => ({ ...m, [ex.id]: (m[ex.id] ?? 0) + 1 }))}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] pt-1"
                >
                  <Plus size={11} /> Add set
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
