"use client";
import { useMemo } from "react";
import { formatDurationShort, getHRZone } from "@/lib/utils";

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

interface Props {
  hrStream: string | null;
  hrZones: string | null;
  minHeartRate: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  /** Override zone ceiling. Defaults to maxHeartRate if available, else 190. */
  maxHR?: number;
}

export function HRZoneSection({
  hrStream, hrZones, minHeartRate, avgHeartRate, maxHeartRate, maxHR = 200,
}: Props) {
  const effectiveMaxHR = maxHR;
  const points: HRPoint[] = useMemo(() => {
    try { return hrStream ? JSON.parse(hrStream) : []; } catch { return []; }
  }, [hrStream]);

  const zones: HRZones | null = useMemo(() => {
    try { return hrZones ? JSON.parse(hrZones) : null; } catch { return null; }
  }, [hrZones]);

  if (!zones && points.length === 0 && !avgHeartRate) return null;

  const totalSecs = zones
    ? zones.z1 + zones.z2 + zones.z3 + zones.z4 + zones.z5
    : 0;
  const zoneArray = zones ? [zones.z1, zones.z2, zones.z3, zones.z4, zones.z5] : [];

  // ── Colored SVG sparkline ──────────────────────────────────────────────────
  const W = 600, H = 100;
  const segments: { d: string; color: string }[] = [];
  let fillPath = "";

  if (points.length > 1) {
    const minBpm = Math.min(...points.map((p) => p.bpm)) - 8;
    const maxBpm = Math.max(...points.map((p) => p.bpm)) + 8;
    const maxT = points[points.length - 1].t || 1;
    const toX = (t: number) => (t / maxT) * W;
    const toY = (bpm: number) => H - ((bpm - minBpm) / (maxBpm - minBpm)) * H;

    // Build per-segment colored paths
    for (let i = 1; i < points.length; i++) {
      const { t: t0, bpm: b0 } = points[i - 1];
      const { t: t1, bpm: b1 } = points[i];
      const midBpm = (b0 + b1) / 2;
      const color = ZONE_COLORS[getHRZone(midBpm, effectiveMaxHR)];
      segments.push({
        d: `M ${toX(t0).toFixed(1)} ${toY(b0).toFixed(1)} L ${toX(t1).toFixed(1)} ${toY(b1).toFixed(1)}`,
        color,
      });
    }

    // Fill area (single path, accent color)
    const linePts = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(p.t).toFixed(1)} ${toY(p.bpm).toFixed(1)}`)
      .join(" ");
    fillPath = `${linePts} L ${W} ${H} L 0 ${H} Z`;
  }

  return (
    <div className="px-5 space-y-5">
      <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
        Heart Rate
      </p>

      {/* Sparkline */}
      {points.length > 1 && (
        <div
          className="rounded-2xl overflow-hidden px-1 pt-3 pb-1"
          style={{ background: "var(--surface-1)" }}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height={72}
            preserveAspectRatio="none"
          >
            {/* Fill area */}
            <path d={fillPath} fill="rgba(200,255,0,0.06)" />
            {/* Colored segments */}
            {segments.map((seg, i) => (
              <path
                key={i}
                d={seg.d}
                fill="none"
                stroke={seg.color}
                strokeWidth="3"
                strokeLinecap="round"
              />
            ))}
          </svg>
          {/* Zone color legend inline */}
          <div className="flex items-center justify-end gap-3 px-3 pb-2 pt-1">
            {[1, 2, 3, 4, 5].map((z) => (
              <span key={z} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: ZONE_COLORS[z] }} />
                <span className="text-[8px] font-bold text-[var(--text-3)]">Z{z}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Min / Avg / Max */}
      <div
        className="grid grid-cols-3 divide-x divide-[var(--border)] rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        {[
          { label: "MIN", value: minHeartRate },
          { label: "AVG", value: avgHeartRate },
          { label: "MAX", value: maxHeartRate },
        ].map(({ label, value }) => (
          <div key={label} className="py-4 text-center">
            <p className="text-xl font-bold text-white leading-none">
              {value ?? "—"}
            </p>
            <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mt-1.5">
              {label} BPM
            </p>
          </div>
        ))}
      </div>

      {/* Zone bars */}
      {zones && totalSecs > 0 && (
        <div className="space-y-2.5">
          {zoneArray.map((secs, i) => {
            const z = i + 1;
            const pct = totalSecs > 0 ? (secs / totalSecs) * 100 : 0;
            if (secs === 0) return null;
            return (
              <div key={z} className="flex items-center gap-3">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: ZONE_COLORS[z] }}
                />
                <span className="text-[10px] font-bold text-[var(--text-3)] w-[90px] flex-shrink-0 uppercase">
                  Z{z} {ZONE_NAMES[i]}
                </span>
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "var(--surface-2)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: ZONE_COLORS[z] }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-2)] w-12 text-right flex-shrink-0">
                  {formatDurationShort(secs)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
