"use client";
import { getActivityTypeLabel } from "@/lib/utils";
import { format } from "date-fns";
import { CardConfig, DEFAULT_CONFIG, resolveHero, resolveStats } from "@/lib/cardConfig";
import { RouteMapSvg } from "@/components/cards/RouteMapSvg";
import type { RoutePoint } from "@/lib/routeUtils";

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
  config?: CardConfig;
  routePoints?: RoutePoint[] | null;
}

const SHADOW_SM = "0 1px 8px rgba(0,0,0,0.55)";
const SHADOW_MD = "0 2px 16px rgba(0,0,0,0.65)";
const ACCENT = "#c8ff00";

export function TransparentCard({
  cardRef, name, type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  config = DEFAULT_CONFIG, routePoints,
}: TransparentCardProps) {
  const typeLabel = getActivityTypeLabel(type).toUpperCase();
  const titleLabel = config.titleMode === "name" && name ? name.toUpperCase() : typeLabel;
  const dateStr = format(new Date(startTime), "MMM d, yyyy").toUpperCase();
  const timeStr = format(new Date(startTime), "HH:mm");

  const data = { type, duration, distance, avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps };
  const { value: heroValue, unit: heroUnit } = resolveHero(config, data);
  const stats = resolveStats(config, data, 3);

  return (
    <div ref={cardRef} style={{ padding: "28px 24px 24px", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 0 }}>
      <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.18em", textTransform: "uppercase", textShadow: SHADOW_SM, marginBottom: 10, textAlign: "center" }}>
        {titleLabel} · {dateStr} · {timeStr}
      </p>

      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 80, fontWeight: 900, color: "#fff", textShadow: SHADOW_MD, lineHeight: 1, letterSpacing: "-0.02em" }}>{heroValue}</span>
        {heroUnit && <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 28, fontWeight: 700, color: ACCENT, textShadow: SHADOW_SM, marginLeft: 6 }}>{heroUnit}</span>}
      </div>

      {stats.length > 0 && (
        <>
          <div style={{ height: 1, background: "rgba(255,255,255,0.3)", margin: "0 8px 16px" }} />
          <div style={{ display: "flex", justifyContent: "center", gap: 0, marginBottom: 8 }}>
            {stats.map(({ label, value }, i) => (
              <div key={label} style={{ flex: 1, textAlign: "center", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.25)" : "none", padding: "0 12px" }}>
                <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 15, fontWeight: 800, color: "#fff", textShadow: SHADOW_MD, lineHeight: 1 }}>{value}</p>
                <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 5, textShadow: SHADOW_SM }}>{label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Route mini-map — transparent, only the line is visible */}
      {config.show.route && routePoints && routePoints.length > 1 && (
        <div style={{ marginTop: 10 }}>
          <RouteMapSvg
            routePoints={routePoints}
            viewW={360} viewH={160} padding={16}
            strokeColor="#fff"
            strokeWidth={2.5}
            glowOpacity={0.35}
            glowWidth={10}
            style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.7))" }}
          />
        </div>
      )}
    </div>
  );
}
