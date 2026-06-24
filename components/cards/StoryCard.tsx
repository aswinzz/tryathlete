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

interface StoryCardProps {
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

const BG = "#0a0a0a";
const ACCENT = "#c8ff00";
const BORDER = "#1e1e1e";
const TEXT = "#ffffff";
const TEXT2 = "rgba(255,255,255,0.45)";
const TEXT3 = "rgba(255,255,255,0.18)";

export function StoryCard({
  cardRef,
  type,
  startTime,
  duration,
  distance,
  avgHeartRate,
  maxHeartRate,
  avgPace,
  calories,
  elevGain,
  laps = [],
}: StoryCardProps) {
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

  // Ghost background number (just the integer part or first segment)
  const ghostNum = isEndurance && distance
    ? isSwim
      ? `${Math.floor(distance)}`
      : `${Math.floor(distance / 1000)}`
    : heroValue.split(":")[0];

  // Bottom 3 stats
  type Stat = { label: string; value: string };
  let bottomStats: Stat[];
  if (isRun) {
    bottomStats = [
      { label: "PACE", value: avgPace ? formatPace(avgPace) : "—" },
      { label: "TIME", value: formatDuration(duration) },
      { label: "HR", value: avgHeartRate ? `${avgHeartRate}` : "—" },
    ];
  } else if (isCycle) {
    bottomStats = [
      { label: "SPEED", value: avgPace ? `${formatSpeed(1 / avgPace)}` : "—" },
      { label: "TIME", value: formatDuration(duration) },
      { label: "ELEV", value: elevGain ? `+${Math.round(elevGain)}m` : "—" },
    ];
  } else if (isSwim) {
    bottomStats = [
      { label: "PACE", value: avgPace ? formatPace100m(avgPace) : "—" },
      { label: "TIME", value: formatDuration(duration) },
      { label: "HR", value: avgHeartRate ? `${avgHeartRate}` : "—" },
    ];
  } else {
    bottomStats = [
      { label: "TIME", value: formatDuration(duration) },
      { label: "HR", value: avgHeartRate ? `${avgHeartRate}` : "—" },
      { label: "KCAL", value: calories ? `${calories.toLocaleString()}` : "—" },
    ];
  }

  // Fastest lap pace for secondary display
  const fastestLap = laps.reduce(
    (best: Lap | null, l) =>
      !best || (l.avgPace && (!best.avgPace || l.avgPace < best.avgPace)) ? l : best,
    null
  );
  const bestLapPace = fastestLap?.avgPace
    ? isSwim ? formatPace100m(fastestLap.avgPace) : isCycle ? `${formatSpeed(1 / fastestLap.avgPace)} km/h` : `${formatPace(fastestLap.avgPace)}/km`
    : null;

  return (
    <div
      ref={cardRef}
      style={{
        background: BG,
        borderRadius: 20,
        overflow: "hidden",
        // 9:16 aspect ratio via fixed width/height
        width: "100%",
        aspectRatio: "9 / 16",
        maxWidth: 360,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "32px 28px",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Ghost background number */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: -20,
          right: -10,
          fontFamily: "system-ui, sans-serif",
          fontSize: 260,
          fontWeight: 900,
          color: "rgba(200,255,0,0.045)",
          lineHeight: 1,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {ghostNum}
      </div>

      {/* Top: type */}
      <div style={{ position: "relative" }}>
        <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, fontWeight: 600, color: TEXT2, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          {typeLabel}
        </p>
      </div>

      {/* Middle: hero number */}
      <div style={{ position: "relative", textAlign: "center" }}>
        <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 96, fontWeight: 900, color: TEXT, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {heroValue}
        </div>
        {heroUnit && (
          <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 32, fontWeight: 700, color: ACCENT, marginTop: 4 }}>
            {heroUnit}
          </div>
        )}
        <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, color: TEXT2, marginTop: 14, letterSpacing: "0.06em" }}>
          {dateStr} · {timeStr}
        </p>
        {bestLapPace && laps.length > 1 && (
          <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: TEXT3, marginTop: 6, letterSpacing: "0.06em" }}>
            BEST LAP · {bestLapPace}
          </p>
        )}
      </div>

      {/* Bottom: 3 stats */}
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
        {bottomStats.map(({ label, value }, i) => (
          <div key={label} style={i > 0 ? { borderLeft: `1px solid ${BORDER}`, paddingLeft: 16 } : {}}>
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 18, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{value}</p>
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 5 }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
