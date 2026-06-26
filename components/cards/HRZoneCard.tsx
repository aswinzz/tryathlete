"use client";
import { useMemo } from "react";
import { getActivityTypeLabel, formatDurationShort } from "@/lib/utils";
import { format as fmtDate } from "date-fns";

const ZONE_COLORS: Record<number, string> = {
  1: "#4ECDC4",
  2: "#45B7D1",
  3: "#9B59B6",
  4: "#FF6B9D",
  5: "#FF4757",
};
const ZONE_NAMES = ["RECOVERY", "AEROBIC", "TEMPO", "THRESHOLD", "MAX"];

interface HRPoint { t: number; bpm: number }
interface HRZones { z1: number; z2: number; z3: number; z4: number; z5: number }

export interface HRZoneCardProps {
  cardRef?: React.RefObject<HTMLDivElement | null>;
  name?: string;
  type: string;
  startTime: Date;
  duration: number;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  minHeartRate?: number | null;
  hrStream?: string | null;
  hrZones?: string | null;
  maxHR?: number;
  glass?: boolean;
}

function zoneForBpm(bpm: number, maxHR = 190) {
  const p = bpm / maxHR;
  if (p < 0.6) return 1;
  if (p < 0.7) return 2;
  if (p < 0.8) return 3;
  if (p < 0.9) return 4;
  return 5;
}

export function HRZoneCard({
  cardRef, name, type, startTime, duration,
  avgHeartRate, maxHeartRate, minHeartRate,
  hrStream, hrZones, maxHR = 190, glass = false,
}: HRZoneCardProps) {
  const points: HRPoint[] = useMemo(() => {
    try { return hrStream ? JSON.parse(hrStream) : []; } catch { return []; }
  }, [hrStream]);

  const zones: HRZones | null = useMemo(() => {
    try { return hrZones ? JSON.parse(hrZones) : null; } catch { return null; }
  }, [hrZones]);

  const typeLabel = getActivityTypeLabel(type).toUpperCase();
  const titleLabel = name ? name : typeLabel;
  const dateStr = fmtDate(new Date(startTime), "d MMM yyyy").toUpperCase();

  const totalSecs = zones
    ? zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5
    : 0;
  const zoneArray = zones ? [zones.z1, zones.z2, zones.z3, zones.z4, zones.z5] : [];

  // SVG chart: zone-colored segments
  const W = 600, H = 180;
  const segments: { d: string; color: string }[] = [];
  let fillPath = "";

  if (points.length > 1) {
    const minBpm = Math.min(...points.map((p) => p.bpm)) - 8;
    const maxBpm = Math.max(...points.map((p) => p.bpm)) + 8;
    const maxT = points[points.length - 1].t || 1;
    const toX = (t: number) => (t / maxT) * W;
    const toY = (bpm: number) => H - ((bpm - minBpm) / (maxBpm - minBpm)) * H;

    for (let i = 1; i < points.length; i++) {
      const { t: t0, bpm: b0 } = points[i - 1];
      const { t: t1, bpm: b1 } = points[i];
      const color = ZONE_COLORS[zoneForBpm((b0 + b1) / 2, maxHR)];
      segments.push({
        d: `M ${toX(t0).toFixed(1)} ${toY(b0).toFixed(1)} L ${toX(t1).toFixed(1)} ${toY(b1).toFixed(1)}`,
        color,
      });
    }

    const linePts = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.t).toFixed(1)} ${toY(p.bpm).toFixed(1)}`)
      .join(" ");
    fillPath = `${linePts} L ${W} ${H} L 0 ${H} Z`;
  }

  const bg = glass ? "rgba(4,9,10,0.82)" : "#04090a";
  const border = glass ? "1px solid rgba(200,255,0,0.08)" : "none";
  const backdropFilter = glass ? "blur(20px) saturate(1.4)" : "none";

  return (
    <div
      ref={cardRef}
      style={{
        width: "100%",
        aspectRatio: "9 / 16",
        background: bg,
        border,
        backdropFilter,
        display: "flex",
        flexDirection: "column",
        padding: "28px 24px 32px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* Subtle grid background */}
      <svg
        style={{ position: "absolute", inset: 0, opacity: 0.04 }}
        width="100%" height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="hrg" width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M 18 0 L 0 0 0 18" fill="none" stroke="#c8ff00" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hrg)" />
      </svg>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, zIndex: 1 }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(200,255,0,0.55)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 3 }}>
            HEART RATE
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", maxWidth: 200, lineHeight: 1.2 }}>
            {titleLabel}
          </p>
        </div>
        <p style={{ fontSize: 9, fontWeight: 500, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {dateStr}
        </p>
      </div>

      {/* HR Curve */}
      <div style={{ flex: "0 0 auto", marginBottom: 20, zIndex: 1, background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "12px 8px 8px", overflow: "hidden" }}>
        {points.length > 1 ? (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="120" preserveAspectRatio="none" style={{ display: "block" }}>
              <path d={fillPath} fill="rgba(200,255,0,0.05)" />
              {segments.map((seg, i) => (
                <path key={i} d={seg.d} fill="none" stroke={seg.color} strokeWidth="3.5" strokeLinecap="round" />
              ))}
            </svg>
            {/* Zone color key */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 6, paddingRight: 4 }}>
              {[1, 2, 3, 4, 5].map((z) => (
                <span key={z} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: ZONE_COLORS[z], display: "inline-block" }} />
                  <span style={{ fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>Z{z}</span>
                </span>
              ))}
            </div>
          </>
        ) : (
          <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>NO HR STREAM</p>
          </div>
        )}
      </div>

      {/* Min / Avg / Max */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        marginBottom: 24, zIndex: 1,
      }}>
        {[
          { label: "MIN", value: minHeartRate ?? "—" },
          { label: "AVG", value: avgHeartRate ?? "—", accent: true },
          { label: "MAX", value: maxHeartRate ?? "—" },
        ].map(({ label, value, accent }, i) => (
          <div key={label} style={{
            padding: "14px 0",
            textAlign: "center",
            borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.07)" : "none",
          }}>
            <p style={{ fontSize: accent ? 28 : 22, fontWeight: 900, color: accent ? "#c8ff00" : "#fff", lineHeight: 1 }}>
              {value}
            </p>
            <p style={{ fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 5 }}>
              {label} BPM
            </p>
          </div>
        ))}
      </div>

      {/* Zone bars */}
      {zones && totalSecs > 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, zIndex: 1 }}>
          <p style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
            TIME IN ZONE
          </p>
          {zoneArray.map((secs, i) => {
            const z = i + 1;
            const pct = totalSecs > 0 ? (secs / totalSecs) * 100 : 0;
            return (
              <div key={z} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: ZONE_COLORS[z], flexShrink: 0 }} />
                <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", width: 80, flexShrink: 0, textTransform: "uppercase" }}>
                  Z{z} {ZONE_NAMES[i]}
                </span>
                <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: ZONE_COLORS[z], borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 600, color: secs > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)", width: 36, textAlign: "right", flexShrink: 0 }}>
                  {secs > 0 ? formatDurationShort(secs) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: "auto", paddingTop: 20, zIndex: 1,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <p style={{ fontSize: 8, fontWeight: 700, color: "rgba(200,255,0,0.4)", letterSpacing: "0.2em" }}>
          TRYATHLETE
        </p>
        <p style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
          {typeLabel} · {formatDurationShort(duration)}
        </p>
      </div>
    </div>
  );
}
