"use client";
import { getActivityTypeLabel } from "@/lib/utils";
import { format } from "date-fns";
import { CardConfig, DEFAULT_CONFIG, resolveHero, resolveStats } from "@/lib/cardConfig";
import { RouteMapSvg } from "@/components/cards/RouteMapSvg";
import type { RoutePoint } from "@/lib/routeUtils";

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
  config?: CardConfig;
  routePoints?: RoutePoint[] | null;
}

const PILL_BG = "rgba(0,0,0,0.65)";
const SHADOW = "0 2px 12px rgba(0,0,0,0.5)";
const ACCENT = "#c8ff00";

export function OverlayPillsCard({
  cardRef, name, type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  config = DEFAULT_CONFIG, routePoints,
}: OverlayPillsCardProps) {
  const typeLabel = getActivityTypeLabel(type).toUpperCase();
  const titleLabel = config.titleMode === "name" && name ? name.toUpperCase() : typeLabel;
  const dateStr = format(new Date(startTime), "MMM d, yyyy").toUpperCase();

  const data = { type, duration, distance, avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps };
  const { value: heroValue, unit: heroUnit } = resolveHero(config, data);
  // Pills can show more — up to 5 secondary stats
  const secondaryStats = resolveStats(config, data, 5);

  return (
    <div ref={cardRef} style={{ width: "100%", padding: "40px 20px 40px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {/* Type + date pill */}
      <div style={{ background: PILL_BG, borderRadius: 100, padding: "6px 16px", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: SHADOW }}>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: "0.12em" }}>{titleLabel}</span>
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "inline-block" }} />
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em" }}>{dateStr}</span>
      </div>

      {/* Route mini-map — transparent, only the line is visible */}
      {config.show.route && routePoints && routePoints.length > 1 && (
        <div style={{ width: "100%", maxWidth: 280 }}>
          <RouteMapSvg
            routePoints={routePoints}
            viewW={280} viewH={140} padding={14}
            strokeColor={ACCENT}
            strokeWidth={2.5}
            glowOpacity={0.4}
            glowWidth={10}
            style={{ filter: "drop-shadow(0 0 5px rgba(0,0,0,0.8))" }}
          />
        </div>
      )}

      {/* Hero pill */}
      <div style={{ background: "rgba(200,255,0,0.15)", border: "1px solid rgba(200,255,0,0.35)", borderRadius: 100, padding: "12px 28px", boxShadow: SHADOW }}>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 42, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
          {heroValue}
          {heroUnit && <span style={{ fontSize: 20, color: ACCENT, fontWeight: 700, marginLeft: 6 }}>{heroUnit}</span>}
        </span>
      </div>

      {/* Secondary stat pills */}
      {secondaryStats.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {secondaryStats.map(({ label, value }) => (
            <div key={label} style={{ background: PILL_BG, borderRadius: 100, padding: "8px 18px", boxShadow: SHADOW, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>{value}</span>
              <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 8, fontWeight: 600, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
