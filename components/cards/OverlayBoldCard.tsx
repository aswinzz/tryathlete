"use client";
import { getActivityTypeLabel } from "@/lib/utils";
import { format } from "date-fns";
import { CardConfig, DEFAULT_CONFIG, resolveHero } from "@/lib/cardConfig";
import { RouteMapSvg } from "@/components/cards/RouteMapSvg";
import type { RoutePoint } from "@/lib/routeUtils";

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
  config?: CardConfig;
  routePoints?: RoutePoint[] | null;
}

const SHADOW_LG = "0 4px 24px rgba(0,0,0,0.75), 0 1px 6px rgba(0,0,0,0.5)";
const SHADOW_SM = "0 2px 10px rgba(0,0,0,0.65)";
const ACCENT = "#c8ff00";

export function OverlayBoldCard({
  cardRef, name, type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  config = DEFAULT_CONFIG, routePoints,
}: OverlayBoldCardProps) {
  const typeLabel = getActivityTypeLabel(type);
  const titleLabel = config.titleMode === "name" && name ? name : typeLabel;
  const dateStr = format(new Date(startTime), "MMM d, yyyy");

  const data = { type, duration, distance, avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps };
  const { value: heroValue, unit: heroUnit } = resolveHero(config, data);

  return (
    <div ref={cardRef} style={{ width: "100%", padding: "52px 24px 48px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 100, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em", textShadow: SHADOW_LG, display: "block" }}>{heroValue}</span>
        {heroUnit && <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 36, fontWeight: 700, color: ACCENT, textShadow: SHADOW_SM, display: "block", marginTop: 4, letterSpacing: "0.1em" }}>{heroUnit}</span>}
      </div>
      <div style={{ width: 48, height: 2, background: "rgba(255,255,255,0.35)", borderRadius: 2, margin: "16px auto" }} />
      <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", letterSpacing: "0.12em", textTransform: "uppercase", textShadow: SHADOW_SM }}>{titleLabel}</p>
      <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", marginTop: 4, textShadow: SHADOW_SM }}>{dateStr}</p>

      {/* Route mini-map — transparent, only the line is visible */}
      {config.show.route && routePoints && routePoints.length > 1 && (
        <div style={{ marginTop: 16, width: "100%", maxWidth: 280 }}>
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
    </div>
  );
}
