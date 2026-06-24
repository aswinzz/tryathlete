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

interface MinimalCardProps {
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

const BG = "#ffffff";
const BORDER = "#f0f0f0";
const TEXT = "#0a0a0a";
const TEXT2 = "#888888";
const TEXT3 = "#cccccc";

export function MinimalCard({
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
}: MinimalCardProps) {
  const category = getActivityCategory(type);
  const t = type.toLowerCase();
  const isRun = t.includes("run");
  const isCycle = t.includes("cycl") || t.includes("bike") || t.includes("ride");
  const isSwim = t.includes("swim");
  const isEndurance = category === "endurance";

  const typeLabel = getActivityTypeLabel(type);
  const dateStr = format(new Date(startTime), "MMMM d, yyyy");
  const timeStr = format(new Date(startTime), "h:mm a");

  const heroValue =
    isEndurance && distance
      ? isSwim ? `${Math.round(distance)}` : formatDistance(distance)
      : formatDuration(duration);
  const heroUnit = isEndurance && distance ? (isSwim ? "m" : "km") : "";

  type Stat = { label: string; value: string };
  let stats: Stat[];
  if (isRun) {
    stats = [
      { label: "Pace", value: avgPace ? `${formatPace(avgPace)}/km` : "—" },
      { label: "Duration", value: formatDuration(duration) },
      { label: "Avg HR", value: avgHeartRate ? `${avgHeartRate} bpm` : "—" },
    ];
  } else if (isCycle) {
    stats = [
      { label: "Speed", value: avgPace ? `${formatSpeed(1 / avgPace)} km/h` : "—" },
      { label: "Duration", value: formatDuration(duration) },
      { label: "Elevation", value: elevGain ? `+${Math.round(elevGain)} m` : "—" },
    ];
  } else if (isSwim) {
    stats = [
      { label: "Pace", value: avgPace ? `${formatPace100m(avgPace)}/100m` : "—" },
      { label: "Duration", value: formatDuration(duration) },
      { label: "Avg HR", value: avgHeartRate ? `${avgHeartRate} bpm` : "—" },
    ];
  } else {
    stats = [
      { label: "Duration", value: formatDuration(duration) },
      { label: "Avg HR", value: avgHeartRate ? `${avgHeartRate} bpm` : "—" },
      { label: "Calories", value: calories ? `${calories.toLocaleString()} kcal` : "—" },
    ];
  }

  // Extra detail rows
  const extras: { label: string; value: string }[] = [];
  if (calories && isEndurance) extras.push({ label: "Calories", value: `${calories.toLocaleString()} kcal` });
  if (elevGain && isRun) extras.push({ label: "Elevation gain", value: `+${Math.round(elevGain)} m` });
  if (laps.length > 0) extras.push({ label: "Splits", value: `${laps.length} laps` });

  return (
    <div
      ref={cardRef}
      style={{
        background: BG,
        borderRadius: 20,
        overflow: "hidden",
        padding: "32px 28px 32px",
        width: "100%",
        boxSizing: "border-box",
        border: `1px solid ${BORDER}`,
      }}
    >
      {/* Date + type */}
      <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: TEXT2, letterSpacing: "0.04em", marginBottom: 24 }}>
        {typeLabel} · {dateStr} · {timeStr}
      </p>

      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 80, fontWeight: 900, color: TEXT, lineHeight: 1, letterSpacing: "-0.03em" }}>
            {heroValue}
          </span>
          {heroUnit && (
            <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 28, fontWeight: 300, color: TEXT2, marginBottom: 6 }}>
              {heroUnit}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: BORDER, marginBottom: 24 }} />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, marginBottom: extras.length > 0 ? 28 : 0 }}>
        {stats.map(({ label, value }, i) => (
          <div key={label} style={i > 0 ? { borderLeft: `1px solid ${BORDER}`, paddingLeft: 16 } : { paddingRight: 16 }}>
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 16, fontWeight: 700, color: TEXT, lineHeight: 1 }}>{value}</p>
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 10, color: TEXT2, marginTop: 5 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Extra rows */}
      {extras.length > 0 && (
        <>
          <div style={{ height: 1, background: BORDER, marginBottom: 0 }} />
          {extras.map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, color: TEXT2 }}>{label}</span>
              <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, fontWeight: 600, color: TEXT }}>{value}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
