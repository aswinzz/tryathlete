"use client";
import { useState } from "react";
import { formatDuration, formatPace, formatPace100m, formatSpeed } from "@/lib/utils";

export type TypeTab = "RUNS" | "CYCLING" | "SWIMMING" | "STRENGTH" | "HIIT";

export interface TypeStats {
  count: number;
  totalDistanceM: number;
  totalDurationS: number;
  totalCalories: number;
  avgPaceSpM: number | null;  // seconds/meter (runs & swim)
  avgSpeedMps: number | null; // m/s (cycling)
  avgHeartRate: number | null;
}

export type AllTypeStats = Record<TypeTab, TypeStats>;

const TABS: { id: TypeTab; icon: string; label: string }[] = [
  { id: "RUNS",     icon: "🏃", label: "Runs"     },
  { id: "CYCLING",  icon: "🚴", label: "Cycling"  },
  { id: "SWIMMING", icon: "🏊", label: "Swim"     },
  { id: "STRENGTH", icon: "🏋️", label: "Strength" },
  { id: "HIIT",     icon: "⚡", label: "HIIT"     },
];

function fmt(n: number, decimals = 1): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

function hours(secs: number): string {
  const h = secs / 3600;
  return `${fmt(h, 1)}h`;
}

function getStats(tab: TypeTab, s: TypeStats): { value: string; label: string }[] {
  const km = s.totalDistanceM / 1000;

  switch (tab) {
    case "RUNS":
      return [
        { value: s.count.toString(),               label: "SESSIONS"   },
        { value: `${fmt(km)} km`,                  label: "TOTAL DIST" },
        { value: s.avgPaceSpM ? formatPace(s.avgPaceSpM) : "—", label: "AVG PACE"  },
        { value: hours(s.totalDurationS),          label: "TOTAL TIME" },
      ];
    case "CYCLING":
      return [
        { value: s.count.toString(),               label: "SESSIONS"   },
        { value: `${fmt(km)} km`,                  label: "TOTAL DIST" },
        { value: s.avgSpeedMps ? `${fmt(s.avgSpeedMps * 3.6)} km/h` : "—", label: "AVG SPEED" },
        { value: hours(s.totalDurationS),          label: "TOTAL TIME" },
      ];
    case "SWIMMING":
      return [
        { value: s.count.toString(),               label: "SESSIONS"   },
        { value: `${fmt(km, 2)} km`,               label: "TOTAL DIST" },
        { value: s.avgPaceSpM ? formatPace100m(s.avgPaceSpM) : "—", label: "PACE/100m"  },
        { value: hours(s.totalDurationS),          label: "TOTAL TIME" },
      ];
    case "STRENGTH":
      return [
        { value: s.count.toString(),               label: "SESSIONS"   },
        { value: hours(s.totalDurationS),          label: "TOTAL TIME" },
        { value: s.count > 0 ? `${fmt(s.totalDurationS / s.count / 60, 0)} min` : "—", label: "AVG SESSION" },
        { value: s.totalCalories > 0 ? `${Math.round(s.totalCalories).toLocaleString()} kcal` : "—", label: "TOTAL KCAL" },
      ];
    case "HIIT":
      return [
        { value: s.count.toString(),               label: "SESSIONS"   },
        { value: hours(s.totalDurationS),          label: "TOTAL TIME" },
        { value: s.avgHeartRate ? `${Math.round(s.avgHeartRate)} bpm` : "—", label: "AVG HR"     },
        { value: s.totalCalories > 0 ? `${Math.round(s.totalCalories).toLocaleString()} kcal` : "—", label: "TOTAL KCAL" },
      ];
  }
}

export function OverallStatsCard({ stats }: { stats: AllTypeStats }) {
  const [active, setActive] = useState<TypeTab>("RUNS");
  const s = stats[active];
  const statRows = getStats(active, s);

  return (
    <div
      style={{
        background: "var(--surface-1)",
        borderRadius: 16,
        overflow: "hidden",
        borderTop: "2px solid var(--accent)",
      }}
    >
      {/* Tab row */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const count = stats[tab.id].count;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              style={{
                flex: 1,
                padding: "10px 4px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                background: isActive ? "var(--surface-2)" : "transparent",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
                transition: "all 0.15s",
                position: "relative",
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>{tab.icon}</span>
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: isActive ? "var(--accent)" : "var(--text-3)",
                  textTransform: "uppercase",
                }}
              >
                {tab.label}
              </span>
              {count > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: "50%",
                    transform: "translateX(10px)",
                    fontSize: 7,
                    fontWeight: 800,
                    background: isActive ? "var(--accent)" : "var(--surface-3)",
                    color: isActive ? "#000" : "var(--text-3)",
                    borderRadius: 99,
                    padding: "1px 4px",
                    lineHeight: 1.4,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats grid */}
      <div style={{ padding: "16px 20px 20px" }}>
        {s.count === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "var(--text-3)",
              fontSize: 13,
              padding: "16px 0",
            }}
          >
            No {active.toLowerCase()} activities yet
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 0" }}>
            {statRows.map(({ value, label }, i) => (
              <div
                key={label}
                style={
                  i > 0
                    ? { borderLeft: "1px solid var(--border)", paddingLeft: 12 }
                    : { paddingRight: 12 }
                }
              >
                <p
                  style={{
                    fontSize: i === 0 ? 22 : 16,
                    fontWeight: 800,
                    color: "white",
                    lineHeight: 1.1,
                    letterSpacing: i === 0 ? undefined : "-0.01em",
                  }}
                >
                  {value}
                </p>
                <p
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: "var(--text-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginTop: 4,
                  }}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
