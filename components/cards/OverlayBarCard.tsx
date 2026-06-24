"use client";
import { getActivityTypeLabel } from "@/lib/utils";
import { format } from "date-fns";
import { CardConfig, DEFAULT_CONFIG, resolveHero, resolveStats } from "@/lib/cardConfig";

interface OverlayBarCardProps {
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
}

const SHADOW = "0 2px 12px rgba(0,0,0,0.7)";
const SHADOW_SM = "0 1px 6px rgba(0,0,0,0.6)";
const ACCENT = "#c8ff00";

export function OverlayBarCard({
  cardRef, type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  config = DEFAULT_CONFIG,
}: OverlayBarCardProps) {
  const typeLabel = getActivityTypeLabel(type).toUpperCase();
  const dateStr = format(new Date(startTime), "MMM d").toUpperCase();

  const data = { type, duration, distance, avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps };
  const { value: heroValue, unit: heroUnit } = resolveHero(config, data);
  // Bar shows secondary stats only (hero is always in the left of the bar)
  const secondaryStats = resolveStats(config, data, 3);

  return (
    <div ref={cardRef} style={{ width: "100%", aspectRatio: "4 / 5", maxWidth: 360, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "flex-end", boxSizing: "border-box", position: "relative" }}>
      {/* Top tag */}
      <div style={{ position: "absolute", top: 20, left: 20, background: "rgba(0,0,0,0.55)", borderRadius: 100, padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: "0.14em" }}>{typeLabel}</span>
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "inline-block" }} />
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em" }}>{dateStr}</span>
      </div>

      {/* Bottom bar */}
      <div style={{ background: "rgba(0,0,0,0.72)", padding: "20px 22px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 44, fontWeight: 900, color: "#fff", lineHeight: 1, textShadow: SHADOW }}>{heroValue}</span>
            {heroUnit && <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 16, fontWeight: 700, color: ACCENT, textShadow: SHADOW_SM }}>{heroUnit}</span>}
          </div>
        </div>
        {secondaryStats.length > 0 && (
          <>
            <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
            <div style={{ display: "flex", gap: 16, flex: 1, justifyContent: "flex-end" }}>
              {secondaryStats.map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1, textShadow: SHADOW_SM }}>{value}</p>
                  <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
