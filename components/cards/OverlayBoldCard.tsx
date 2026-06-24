"use client";
/**
 * OverlayBoldCard — just the giant number, centered.
 * Exports as transparent PNG. Minimal, typographic, high impact.
 * Works great over landscape/outdoor photos where the subject is in the lower third.
 */
import {
  formatDuration,
  formatDistance,
  getActivityCategory,
  getActivityTypeLabel,
} from "@/lib/utils";
import { format } from "date-fns";

interface OverlayBoldCardProps {
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

const SHADOW_LG = "0 4px 24px rgba(0,0,0,0.75), 0 1px 6px rgba(0,0,0,0.5)";
const SHADOW_SM = "0 2px 10px rgba(0,0,0,0.65)";
const ACCENT = "#c8ff00";

export function OverlayBoldCard({
  cardRef,
  type,
  startTime,
  duration,
  distance,
}: OverlayBoldCardProps) {
  const category = getActivityCategory(type);
  const t = type.toLowerCase();
  const isSwim = t.includes("swim");
  const isEndurance = category === "endurance";

  const typeLabel = getActivityTypeLabel(type);
  const dateStr = format(new Date(startTime), "MMM d, yyyy");

  const heroValue =
    isEndurance && distance
      ? isSwim ? `${Math.round(distance)}` : formatDistance(distance)
      : formatDuration(duration);
  const heroUnit = isEndurance && distance ? (isSwim ? "M" : "KM") : "";

  return (
    <div
      ref={cardRef}
      style={{
        width: "100%",
        padding: "52px 24px 48px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {/* Hero */}
      <div style={{ marginBottom: 8 }}>
        <span style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: 100,
          fontWeight: 900,
          color: "#ffffff",
          lineHeight: 1,
          letterSpacing: "-0.03em",
          textShadow: SHADOW_LG,
          display: "block",
        }}>
          {heroValue}
        </span>
        {heroUnit && (
          <span style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 36,
            fontWeight: 700,
            color: ACCENT,
            textShadow: SHADOW_SM,
            display: "block",
            marginTop: 4,
            letterSpacing: "0.1em",
          }}>
            {heroUnit}
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{
        width: 48,
        height: 2,
        background: "rgba(255,255,255,0.35)",
        borderRadius: 2,
        margin: "16px auto",
        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
      }} />

      {/* Type + date */}
      <p style={{
        fontFamily: "system-ui, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        color: "rgba(255,255,255,0.8)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        textShadow: SHADOW_SM,
      }}>
        {typeLabel}
      </p>
      <p style={{
        fontFamily: "system-ui, sans-serif",
        fontSize: 11,
        color: "rgba(255,255,255,0.5)",
        letterSpacing: "0.06em",
        marginTop: 4,
        textShadow: SHADOW_SM,
      }}>
        {dateStr}
      </p>
    </div>
  );
}
