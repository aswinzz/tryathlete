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

interface NightCardProps {
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

const BG = "#080c18";
const ACCENT = "#818cf8";
const ACCENT2 = "#c084fc";
const BORDER = "rgba(129,140,248,0.15)";
const TEXT = "#f1f5f9";
const TEXT2 = "rgba(241,245,249,0.45)";
const TEXT3 = "rgba(241,245,249,0.2)";
const MAP_BG = "#0c1024";
const MAP_STROKE = "#818cf8";

export function NightCard({
  cardRef, name, type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  laps = [], config = DEFAULT_CONFIG, routePoints,
}: NightCardProps) {
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
  const showLaps = config.show.laps && laps.length > 0;

  const ghostNum = heroValue.split(".")[0].split(":")[0];
  const fastestLap = laps.reduce(
    (best: Lap | null, l) => !best || (l.avgPace && (!best.avgPace || l.avgPace < best.avgPace)) ? l : best, null
  );
  const paceColLabel = isSwim ? "PACE/100M" : isCycle ? "SPEED" : "PACE";

  return (
    <div ref={cardRef} style={{ background: BG, borderRadius: 20, overflow: "hidden", padding: "24px 22px 28px", width: "100%", boxSizing: "border-box", position: "relative", border: `1px solid ${BORDER}` }}>
      <div aria-hidden style={{ position: "absolute", top: -10, right: -10, fontFamily: "system-ui, sans-serif", fontSize: 180, fontWeight: 900, color: "rgba(129,140,248,0.04)", lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>
        {ghostNum}
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT, display: "inline-block" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT2, display: "inline-block" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(129,140,248,0.25)", display: "inline-block" }} />
      </div>
      <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
        {titleLabel} · {dateStr} · {timeStr}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 64, fontWeight: 900, color: TEXT, lineHeight: 1 }}>{heroValue}</span>
        {heroUnit && <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 24, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>{heroUnit}</span>}
      </div>

      {/* Route map */}
      {config.show.route && routePoints && routePoints.length > 1 && (
        <div style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden", background: MAP_BG }}>
          <RouteMapSvg
            routePoints={routePoints}
            viewW={400} viewH={200} padding={20}
            strokeColor={MAP_STROKE}
            strokeWidth={2.5}
            glowOpacity={0.14}
            glowWidth={10}
          />
        </div>
      )}

      {quickStats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${quickStats.length}, 1fr)`, gap: 12, paddingTop: 16, paddingBottom: 16, borderTop: `1px solid ${BORDER}`, marginBottom: showLaps ? 0 : 4 }}>
          {quickStats.map(({ label, value }, i) => (
            <div key={label} style={i > 0 ? { borderLeft: `1px solid ${BORDER}`, paddingLeft: 12 } : {}}>
              <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 17, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{value}</p>
              <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, fontWeight: 600, color: i === 0 ? ACCENT : i === 1 ? ACCENT2 : TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {showLaps && (
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2.5fr 1fr 2.5fr 2fr", marginBottom: 8 }}>
            {["SPLIT", paceColLabel, "Z", "TIME", "HR"].map((h, i) => (
              <span key={h} style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, fontWeight: 600, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: i === 0 ? "left" : i === 4 ? "right" : "center" }}>{h}</span>
            ))}
          </div>
          {laps.map((lap) => {
            const zone = lap.zone || 2;
            const zoneColor = ZONE_COLORS[zone];
            const isFastest = fastestLap?.lapIndex === lap.lapIndex && laps.length > 2;
            const lapPace = lap.avgPace ? (isSwim ? formatPace100m(lap.avgPace) : isCycle ? `${formatSpeed(1 / lap.avgPace)}` : formatPace(lap.avgPace)) : "—";
            return (
              <div key={lap.lapIndex} style={{ display: "grid", gridTemplateColumns: "3fr 2.5fr 1fr 2.5fr 2fr", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: TEXT, display: "flex", alignItems: "center", gap: 5 }}>
                  {lapDistanceLabel(lap.distance)}
                  {isFastest && <span style={{ background: ACCENT, color: "#000", fontSize: 7, fontWeight: 800, padding: "2px 5px", borderRadius: 4 }}>FAST</span>}
                </span>
                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, fontWeight: 700, color: ACCENT2, textAlign: "center" }}>{lapPace}</span>
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
              <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Heart Rate</span>
              <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, color: TEXT2 }}>{avgHeartRate} ~ {maxHeartRate ?? "?"} BPM</span>
              <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, fontWeight: 700, color: TEXT }}>{avgHeartRate} BPM AVG</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
