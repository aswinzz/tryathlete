"use client";
/**
 * OverlayBarCard — frosted dark bar at the bottom of the frame.
 * Exports as transparent PNG. Designed to be dropped over a workout photo.
 * The bar sits at the bottom; top area is empty (shows the photo).
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

interface Lap {
  lapIndex: number;
  distance: number;
  duration: number;
  avgHeartRate?: number | null;
  avgPace?: number | null;
  zone?: number | null;
}

interface OverlayBarCardProps {
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

const SHADOW = "0 2px 12px rgba(0,0,0,0.7)";
const SHADOW_SM = "0 1px 6px rgba(0,0,0,0.6)";
const ACCENT = "#c8ff00";

export function OverlayBarCard({
  cardRef,
  type,
  startTime,
  duration,
  distance,
  avgHeartRate,
  avgPace,
  calories,
  elevGain,
}: OverlayBarCardProps) {
  const category = getActivityCategory(type);
  const t = type.toLowerCase();
  const isRun = t.includes("run");
  const isCycle = t.includes("cycl") || t.includes("bike") || t.includes("ride");
  const isSwim = t.includes("swim");
  const isEndurance = category === "endurance";

  const typeLabel = getActivityTypeLabel(type).toUpperCase();
  const dateStr = format(new Date(startTime), "MMM d").toUpperCase();

  const heroValue =
    isEndurance && distance
      ? isSwim ? `${Math.round(distance)}` : formatDistance(distance)
      : formatDuration(duration);
  const heroUnit = isEndurance && distance ? (isSwim ? "M" : "KM") : "";

  // Secondary stats
  type Stat = { label: string; value: string };
  const secondaryStats: Stat[] = [];
  if (isRun) {
    if (avgPace) secondaryStats.push({ label: "PACE", value: `${formatPace(avgPace)}/km` });
    secondaryStats.push({ label: "TIME", value: formatDuration(duration) });
    if (avgHeartRate) secondaryStats.push({ label: "HR", value: `${avgHeartRate} bpm` });
  } else if (isCycle) {
    if (avgPace) secondaryStats.push({ label: "SPEED", value: `${formatSpeed(1 / avgPace)} km/h` });
    secondaryStats.push({ label: "TIME", value: formatDuration(duration) });
    if (elevGain) secondaryStats.push({ label: "ELEV", value: `+${Math.round(elevGain)}m` });
  } else if (isSwim) {
    if (avgPace) secondaryStats.push({ label: "PACE", value: `${formatPace100m(avgPace)}/100m` });
    secondaryStats.push({ label: "TIME", value: formatDuration(duration) });
    if (avgHeartRate) secondaryStats.push({ label: "HR", value: `${avgHeartRate} bpm` });
  } else {
    secondaryStats.push({ label: "TIME", value: formatDuration(duration) });
    if (avgHeartRate) secondaryStats.push({ label: "HR", value: `${avgHeartRate} bpm` });
    if (calories) secondaryStats.push({ label: "KCAL", value: `${calories.toLocaleString()}` });
  }

  return (
    // Outer wrapper: transparent, aspect 4:5 (portrait story-ish) with empty top
    <div
      ref={cardRef}
      style={{
        width: "100%",
        aspectRatio: "4 / 5",
        maxWidth: 360,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Type + date — floating top-left tag */}
      <div style={{
        position: "absolute",
        top: 20,
        left: 20,
        background: "rgba(0,0,0,0.55)",
        borderRadius: 100,
        padding: "6px 14px",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: "0.14em" }}>
          {typeLabel}
        </span>
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "inline-block" }} />
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em" }}>
          {dateStr}
        </span>
      </div>

      {/* Bottom bar */}
      <div style={{
        background: "rgba(0,0,0,0.72)",
        padding: "20px 22px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}>
        {/* Hero stat */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 44, fontWeight: 900, color: "#ffffff", lineHeight: 1, textShadow: SHADOW }}>
              {heroValue}
            </span>
            {heroUnit && (
              <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 16, fontWeight: 700, color: ACCENT, textShadow: SHADOW_SM }}>
                {heroUnit}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />

        {/* Secondary stats */}
        <div style={{ display: "flex", gap: 16, flex: 1, justifyContent: "flex-end" }}>
          {secondaryStats.map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 700, color: "#ffffff", lineHeight: 1, textShadow: SHADOW_SM }}>{value}</p>
              <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
