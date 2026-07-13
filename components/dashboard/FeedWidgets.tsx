"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";

/**
 * Week progress, streak, PRs, and suggested-match banner — powered by the same
 * /api/mobile/feed endpoint the iOS app uses (cookie auth works via getUserId).
 */

interface FeedPlanProgress {
  title: string; weekNumber: number; totalWeeks: number; done: number; planned: number;
}
interface FeedData {
  streakWeeks: number;
  suggestedCount: number;
  week: { runKm: number; rideKm: number; swimKm: number; timeSec: number; plan: FeedPlanProgress | null };
  prs: { label: string; value: string }[];
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function FeedWidgets() {
  const [feed, setFeed] = useState<FeedData | null>(null);

  useEffect(() => {
    fetch("/api/mobile/feed")
      .then((r) => (r.ok ? r.json() : null))
      .then(setFeed)
      .catch(() => {});
  }, []);

  if (!feed) return null;

  const p = feed.week.plan;
  const pct = p && p.planned > 0 ? Math.round((p.done / p.planned) * 100) : null;

  return (
    <div className="space-y-4">
      {/* This Week */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[var(--text-3)]">THIS WEEK</p>
          {p && (
            <span className="text-[11px] text-[var(--text-2)]">
              Week {p.weekNumber} of {p.totalWeeks} · {p.title}
            </span>
          )}
        </div>

        {p && p.planned > 0 && pct !== null && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">{p.done} of {p.planned} workouts done</span>
              <span className="font-bold" style={{ color: "var(--accent)" }}>{pct}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--accent)" }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {[
            { v: `${feed.week.runKm} km`, l: "RUN" },
            { v: `${feed.week.rideKm} km`, l: "RIDE" },
            { v: feed.week.swimKm >= 1 ? `${feed.week.swimKm} km` : `${Math.round(feed.week.swimKm * 1000)} m`, l: "SWIM" },
            { v: fmtTime(feed.week.timeSec), l: "TIME" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-[15px] font-bold text-white leading-tight">{s.v}</p>
              <p className="text-[9px] font-bold tracking-[0.08em] text-[var(--text-3)] mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested matches */}
      {feed.suggestedCount > 0 && (
        <Link href="/plans" className="block">
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.2)", borderLeft: "3px solid #ff9500" }}
          >
            <span className="text-xs font-semibold" style={{ color: "#ff9500" }}>
              {feed.suggestedCount} suggested match{feed.suggestedCount > 1 ? "es" : ""} to review
            </span>
            <span className="text-xs text-[var(--text-2)]">Review →</span>
          </div>
        </Link>
      )}

      {/* PRs */}
      {feed.prs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold tracking-[0.15em] text-[var(--text-3)]">NEW PERSONAL RECORDS</p>
          <div className="flex flex-wrap gap-2">
            {feed.prs.map((pr) => (
              <span
                key={pr.label}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-white"
                style={{ background: "var(--surface-2)" }}
              >
                <Trophy size={11} style={{ color: "var(--accent)" }} />
                {pr.label} — {pr.value}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
