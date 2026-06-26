"use client";
import {
  formatDuration,
  formatPace,
  formatSpeed,
  formatPace100m,
  getActivityTypeLabel,
  ZONE_COLORS,
  lapDistanceLabel,
} from "@/lib/utils";
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

interface NeonCardProps {
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
  glass?: boolean;
}

const BG = "#050505";
const ACCENT = "#c8ff00";
const TEXT = "#ffffff";
const TEXT2 = "rgba(255,255,255,0.4)";
const MAP_BG = "#0a0f00";
const MAP_STROKE = "#c8ff00";

export function NeonCard({
  cardRef, name, type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  laps = [], config = DEFAULT_CONFIG, routePoints, glass = false,
}: NeonCardProps) {
  const t = type.toLowerCase();
  const isSwim = t.includes("swim");
  const isCycle = t.includes("cycl") || t.includes("bike") || t.includes("ride");

  const typeLabel = getActivityTypeLabel(type).toUpperCase();
  const titleLabel = config.titleMode === "name" && name ? name.toUpperCase() : typeLabel;
  const dateStr = format(new Date(startTime), "MMM d, yyyy").toUpperCase();
  const timeStr = format(new Date(startTime), "HH:mm");

  const data = { type, duration, distance, avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps };
  const { value: heroValue, unit: heroUnit } = resolveHero(config, data);
  const quickStats = resolveStats(config, data, 3);
  const showLaps = config.show.laps && laps.length > 1;

  const bdr = glass ? "rgba(200,255,0,0.2)" : "rgba(200,255,0,0.2)";
  const bdrDark = glass ? "rgba(255,255,255,0.1)" : "#1a1a1a";

  const fastestLap = laps.reduce(
    (best: Lap | null, l) => !best || (l.avgPace && (!best.avgPace || l.avgPace < best.avgPace)) ? l : best, null
  );
  const paceColLabel = isSwim ? "PACE/100M" : isCycle ? "SPEED" : "PACE";

  return (
    <div ref={cardRef} style={{ background: glass ? "transparent" : BG, borderRadius: 20, overflow: "hidden", padding: "24px 22px 28px", width: "100%", boxSizing: "border-box", border: `1px solid ${bdr}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: "0.16em", textTransform: "uppercase" }}>{titleLabel}</span>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 10, color: TEXT2, letterSpacing: "0.08em" }}>{dateStr} · {timeStr}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 72, fontWeight: 900, color: ACCENT, lineHeight: 1, letterSpacing: "-0.02em", textShadow: glass ? "0 0 20px rgba(200,255,0,0.4), 0 2px 8px rgba(0,0,0,0.6)" : undefined }}>{heroValue}</span>
        {heroUnit && <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 26, fontWeight: 700, color: "rgba(200,255,0,0.5)", marginBottom: 4 }}>{heroUnit}</span>}
      </div>

      {/* Route map */}
      {config.show.route && routePoints && routePoints.length > 1 && (
        glass ? (
          <div style={{ marginBottom: 14 }}>
            <RouteMapSvg routePoints={routePoints} viewW={400} viewH={200} padding={20} strokeColor={MAP_STROKE} strokeWidth={2.5} glowOpacity={0.45} glowWidth={14} style={{ filter: "drop-shadow(0 0 6px rgba(200,255,0,0.3)) drop-shadow(0 0 3px rgba(0,0,0,0.8))" }} />
          </div>
        ) : (
          <div style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden", background: MAP_BG }}>
            <RouteMapSvg routePoints={routePoints} viewW={400} viewH={200} padding={20} strokeColor={MAP_STROKE} strokeWidth={2.5} glowOpacity={0.22} glowWidth={14} />
          </div>
        )
      )}

      {quickStats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${quickStats.length}, 1fr)`, gap: 12, paddingTop: 14, paddingBottom: 14, borderTop: `1px solid ${bdr}`, marginBottom: showLaps ? 0 : 4 }}>
          {quickStats.map(({ label, value }, i) => (
            <div key={label} style={i > 0 ? { borderLeft: `1px solid ${bdr}`, paddingLeft: 12 } : {}}>
              <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 16, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{value}</p>
              <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, fontWeight: 600, color: ACCENT, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {showLaps && (
        <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 12, marginTop: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2.5fr 1fr 2.5fr 2fr", marginBottom: 8 }}>
            {["SPLIT", paceColLabel, "Z", "TIME", "HR"].map((h, i) => (
              <span key={h} style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, fontWeight: 600, color: "rgba(200,255,0,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i === 0 ? "left" : i === 4 ? "right" : "center" }}>{h}</span>
            ))}
          </div>
          {laps.map((lap) => {
            const zone = lap.zone || 2;
            const zoneColor = ZONE_COLORS[zone];
            const isFastest = fastestLap?.lapIndex === lap.lapIndex && laps.length > 2;
            const lapPace = lap.avgPace ? (isSwim ? formatPace100m(lap.avgPace) : isCycle ? `${formatSpeed(1 / lap.avgPace)}` : formatPace(lap.avgPace)) : "—";
            return (
              <div key={lap.lapIndex} style={{ display: "grid", gridTemplateColumns: "3fr 2.5fr 1fr 2.5fr 2fr", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${bdrDark}` }}>
                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: TEXT, display: "flex", alignItems: "center", gap: 5 }}>
                  {lapDistanceLabel(lap.distance)}
                  {isFastest && <span style={{ background: ACCENT, color: "#000", fontSize: 7, fontWeight: 800, padding: "2px 5px", borderRadius: 4 }}>FAST</span>}
                </span>
                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, fontWeight: 700, color: ACCENT, textAlign: "center" }}>{lapPace}</span>
                <span style={{ display: "flex", justifyContent: "center" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: zoneColor, display: "inline-block" }} />
                </span>
                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: TEXT2, textAlign: "center" }}>{formatDuration(lap.duration)}</span>
                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: TEXT2, textAlign: "right" }}>{lap.avgHeartRate ?? "—"}</span>
              </div>
            );
          })}
          {avgHeartRate && (
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 2 }}>
              <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, color: "rgba(200,255,0,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Heart Rate</span>
              <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, color: TEXT2 }}>{avgHeartRate} ~ {maxHeartRate ?? "?"} BPM</span>
              <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, fontWeight: 700, color: ACCENT }}>{avgHeartRate} BPM AVG</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
