"use client";
import {
  formatDuration,
  formatPace,
  formatDistance,
  formatSpeed,
  formatPace100m,
  getActivityTypeLabel,
} from "@/lib/utils";
import { format } from "date-fns";
import { CardConfig, DEFAULT_CONFIG, resolveHero, resolveStats } from "@/lib/cardConfig";
import { routeToSvgPath, RoutePoint } from "@/lib/routeUtils";

interface RouteCardProps {
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
  laps?: unknown[];
  config?: CardConfig;
  routePoints?: RoutePoint[] | null;
}

// ── Design tokens ────────────────────────────────────────────────────────────
const BG      = "#060911";
const ACCENT  = "#c8ff00";
const SURFACE = "#0d1320";
const TEXT    = "#ffffff";
const TEXT2   = "rgba(255,255,255,0.5)";
const TEXT3   = "rgba(255,255,255,0.25)";
const BORDER  = "rgba(255,255,255,0.07)";

export function RouteCard({
  cardRef, name, type, startTime, duration, distance,
  avgHeartRate, avgPace, calories, elevGain, steps,
  config = DEFAULT_CONFIG, routePoints,
}: RouteCardProps) {
  const typeLabel = getActivityTypeLabel(type).toUpperCase();
  const titleLabel = config.titleMode === "name" && name ? name.toUpperCase() : typeLabel;
  const dateStr = format(new Date(startTime), "MMM d, yyyy").toUpperCase();

  const data = { type, duration, distance, avgPace, avgHeartRate, calories, elevGain, steps };
  const { value: heroValue, unit: heroUnit } = resolveHero(config, data);
  const quickStats = resolveStats(config, data, 3);

  // SVG path
  const VW = 380;
  const VH = 300;
  const pathD = routePoints && routePoints.length > 1
    ? routeToSvgPath(routePoints, VW, VH, 24)
    : null;

  return (
    <div
      ref={cardRef}
      style={{
        background: BG,
        borderRadius: 20,
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header ── */}
      <div style={{ padding: "24px 22px 0" }}>
        <div style={{ width: 36, height: 3, background: ACCENT, borderRadius: 2, marginBottom: 14 }} />
        <p style={{
          fontSize: 10, fontWeight: 700, color: ACCENT,
          letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4,
        }}>
          {titleLabel}
        </p>
        <p style={{ fontSize: 9, fontWeight: 600, color: TEXT3, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {dateStr}
        </p>
      </div>

      {/* ── Route map ── */}
      <div style={{
        margin: "18px 0 0",
        position: "relative",
        background: SURFACE,
        overflow: "hidden",
      }}>
        {pathD ? (
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            style={{ display: "block", width: "100%" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Glow layer */}
            <path
              d={pathD}
              fill="none"
              stroke={ACCENT}
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.15}
            />
            {/* Main route line */}
            <path
              d={pathD}
              fill="none"
              stroke={ACCENT}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
            {/* Start dot */}
            {routePoints && routePoints.length > 0 && (() => {
              const first = routePoints[0];
              const last = routePoints[routePoints.length - 1];
              const pts = routePoints;
              const lats = pts.map((p) => p.lat);
              const lons = pts.map((p) => p.lon);
              const minLat = Math.min(...lats), maxLat = Math.max(...lats);
              const minLon = Math.min(...lons), maxLon = Math.max(...lons);
              const latRange = maxLat - minLat || 0.001;
              const lonRange = maxLon - minLon || 0.001;
              const pad = 24;
              const w = VW - pad * 2, h = VH - pad * 2;
              const scale = Math.min(w / lonRange, h / latRange);
              const drawW = lonRange * scale, drawH = latRange * scale;
              const ox = pad + (w - drawW) / 2;
              const oy = pad + (h - drawH) / 2;

              const toXY = (p: RoutePoint) => ({
                x: ox + ((p.lon - minLon) / lonRange) * drawW,
                y: oy + drawH - ((p.lat - minLat) / latRange) * drawH,
              });

              const startXY = toXY(first);
              const endXY = toXY(last);
              return (
                <>
                  {/* Start — white circle */}
                  <circle cx={startXY.x} cy={startXY.y} r={5} fill={TEXT} opacity={0.9} />
                  {/* End — accent circle */}
                  <circle cx={endXY.x} cy={endXY.y} r={6} fill={ACCENT} opacity={0.95} />
                  <circle cx={endXY.x} cy={endXY.y} r={11} fill={ACCENT} opacity={0.18} />
                </>
              );
            })()}
          </svg>
        ) : (
          /* No route data placeholder */
          <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <p style={{ fontSize: 28, lineHeight: 1 }}>🗺️</p>
            <p style={{ fontSize: 11, color: TEXT2, fontWeight: 600, letterSpacing: "0.06em" }}>No GPS data</p>
          </div>
        )}
      </div>

      {/* ── Hero stat ── */}
      <div style={{ padding: "18px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 56, fontWeight: 900, color: TEXT, lineHeight: 1 }}>{heroValue}</span>
          {heroUnit && (
            <span style={{ fontSize: 22, fontWeight: 700, color: TEXT2, marginBottom: 2 }}>{heroUnit}</span>
          )}
        </div>
      </div>

      {/* ── Secondary stats ── */}
      {quickStats.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${quickStats.length}, 1fr)`,
          gap: 12,
          padding: "14px 22px 22px",
          borderTop: `1px solid ${BORDER}`,
          marginTop: 14,
        }}>
          {quickStats.map(({ label, value }, i) => (
            <div key={label} style={i > 0 ? { borderLeft: `1px solid ${BORDER}`, paddingLeft: 12 } : {}}>
              <p style={{ fontSize: 15, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 9, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
