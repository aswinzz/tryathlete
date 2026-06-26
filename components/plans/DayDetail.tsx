"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Check, Trash2, Link2, X, RefreshCw } from "lucide-react";
import type { WorkoutWeek, WorkoutDay, WorkoutEntry } from "@prisma/client";
import { AddEntrySheet } from "./AddEntrySheet";
import { ConfirmSheet } from "./ConfirmSheet";
import { ActivityPickerSheet } from "./ActivityPickerSheet";
import { formatDistanceKm, formatDurationShort, formatPace } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityLink {
  id: string;
  confidence: number;
  status: "AUTO" | "SUGGESTED" | "MANUAL" | "REJECTED";
  activity: {
    id: string;
    name: string;
    type: string;
    startTime: string;
    distance: number | null;
    duration: number;
    avgPace: number | null;
    avgHeartRate: number | null;
    calories: number | null;
  };
}

interface EntryWithLinks extends WorkoutEntry {
  links: ActivityLink[];
}

type DayWithEntries = WorkoutDay & { entries: EntryWithLinks[] };

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [checkingMatches, setCheckingMatches] = useState(false);
  const [matchResult, setMatchResult] = useState<{ linked: number; suggested: number } | null>(null);
  const [pickerEntry, setPickerEntry] = useState<EntryWithLinks | null>(null);

  const isRace = day.type === "RACE";
  const isRest = day.type === "REST";
  const isDone = day.status === "COMPLETED";
  const dayLabel = DAY_LABELS[day.dayOfWeek - 1];

  // ─── Actions ───────────────────────────────────────────────────────────────

  async function markAsDone() {
    setMarkingDone(true);
    const res = await fetch(`/api/plans/${planId}/weeks/${week.id}/days/${day.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDay((d) => ({ ...d, status: updated.status, completedAt: updated.completedAt }));
    }
    setMarkingDone(false);
  }

  async function deleteDay() {
    setDeletingDay(true);
    const res = await fetch(`/api/plans/${planId}/weeks/${week.id}/days/${day.id}`, { method: "DELETE" });
    if (res.ok) router.push(`/plans/${planId}?week=${week.weekNumber}`);
    setDeletingDay(false);
  }

  async function deleteEntry(entryId: string) {
    await fetch(`/api/plans/${planId}/weeks/${week.id}/days/${day.id}/entries/${entryId}`, { method: "DELETE" });
    setDay((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== entryId) }));
  }

  async function checkMatches() {
    setCheckingMatches(true);
    setMatchResult(null);
    const res = await fetch(`/api/plans/reconcile/day/${day.id}`, { method: "POST" });
    if (res.ok) {
      const result = await res.json();
      setMatchResult(result);
      // Reload entries with fresh link data if anything changed
      if (result.linked > 0 || result.suggested > 0) {
        const entriesRes = await fetch(
          `/api/plans/${planId}/weeks/${week.id}/days/${day.id}/entries`
        );
        if (entriesRes.ok) {
          const entries = await entriesRes.json();
          setDay((d) => ({ ...d, entries }));
        }
      }
    }
    setCheckingMatches(false);
  }

  async function unlinkActivity(entryId: string, linkId: string) {
    await fetch(`/api/plans/entries/${entryId}/links/${linkId}`, { method: "DELETE" });
    setDay((d) => ({
      ...d,
      entries: d.entries.map((e) =>
        e.id === entryId ? { ...e, links: e.links.filter((l) => l.id !== linkId) } : e
      ),
    }));
  }

  async function confirmSuggestedLink(entryId: string, linkId: string) {
    const res = await fetch(`/api/plans/entries/${entryId}/links/${linkId}`, { method: "PATCH" });
    if (res.ok) {
      setDay((d) => ({
        ...d,
        entries: d.entries.map((e) =>
          e.id === entryId
            ? { ...e, links: e.links.map((l) => l.id === linkId ? { ...l, status: "MANUAL" as const } : l) }
            : e
        ),
      }));
    }
  }

  function onEntryAdded(entry: WorkoutEntry) {
    setDay((d) => ({ ...d, entries: [...d.entries, { ...entry, links: [] }] }));
    setShowAddEntry(false);
  }

  function onActivityLinked(entryId: string, link: ActivityLink) {
    setDay((d) => ({
      ...d,
      entries: d.entries.map((e) =>
        e.id === entryId ? { ...e, links: [...e.links.filter((l) => l.id !== link.id), link] } : e
      ),
    }));
    setPickerEntry(null);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

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
          <p className="text-xl font-bold" style={{ color: "#ffd700" }}>RACE DAY</p>
          <p className="text-xs text-[var(--text-3)]">Week {week.weekNumber} · {dayLabel}</p>
        </div>
      )}

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 pt-14 pb-4"
        style={{ borderBottom: isRace ? "none" : "1px solid var(--border)" }}
      >
        <Link href={`/plans/${planId}?week=${week.weekNumber}`} className="flex items-center gap-2 text-[var(--text-2)]">
          <ArrowLeft size={18} />
          <span className="text-sm">Week {week.weekNumber}</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="font-bold text-white text-base">{dayLabel}</p>
            {isRace && <p className="text-xs" style={{ color: "#ffd700" }}>Race Day</p>}
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
            <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
              style={{ background: "rgba(204,255,0,0.12)", color: "var(--accent)" }}>
              <Check size={11} strokeWidth={3} /> Completed
            </span>
          )}
          {week.type !== "REGULAR" && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: week.type === "TAPER" ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.06)",
                color: week.type === "TAPER" ? "#ffd700" : "var(--text-2)",
              }}>
              {week.type} WEEK
            </span>
          )}
        </div>

        {/* Coach notes */}
        {day.coachNotes && (
          <div className="p-4 rounded-xl space-y-1"
            style={{ background: "var(--surface-1)", borderLeft: "3px solid var(--accent)" }}>
            <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">Coach Notes</p>
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
            {/* Workouts header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">Workouts</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={checkMatches}
                  disabled={checkingMatches}
                  className="flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
                  style={{ color: "var(--text-2)" }}
                >
                  <RefreshCw size={12} className={checkingMatches ? "animate-spin" : ""} />
                  {checkingMatches ? "Checking…" : "Check matches"}
                </button>
                <button
                  onClick={() => setShowAddEntry(true)}
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  <Plus size={13} strokeWidth={2.5} /> Add
                </button>
              </div>
            </div>

            {/* Match result toast */}
            {matchResult && (
              <div className="flex items-center justify-between px-4 py-2 rounded-xl text-xs"
                style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
                <span className="text-[var(--text-2)]">
                  {matchResult.linked > 0
                    ? `✓ Linked ${matchResult.linked} activit${matchResult.linked === 1 ? "y" : "ies"}`
                    : matchResult.suggested > 0
                    ? `${matchResult.suggested} suggestion${matchResult.suggested > 1 ? "s" : ""} found`
                    : "No matches found for this day"}
                </span>
                <button onClick={() => setMatchResult(null)}><X size={12} className="text-[var(--text-3)]" /></button>
              </div>
            )}

            {/* Entry list */}
            {day.entries.length === 0 ? (
              <button
                onClick={() => setShowAddEntry(true)}
                className="w-full flex flex-col items-center gap-2 py-10 rounded-2xl"
                style={{ background: "var(--surface-1)", border: "1px dashed var(--border)" }}
              >
                <Plus size={24} className="text-[var(--text-3)]" />
                <p className="text-sm text-[var(--text-3)]">Add a workout</p>
              </button>
            ) : (
              <div className="space-y-3">
                {day.entries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    isRace={isRace}
                    onDelete={() => deleteEntry(entry.id)}
                    onLinkActivity={() => setPickerEntry(entry)}
                    onUnlink={(linkId) => unlinkActivity(entry.id, linkId)}
                    onConfirmSuggested={(linkId) => confirmSuggestedLink(entry.id, linkId)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom action */}
      {!isDone && (
        <div className="px-5 pb-6">
          <button
            onClick={markAsDone}
            disabled={markingDone}
            className="w-full py-4 rounded-2xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: isRace ? "#ffd700" : "var(--accent)", color: "#000" }}
          >
            <Check size={16} strokeWidth={3} />
            {markingDone ? "Saving…" : isRace ? "Mark Race as Completed" : "Mark as Done"}
          </button>
        </div>
      )}

      {/* Sheets */}
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
      {pickerEntry && (
        <ActivityPickerSheet
          dayId={day.id}
          entryId={pickerEntry.id}
          entryTitle={pickerEntry.title}
          onClose={() => setPickerEntry(null)}
          onLinked={(link) => onActivityLinked(pickerEntry.id, link as ActivityLink)}
        />
      )}
    </div>
  );
}

// ─── Entry card with linked activities ───────────────────────────────────────

interface EntryCardProps {
  entry: EntryWithLinks;
  isRace: boolean;
  onDelete: () => void;
  onLinkActivity: () => void;
  onUnlink: (linkId: string) => void;
  onConfirmSuggested: (linkId: string) => void;
}

function EntryCard({ entry, isRace, onDelete, onLinkActivity, onUnlink, onConfirmSuggested }: EntryCardProps) {
  const activeLinks = entry.links.filter((l) => l.status !== "REJECTED");
  const confirmedLinks = activeLinks.filter((l) => l.status === "AUTO" || l.status === "MANUAL");
  const suggestedLinks = activeLinks.filter((l) => l.status === "SUGGESTED");
  const accentColor = isRace ? "#ffd700" : ENTRY_TYPE_COLOR[entry.type];

  return (
    <div
      className="p-4 rounded-2xl space-y-3"
      style={{ background: "var(--surface-1)", borderLeft: `3px solid ${accentColor}` }}
    >
      {/* Entry header */}
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{ENTRY_TYPE_ICON[entry.type]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-white truncate">{entry.title}</p>
            <div className="flex items-center gap-2 ml-2 shrink-0">
              <button onClick={onLinkActivity} title="Link activity"
                className="text-[var(--text-3)] hover:text-[var(--accent)] transition-colors">
                <Link2 size={13} />
              </button>
              <button onClick={onDelete}
                className="text-[var(--text-3)] hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {entry.durationMin && (
            <p className="text-xs text-[var(--text-3)] mt-0.5">{entry.durationMin} min planned</p>
          )}
          {entry.description && (
            <p className="text-xs text-[var(--text-2)] mt-1.5 leading-relaxed whitespace-pre-wrap">
              {entry.description}
            </p>
          )}
        </div>
      </div>

      {/* Confirmed linked activities */}
      {confirmedLinks.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-[var(--border)]">
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wider">Actual</p>
          {confirmedLinks.map((link) => (
            <ActivityChip
              key={link.id}
              link={link}
              entry={entry}
              onUnlink={() => onUnlink(link.id)}
            />
          ))}
        </div>
      )}

      {/* Suggested links */}
      {suggestedLinks.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-[var(--border)]">
          <p className="text-[10px] font-bold tracking-wider" style={{ color: "#ff9500" }}>
            SUGGESTED MATCH
          </p>
          {suggestedLinks.map((link) => (
            <div key={link.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.2)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{link.activity.name}</p>
                <p className="text-[10px] text-[var(--text-3)]">
                  {link.activity.distance ? formatDistanceKm(link.activity.distance) : ""}
                  {link.activity.duration ? ` · ${formatDurationShort(link.activity.duration)}` : ""}
                  {" · "}{Math.round(link.confidence * 100)}% match
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onConfirmSuggested(link.id)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold"
                  style={{ background: "rgba(255,149,0,0.2)", color: "#ff9500" }}
                >
                  Confirm
                </button>
                <button onClick={() => onUnlink(link.id)}
                  className="text-[var(--text-3)] hover:text-red-400 transition-colors ml-1">
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Activity chip (confirmed link) ──────────────────────────────────────────

function ActivityChip({ link, entry, onUnlink }: {
  link: ActivityLink;
  entry: EntryWithLinks;
  onUnlink: () => void;
}) {
  const act = link.activity;
  const plannedDistM = entry.durationMin ? entry.durationMin * 60 : null;

  const distDelta = act.distance && entry.description
    ? computeDelta(act.distance, parsePlannedDist(entry.title, entry.description))
    : null;

  const durDelta = act.duration && entry.durationMin
    ? computeDelta(act.duration, entry.durationMin * 60)
    : null;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: "rgba(204,255,0,0.06)", border: "1px solid rgba(204,255,0,0.15)" }}>
      <Check size={12} strokeWidth={3} className="text-[var(--accent)] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{act.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {act.distance && (
            <span className="text-[10px] text-[var(--text-3)]">
              {formatDistanceKm(act.distance)}
              {distDelta !== null && (
                <span style={{ color: distDelta >= 0 ? "var(--accent)" : "#ff6b6b", marginLeft: 3 }}>
                  {distDelta >= 0 ? "+" : ""}{distDelta.toFixed(1)}%
                </span>
              )}
            </span>
          )}
          {act.duration && (
            <span className="text-[10px] text-[var(--text-3)]">
              {formatDurationShort(act.duration)}
              {durDelta !== null && (
                <span style={{ color: durDelta >= 0 ? "var(--accent)" : "#ff6b6b", marginLeft: 3 }}>
                  {durDelta >= 0 ? "+" : ""}{durDelta.toFixed(0)}%
                </span>
              )}
            </span>
          )}
          {act.avgPace && (
            <span className="text-[10px] text-[var(--text-3)]">{formatPace(act.avgPace)}/km</span>
          )}
          {act.avgHeartRate && (
            <span className="text-[10px] text-[var(--text-3)]">{Math.round(act.avgHeartRate)} bpm</span>
          )}
          {link.status === "AUTO" && (
            <span className="text-[10px] font-bold" style={{ color: "var(--accent)" }}>AUTO</span>
          )}
        </div>
      </div>
      <button onClick={onUnlink} className="text-[var(--text-3)] hover:text-red-400 transition-colors ml-1 shrink-0">
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeDelta(actual: number, planned: number | null): number | null {
  if (!planned) return null;
  return ((actual - planned) / planned) * 100;
}

function parsePlannedDist(title: string, description: string | null): number | null {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  if (text.includes("marathon") && !text.includes("half")) return 42195;
  if (text.includes("half marathon")) return 21097;
  const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*k(?:m|ms|ilom)/);
  if (kmMatch) return parseFloat(kmMatch[1]) * 1000;
  const mMatch = text.match(/(\d+(?:\.\d+)?)\s*m(?:\b|etr)/);
  if (mMatch) return parseFloat(mMatch[1]);
  const bareK = text.match(/(\d+(?:\.\d+)?)\s*k\b/);
  if (bareK) return parseFloat(bareK[1]) * 1000;
  return null;
}
