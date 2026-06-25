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

interface RetroCardProps {
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

const BG = "#F2EDE4";
const MAP_BG = "#E8E3DA";
const MONO: React.CSSProperties = { fontFamily: "'Courier New', Courier, monospace" };
const SANS: React.CSSProperties = { fontFamily: "system-ui, sans-serif" };

export function RetroCard({
  cardRef, name, type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  laps = [], config = DEFAULT_CONFIG, routePoints, glass = false,
}: RetroCardProps) {
  const t = type.toLowerCase();
  const isSwim = t.includes("swim");
  const isCycle = t.includes("cycl") || t.includes("bike") || t.includes("ride");

  const typeLabel = getActivityTypeLabel(type).toUpperCase();
  const titleLabel = config.titleMode === "name" && name ? name.toUpperCase() : typeLabel;
  const dateStr = format(new Date(startTime), "MMMM d, yyyy").toUpperCase();
  const dayStr = format(new Date(startTime), "EEEE").toUpperCase();
  const timeStr = format(new Date(startTime), "HH:mm");

  const data = { type, duration, distance, avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps };
  const { value: heroValue, unit: heroUnit } = resolveHero(config, data);
  // Retro shows more stats in the right column — use up to 5
  const stats = resolveStats(config, data, 5);
  const showLaps = config.show.laps && laps.length > 0;

  // Glass mode overrides: flip to white text for readability over photos
  const text  = glass ? "#ffffff" : "#1a1a1a";
  const text2 = glass ? "rgba(255,255,255,0.65)" : "#666";
  const text3 = glass ? "rgba(255,255,255,0.4)" : "#999";
  const bdr   = glass ? "rgba(255,255,255,0.22)" : "#C8C0B0";
  const hrBdr = glass ? "rgba(255,255,255,0.4)" : "#1a1a1a";
  const mapStroke = glass ? "#ffffff" : "#1a1a1a";

  const fastestLap = laps.reduce(
    (best: Lap | null, l) => !best || (l.avgPace && (!best.avgPace || l.avgPace < best.avgPace)) ? l : best, null
  );
  const paceColLabel = isSwim ? "PACE/100" : isCycle ? "SPEED" : "PACE";

  return (
    <div ref={cardRef} style={{ background: glass ? "transparent" : BG, borderRadius: 8, overflow: "hidden", padding: "20px 20px 24px", width: "100%", boxSizing: "border-box", border: `1px solid ${bdr}` }}>
      <div style={{ textAlign: "center", borderBottom: `2px solid ${hrBdr}`, paddingBottom: 10, marginBottom: 12 }}>
        <p style={{ ...SANS, fontSize: 8, fontWeight: 700, color: text2, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 4, textShadow: glass ? "0 1px 3px rgba(0,0,0,0.6)" : undefined }}>
          {dayStr} · {dateStr} · {timeStr}
        </p>
        <p style={{ ...SANS, fontSize: 22, fontWeight: 900, color: text, letterSpacing: "0.05em", lineHeight: 1, textShadow: glass ? "0 2px 8px rgba(0,0,0,0.6)" : undefined }}>{titleLabel}</p>
        <p style={{ ...SANS, fontSize: 8, fontWeight: 700, color: text2, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 4, textShadow: glass ? "0 1px 3px rgba(0,0,0,0.5)" : undefined }}>
          PERSONAL RECORD EDITION
        </p>
      </div>

      <div style={{ height: 1, background: bdr, marginBottom: 14 }} />

      {config.show.route && routePoints && routePoints.length > 1 && (
        glass ? (
          <div style={{ marginBottom: 14 }}>
            <RouteMapSvg routePoints={routePoints} viewW={400} viewH={180} padding={18} strokeColor={mapStroke} strokeWidth={2} glowOpacity={0.3} strokeStyle="dashed" showDots={true} style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.7))" }} />
          </div>
        ) : (
          <div style={{ marginBottom: 14, borderRadius: 4, overflow: "hidden", background: MAP_BG }}>
            <RouteMapSvg routePoints={routePoints} viewW={400} viewH={180} padding={18} strokeColor={mapStroke} strokeWidth={1.5} glowOpacity={0} strokeStyle="dashed" showDots={true} />
          </div>
        )
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <div style={{ borderRight: `1px solid ${bdr}`, paddingRight: 20 }}>
          <p style={{ ...SANS, fontSize: 8, fontWeight: 700, color: text2, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
            {config.hero === "pace" ? "AVG PACE" : config.hero === "time" ? "DURATION" : "TOTAL DISTANCE"}
          </p>
          <p style={{ ...MONO, fontSize: 48, fontWeight: 700, color: text, lineHeight: 1, letterSpacing: "-0.02em", textShadow: glass ? "0 2px 10px rgba(0,0,0,0.6)" : undefined }}>{heroValue}</p>
          {heroUnit && <p style={{ ...SANS, fontSize: 14, fontWeight: 700, color: text2, marginTop: 4 }}>{heroUnit}</p>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stats.map(({ label, value }) => (
            <div key={label}>
              <p style={{ ...SANS, fontSize: 7, fontWeight: 700, color: text3, letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</p>
              <p style={{ ...MONO, fontSize: 13, fontWeight: 700, color: text, lineHeight: 1.3 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {showLaps && (
        <>
          <div style={{ height: 1, background: bdr, margin: "14px 0 10px" }} />
          <p style={{ ...SANS, fontSize: 7, fontWeight: 700, color: text2, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 8 }}>SPLITS</p>
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2.5fr 1fr 2.5fr 2fr", marginBottom: 6, borderBottom: `1px solid ${bdr}`, paddingBottom: 4 }}>
            {["ITEM", paceColLabel, "Z", "TIME", "HR"].map((h, i) => (
              <span key={h} style={{ ...MONO, fontSize: 8, color: text3, textTransform: "uppercase", textAlign: i === 0 ? "left" : i === 4 ? "right" : "center" }}>{h}</span>
            ))}
          </div>
          {laps.map((lap) => {
            const zone = lap.zone || 2;
            const zoneColor = ZONE_COLORS[zone];
            const isFastest = fastestLap?.lapIndex === lap.lapIndex && laps.length > 2;
            const lapPace = lap.avgPace ? (isSwim ? formatPace100m(lap.avgPace) : isCycle ? `${formatSpeed(1 / lap.avgPace)}` : formatPace(lap.avgPace)) : "—";
            return (
              <div key={lap.lapIndex} style={{ display: "grid", gridTemplateColumns: "3fr 2.5fr 1fr 2.5fr 2fr", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${bdr}` }}>
                <span style={{ ...MONO, fontSize: 10, color: text, display: "flex", alignItems: "center", gap: 4 }}>
                  {lapDistanceLabel(lap.distance)}
                  {isFastest && <span style={{ background: glass ? "rgba(255,255,255,0.9)" : "#1a1a1a", color: glass ? "#1a1a1a" : BG, fontSize: 6, fontWeight: 700, padding: "1px 4px" }}>FAST</span>}
                </span>
                <span style={{ ...MONO, fontSize: 10, color: text, fontWeight: 700, textAlign: "center" }}>{lapPace}</span>
                <span style={{ display: "flex", justifyContent: "center" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: zoneColor, display: "inline-block" }} />
                </span>
                <span style={{ ...MONO, fontSize: 10, color: text2, textAlign: "center" }}>{formatDuration(lap.duration)}</span>
                <span style={{ ...MONO, fontSize: 10, color: text2, textAlign: "right" }}>{lap.avgHeartRate ?? "—"}</span>
              </div>
            );
          })}
          {avgHeartRate && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ ...MONO, fontSize: 8, color: text3 }}>HEART RATE</span>
              <span style={{ ...MONO, fontSize: 8, color: text2 }}>{avgHeartRate}~{maxHeartRate ?? "?"}BPM</span>
              <span style={{ ...MONO, fontSize: 8, fontWeight: 700, color: text }}>{avgHeartRate}BPM AVG</span>
            </div>
          )}
        </>
      )}

      <div style={{ borderTop: `2px solid ${hrBdr}`, marginTop: 16, paddingTop: 8 }}>
        <p style={{ ...SANS, fontSize: 7, color: text3, textAlign: "center", letterSpacing: "0.12em" }}>— ALL RIGHTS RESERVED —</p>
      </div>
    </div>
  );
}
