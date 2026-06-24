"use client";
/**
 * OverlayPillsCard — floating dark semi-transparent pill badges.
 * Exports as transparent PNG. Each stat floats as its own pill,
 * arranged in a centered flex-wrap layout. Sticker-style.
 */
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

interface OverlayPillsCardProps {
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
  laps?: { lapIndex: number; distance: number; duration: number; avgHeartRate?: number | null; avgPace?: number | null; zone?: number | null }[];
}

const PILL_BG = "rgba(0,0,0,0.65)";
const SHADOW = "0 2px 12px rgba(0,0,0,0.5)";
const ACCENT = "#c8ff00";

export function OverlayPillsCard({
  cardRef,
  type,
  startTime,
  duration,
  distance,
  avgHeartRate,
  avgPace,
  calories,
  elevGain,
}: OverlayPillsCardProps) {
  const category = getActivityCategory(type);
  const t = type.toLowerCase();
  const isRun = t.includes("run");
  const isCycle = t.includes("cycl") || t.includes("bike") || t.includes("ride");
  const isSwim = t.includes("swim");
  const isEndurance = category === "endurance";

  const typeLabel = getActivityTypeLabel(type).toUpperCase();
  const dateStr = format(new Date(startTime), "MMM d, yyyy").toUpperCase();

  const heroValue =
    isEndurance && distance
      ? isSwim ? `${Math.round(distance)}` : formatDistance(distance)
      : formatDuration(duration);
  const heroUnit = isEndurance && distance ? (isSwim ? "M" : "KM") : "";

  // Build all stat pills
  type Pill = { label: string; value: string; accent?: boolean };
  const pills: Pill[] = [];

  // Hero is the first (large) pill
  pills.push({ label: isEndurance ? (isSwim ? "METRES" : "KILOMETRES") : "DURATION", value: `${heroValue}${heroUnit ? " " + heroUnit : ""}`, accent: true });

  if (isRun) {
    if (avgPace) pills.push({ label: "PACE", value: `${formatPace(avgPace)}/km` });
    pills.push({ label: "TIME", value: formatDuration(duration) });
    if (avgHeartRate) pills.push({ label: "AVG HR", value: `${avgHeartRate} bpm` });
    if (calories) pills.push({ label: "KCAL", value: `${calories.toLocaleString()}` });
    if (elevGain) pills.push({ label: "ELEV", value: `+${Math.round(elevGain)}m` });
  } else if (isCycle) {
    if (avgPace) pills.push({ label: "SPEED", value: `${formatSpeed(1 / avgPace)} km/h` });
    pills.push({ label: "TIME", value: formatDuration(duration) });
    if (elevGain) pills.push({ label: "ELEV", value: `+${Math.round(elevGain)}m` });
    if (avgHeartRate) pills.push({ label: "AVG HR", value: `${avgHeartRate} bpm` });
  } else if (isSwim) {
    if (avgPace) pills.push({ label: "PACE", value: `${formatPace100m(avgPace)}/100m` });
    pills.push({ label: "TIME", value: formatDuration(duration) });
    if (avgHeartRate) pills.push({ label: "AVG HR", value: `${avgHeartRate} bpm` });
  } else {
    pills.push({ label: "TIME", value: formatDuration(duration) });
    if (avgHeartRate) pills.push({ label: "AVG HR", value: `${avgHeartRate} bpm` });
    if (calories) pills.push({ label: "KCAL", value: `${calories.toLocaleString()}` });
  }

  return (
    <div
      ref={cardRef}
      style={{
        width: "100%",
        padding: "40px 20px 40px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Type + date pill */}
      <div style={{
        background: PILL_BG,
        borderRadius: 100,
        padding: "6px 16px",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        boxShadow: SHADOW,
      }}>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: "0.12em" }}>{typeLabel}</span>
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "inline-block" }} />
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em" }}>{dateStr}</span>
      </div>

      {/* Hero pill — large */}
      <div style={{
        background: pills[0].accent ? "rgba(200,255,0,0.15)" : PILL_BG,
        border: "1px solid rgba(200,255,0,0.35)",
        borderRadius: 100,
        padding: "12px 28px",
        boxShadow: SHADOW,
      }}>
        <span style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 42,
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          textShadow: "0 2px 12px rgba(0,0,0,0.6)",
        }}>
          {heroValue}
          {heroUnit && (
            <span style={{ fontSize: 20, color: ACCENT, fontWeight: 700, marginLeft: 6 }}>{heroUnit}</span>
          )}
        </span>
      </div>

      {/* Secondary stat pills — flex wrap */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: "center",
      }}>
        {pills.slice(1).map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: PILL_BG,
              borderRadius: 100,
              padding: "8px 18px",
              boxShadow: SHADOW,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, fontWeight: 800, color: "#ffffff", lineHeight: 1, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>{value}</span>
            <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
