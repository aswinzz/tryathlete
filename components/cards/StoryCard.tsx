"use client";
import {
  formatDuration,
  formatPace,
  formatSpeed,
  formatPace100m,
  getActivityTypeLabel,
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
  config?: CardConfig;
  routePoints?: RoutePoint[] | null;
  glass?: boolean;
}

const BG = "#0a0a0a";
const ACCENT = "#c8ff00";
const TEXT = "#ffffff";
const TEXT2 = "rgba(255,255,255,0.45)";
const MAP_BG = "#111111";
const MAP_STROKE = "#c8ff00";

export function StoryCard({
  cardRef, name, type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  laps = [], config = DEFAULT_CONFIG, routePoints, glass = false,
}: StoryCardProps) {
  const t = type.toLowerCase();
  const isSwim = t.includes("swim");
  const isCycle = t.includes("cycl") || t.includes("bike") || t.includes("ride");

  const typeLabel = getActivityTypeLabel(type).toUpperCase();
  const titleLabel = config.titleMode === "name" && name ? name.toUpperCase() : typeLabel;
  const dateStr = format(new Date(startTime), "MMM d, yyyy").toUpperCase();
  const timeStr = format(new Date(startTime), "HH:mm");

  const data = { type, duration, distance, avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps };
  const { value: heroValue, unit: heroUnit } = resolveHero(config, data);
  const bottomStats = resolveStats(config, data, 3);

  const ghostNum = heroValue.split(".")[0].split(":")[0];
  const bdr = glass ? "rgba(255,255,255,0.15)" : "#1e1e1e";

  const fastestLap = laps.reduce(
    (best: Lap | null, l) => !best || (l.avgPace && (!best.avgPace || l.avgPace < best.avgPace)) ? l : best, null
  );
  const bestLapPace = fastestLap?.avgPace
    ? isSwim ? formatPace100m(fastestLap.avgPace) : isCycle ? `${formatSpeed(1 / fastestLap.avgPace)} km/h` : `${formatPace(fastestLap.avgPace)}/km`
    : null;

  return (
    <div ref={cardRef} style={{ background: glass ? "transparent" : BG, borderRadius: 20, overflow: "hidden", width: "100%", aspectRatio: "9 / 16", maxWidth: 360, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "32px 28px", boxSizing: "border-box", position: "relative" }}>
      {!glass && (
        <div aria-hidden style={{ position: "absolute", bottom: -20, right: -10, fontFamily: "system-ui, sans-serif", fontSize: 260, fontWeight: 900, color: "rgba(200,255,0,0.045)", lineHeight: 1, pointerEvents: "none", userSelect: "none" }}>
          {ghostNum}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, fontWeight: 600, color: TEXT2, letterSpacing: "0.14em", textTransform: "uppercase", textShadow: glass ? "0 1px 4px rgba(0,0,0,0.7)" : undefined }}>
          {titleLabel}
        </p>
      </div>

      {config.show.route && routePoints && routePoints.length > 1 && (
        glass ? (
          <div style={{ position: "relative" }}>
            <RouteMapSvg routePoints={routePoints} viewW={400} viewH={220} padding={22} strokeColor={MAP_STROKE} strokeWidth={2.5} glowOpacity={0.45} glowWidth={14} style={{ filter: "drop-shadow(0 0 6px rgba(200,255,0,0.3)) drop-shadow(0 0 3px rgba(0,0,0,0.8))" }} />
          </div>
        ) : (
          <div style={{ position: "relative", margin: "0 -28px", background: MAP_BG }}>
            <RouteMapSvg routePoints={routePoints} viewW={400} viewH={220} padding={22} strokeColor={MAP_STROKE} strokeWidth={2.5} glowOpacity={0.18} glowWidth={12} />
          </div>
        )
      )}

      <div style={{ position: "relative", textAlign: "center" }}>
        <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 96, fontWeight: 900, color: TEXT, lineHeight: 1, letterSpacing: "-0.02em", textShadow: glass ? "0 2px 16px rgba(0,0,0,0.7)" : undefined }}>
          {heroValue}
        </div>
        {heroUnit && (
          <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 32, fontWeight: 700, color: ACCENT, marginTop: 4, textShadow: glass ? "0 0 16px rgba(200,255,0,0.4)" : undefined }}>
            {heroUnit}
          </div>
        )}
        <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, color: TEXT2, marginTop: 14, letterSpacing: "0.06em", textShadow: glass ? "0 1px 4px rgba(0,0,0,0.7)" : undefined }}>
          {dateStr} · {timeStr}
        </p>
        {bestLapPace && config.show.laps && laps.length > 1 && (
          <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 6, letterSpacing: "0.06em" }}>
            BEST LAP · {bestLapPace}
          </p>
        )}
      </div>

      {bottomStats.length > 0 && (
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${bottomStats.length}, 1fr)`, paddingTop: 20, borderTop: `1px solid ${bdr}` }}>
          {bottomStats.map(({ label, value }, i) => (
            <div key={label} style={i > 0 ? { borderLeft: `1px solid ${bdr}`, paddingLeft: 16 } : {}}>
              <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 18, fontWeight: 800, color: TEXT, lineHeight: 1, textShadow: glass ? "0 2px 8px rgba(0,0,0,0.7)" : undefined }}>{value}</p>
              <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 5 }}>{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
