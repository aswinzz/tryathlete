"use client";
import { formatDuration, getActivityTypeLabel } from "@/lib/utils";
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

interface MinimalCardProps {
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

const BG = "#ffffff";
const BORDER = "#f0f0f0";
const TEXT = "#0a0a0a";
const TEXT2 = "#888888";
const MAP_BG = "#f0f0f0";
const MAP_STROKE = "#111111";

export function MinimalCard({
  cardRef, name, type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  laps = [], config = DEFAULT_CONFIG, routePoints,
}: MinimalCardProps) {
  const typeLabel = getActivityTypeLabel(type);
  const titleLabel = config.titleMode === "name" && name ? name : typeLabel;
  const dateStr = format(new Date(startTime), "MMMM d, yyyy");
  const timeStr = format(new Date(startTime), "h:mm a");

  const data = { type, duration, distance, avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps };
  const { value: heroValue, unit: heroUnit } = resolveHero(config, data);
  const stats = resolveStats(config, data, 3);
  const showLaps = config.show.laps && laps.length > 0;

  return (
    <div ref={cardRef} style={{ background: BG, borderRadius: 20, overflow: "hidden", padding: "32px 28px 32px", width: "100%", boxSizing: "border-box", border: `1px solid ${BORDER}` }}>
      <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: TEXT2, letterSpacing: "0.04em", marginBottom: 24 }}>
        {titleLabel} · {dateStr} · {timeStr}
      </p>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 80, fontWeight: 900, color: TEXT, lineHeight: 1, letterSpacing: "-0.03em" }}>{heroValue}</span>
          {heroUnit && <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 28, fontWeight: 300, color: TEXT2, marginBottom: 6 }}>{heroUnit}</span>}
        </div>
      </div>

      {config.show.route && routePoints && routePoints.length > 1 && (
        <div style={{ marginBottom: 24, borderRadius: 12, overflow: "hidden", background: MAP_BG }}>
          <RouteMapSvg routePoints={routePoints} viewW={400} viewH={200} padding={20} strokeColor={MAP_STROKE} strokeWidth={2} glowOpacity={0} strokeStyle="solid" />
        </div>
      )}

      <div style={{ height: 1, background: BORDER, marginBottom: 24 }} />

      {stats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 0, marginBottom: showLaps ? 28 : 0 }}>
          {stats.map(({ label, value }, i) => (
            <div key={label} style={i > 0 ? { borderLeft: `1px solid ${BORDER}`, paddingLeft: 16 } : { paddingRight: 16 }}>
              <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 16, fontWeight: 700, color: TEXT, lineHeight: 1 }}>{value}</p>
              <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 10, color: TEXT2, marginTop: 5 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {showLaps && (
        <>
          <div style={{ height: 1, background: BORDER }} />
          <div style={{ marginTop: 4 }}>
            {laps.map((lap, i) => (
              <div key={lap.lapIndex} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, color: TEXT2 }}>Lap {i + 1}</span>
                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, fontWeight: 600, color: TEXT }}>{formatDuration(lap.duration)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
