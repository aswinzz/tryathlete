"use client";
import {
  formatPace,
  formatDuration,
  formatDistance,
  formatSpeed,
  formatPace100m,
  getActivityCategory,
  getActivityTypeLabel,
} from "@/lib/utils";
import { format } from "date-fns";

interface Lap {
  lapIndex: number;
  distance: number;
  duration: number;
  avgHeartRate?: number | null;
  avgPace?: number | null;
  zone?: number | null;
}

interface TransparentCardProps {
  cardRef?: React.RefObject<HTMLDivElement | null>;
  name: string;
  type: string;
  startTime: Date;
  duration: number;
  distance?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  avgPace?: number | null;
  bestPace?: number | null;
  calories?: number | null;
  elevGain?: number | null;
  steps?: number | null;
  laps?: Lap[];
}

const SHADOW_SM = "0 1px 8px rgba(0,0,0,0.55)";
const SHADOW_MD = "0 2px 16px rgba(0,0,0,0.65)";
const ACCENT = "#c8ff00";
const WHITE = "#ffffff";
const WHITE70 = "rgba(255,255,255,0.7)";
const WHITE50 = "rgba(255,255,255,0.5)";

export function TransparentCard({
  cardRef,
  type,
  startTime,
  duration,
  distance,
  avgHeartRate,
  avgPace,
  calories,
  elevGain,
  laps = [],
}: TransparentCardProps) {
  const category = getActivityCategory(type);
  const t = type.toLowerCase();
  const isRun = t.includes("run");
  const isCycle = t.includes("cycl") || t.includes("bike") || t.includes("ride");
  const isSwim = t.includes("swim");
  const isEndurance = category === "endurance";

  const typeLabel = getActivityTypeLabel(type).toUpperCase();
  const dateStr = format(new Date(startTime), "MMM d, yyyy").toUpperCase();
  const timeStr = format(new Date(startTime), "HH:mm");

  const heroValue =
    isEndurance && distance
      ? isSwim
        ? `${Math.round(distance)}`
        : formatDistance(distance)
      : formatDuration(duration);
  const heroUnit =
    isEndurance && distance ? (isSwim ? "M" : "KM") : "";

  // 3 stats
  type Stat = { label: string; value: string };
  let stats: Stat[];
  if (isRun) {
    stats = [
      { label: "PACE", value: avgPace ? `${formatPace(avgPace)}/km` : "—" },
      { label: "TIME", value: formatDuration(duration) },
      { label: "HR", value: avgHeartRate ? `${avgHeartRate} bpm` : "—" },
    ];
  } else if (isCycle) {
    stats = [
      { label: "SPEED", value: avgPace ? `${formatSpeed(1 / avgPace)} km/h` : "—" },
      { label: "TIME", value: formatDuration(duration) },
      { label: "ELEV", value: elevGain ? `+${Math.round(elevGain)}m` : "—" },
    ];
  } else if (isSwim) {
    stats = [
      { label: "PACE", value: avgPace ? `${formatPace100m(avgPace)}/100m` : "—" },
      { label: "TIME", value: formatDuration(duration) },
      { label: "HR", value: avgHeartRate ? `${avgHeartRate} bpm` : "—" },
    ];
  } else {
    stats = [
      { label: "TIME", value: formatDuration(duration) },
      { label: "HR", value: avgHeartRate ? `${avgHeartRate} bpm` : "—" },
      { label: "KCAL", value: calories ? `${calories.toLocaleString()}` : "—" },
    ];
  }

  return (
    // No background — transparent PNG when exported
    <div
      ref={cardRef}
      style={{
        padding: "28px 24px 24px",
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Type + date */}
      <p style={{
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        color: WHITE70,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        textShadow: SHADOW_SM,
        marginBottom: 10,
        textAlign: "center",
      }}>
        {typeLabel} · {dateStr} · {timeStr}
      </p>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <span style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 80,
          fontWeight: 900,
          color: WHITE,
          textShadow: SHADOW_MD,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}>
          {heroValue}
        </span>
        {heroUnit && (
          <span style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: ACCENT,
            textShadow: SHADOW_SM,
            marginLeft: 6,
          }}>
            {heroUnit}
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{
        height: 1,
        background: "rgba(255,255,255,0.3)",
        margin: "0 8px 16px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
      }} />

      {/* Stats row */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: 0,
        marginBottom: 20,
      }}>
        {stats.map(({ label, value }, i) => (
          <div
            key={label}
            style={{
              flex: 1,
              textAlign: "center",
              borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.25)" : "none",
              padding: "0 12px",
            }}
          >
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 15, fontWeight: 800, color: WHITE, textShadow: SHADOW_MD, lineHeight: 1 }}>{value}</p>
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, fontWeight: 600, color: WHITE50, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 5, textShadow: SHADOW_SM }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Branding hidden for now */}
    </div>
  );
}
