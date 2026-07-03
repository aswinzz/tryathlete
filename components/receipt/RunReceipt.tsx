"use client";
import {
  formatPace,
  formatDuration,
  formatDurationNoSecs,
  formatDistance,
  formatDistanceRounded,
  formatSpeed,
  formatPace100m,
  getActivityCategory,
  getActivityTypeLabel,
  ZONE_COLORS,
  lapDistanceLabel,
} from "@/lib/utils";
import { format } from "date-fns";
import { CardConfig, DEFAULT_CONFIG } from "@/lib/cardConfig";
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

interface RunReceiptProps {
  receiptRef?: React.RefObject<HTMLDivElement | null>;
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
  orderNumber?: string;
  config?: CardConfig;
  routePoints?: RoutePoint[] | null;
}

const MONO: React.CSSProperties = { fontFamily: "Roboto Mono, Courier New, monospace" };

export function RunReceipt({
  receiptRef,
  type,
  startTime,
  duration,
  distance,
  avgHeartRate,
  maxHeartRate,
  avgPace,
  bestPace,
  calories,
  elevGain,
  steps,
  laps = [],
  orderNumber = "0001",
  config = DEFAULT_CONFIG,
  routePoints,
}: RunReceiptProps) {
  const category = getActivityCategory(type);
  const t = type.toLowerCase();
  const isRun = t.includes("run");
  const isCycle = t.includes("cycl") || t.includes("bike") || t.includes("ride");
  const isSwim = t.includes("swim");
  const isEndurance = category === "endurance";

  const typeLabel = getActivityTypeLabel(type).toUpperCase();
  const dateStr = format(new Date(startTime), "MMMM d, yyyy").toUpperCase();
  const workoutLine = isRun
    ? "OUTDOOR  —  EASY"
    : isCycle
      ? "OUTDOOR  —  CYCLING"
      : isSwim
        ? "POOL  —  FREESTYLE"
        : "STRENGTH  —  INDOOR";

  const fastestLap = laps.reduce(
    (best: Lap | null, l) =>
      !best || (l.avgPace && (!best.avgPace || l.avgPace < best.avgPace)) ? l : best,
    null
  );

  const best1kPace = fastestLap?.avgPace
    ? isSwim
      ? `${formatPace100m(fastestLap.avgPace)}/100M`
      : isCycle
        ? `${formatSpeed(1 / fastestLap.avgPace)} KM/H`
        : `${formatPace(fastestLap.avgPace)}/KM`
    : bestPace
      ? `${formatPace(bestPace)}/KM`
      : null;

  const hrValues = laps.map((l) => l.avgHeartRate).filter(Boolean) as number[];
  const minHR = hrValues.length ? Math.min(...hrValues) : avgHeartRate;
  const maxHRVal = hrValues.length ? Math.max(...hrValues) : maxHeartRate;
  const maxBarH = Math.max(...hrValues, 1);

  const durFmt  = config.hideSeconds   ? formatDurationNoSecs  : formatDuration;
  const distFmt = config.roundDistance ? formatDistanceRounded : formatDistance;

  // Build summary rows — respecting config.show toggles
  const summaryRows: { label: string; value: string }[] = [];
  if (config.show.distance && isEndurance && distance) {
    summaryRows.push({ label: "TOTAL", value: isSwim ? `${Math.round(distance)} M` : `${distFmt(distance)} KM` });
  }
  if (config.show.time) {
    summaryRows.push({ label: "DURATION", value: durFmt(duration) });
  }
  if (config.show.pace && avgPace && isEndurance) {
    summaryRows.push({
      label: isSwim ? "AVG PACE/100M" : isCycle ? "AVG SPEED" : "AVG PACE",
      value: isSwim ? `${formatPace100m(avgPace)}/100M` : isCycle ? `${formatSpeed(1 / avgPace)} KM/H` : `${formatPace(avgPace)}/KM`,
    });
  }
  if (config.show.pace && best1kPace && isRun) {
    summaryRows.push({ label: "BEST 1K", value: best1kPace });
  }
  if (config.show.steps && steps) {
    summaryRows.push({ label: "EST. STEPS", value: steps.toLocaleString() });
  }
  if (config.show.calories && calories) {
    summaryRows.push({ label: "CALORIES", value: `${calories.toLocaleString()} KCAL` });
  }
  if (config.show.elevation && elevGain) {
    summaryRows.push({ label: "ELEVATION", value: `+${Math.round(elevGain)}M` });
  }
  if (!isEndurance && config.show.heartRate) {
    if (avgHeartRate) summaryRows.push({ label: "AVG HR", value: `${avgHeartRate} BPM` });
    if (maxHeartRate) summaryRows.push({ label: "MAX HR", value: `${maxHeartRate} BPM` });
  }

  const paceColLabel = isSwim ? "PACE/100" : isCycle ? "SPEED" : "PACE";
  const showLaps = config.show.laps && laps.length > 1;

  return (
    <div style={{ padding: "0 4px" }}>
      {/* Shadow */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, transform: "translate(4px,4px)", borderRadius: 4, background: "rgba(0,0,0,0.5)" }} />

        {/* Paper */}
        <div
          ref={receiptRef}
          id="run-receipt"
          style={{ position: "relative", background: "#FAFAF8", borderRadius: 4, overflow: "hidden" }}
        >
          {/* Jagged top */}
          <div style={{
            height: 8,
            backgroundImage: "linear-gradient(135deg,#0a0a0a 33.33%,transparent 33.33%),linear-gradient(-135deg,#0a0a0a 33.33%,transparent 33.33%)",
            backgroundSize: "12px 8px",
            backgroundRepeat: "repeat-x",
          }} />

          <div style={{ padding: "16px 18px 24px" }}>
            {/* Header */}
            <p style={{ ...MONO, fontWeight: 700, fontSize: 18, color: "#111", textAlign: "center", marginBottom: 4 }}>{`(>ᴗ•)ᕤ`}</p>
            <p style={{ ...MONO, fontWeight: 700, fontSize: 16, color: "#111", textAlign: "center", marginBottom: 2 }}>{typeLabel}&nbsp;&nbsp;RECEIPT</p>
            <p style={{ ...MONO, fontSize: 11, color: "#555", textAlign: "center" }}>ORDER:#{orderNumber.padStart(4, "0")}</p>
            <p style={{ ...MONO, fontSize: 11, color: "#555", textAlign: "center" }}>{dateStr}</p>
            <p style={{ ...MONO, fontSize: 11, color: "#555", textAlign: "center", marginBottom: 12 }}>{workoutLine}</p>

            <DashLine />

            {/* Route map — below header, above splits */}
            {config.show.route && routePoints && routePoints.length > 1 && (
              <div style={{ margin: "12px 0" }}>
                <RouteMapSvg
                  routePoints={routePoints}
                  viewW={320} viewH={160} padding={14}
                  strokeColor="#1a1a1a"
                  strokeWidth={2}
                  glowOpacity={0}
                  showDots={true}
                />
                <DashLine style={{ marginTop: 12 }} />
              </div>
            )}

            {/* Splits */}
            {showLaps && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "3fr 2.5fr 1fr 2.5fr 2fr", marginTop: 8, marginBottom: 4, ...MONO }}>
                  {["ITEM", paceColLabel, "ZONE", "TIME", "HR"].map((h, i) => (
                    <span key={h} style={{ color: "#888", fontSize: 9, textAlign: i === 0 ? "left" : i === 4 ? "right" : "center" }}>{h}</span>
                  ))}
                </div>
                <DashLine />
                {laps.map((lap) => {
                  const zone = lap.zone || 2;
                  const zoneColor = ZONE_COLORS[zone];
                  const lapPace = lap.avgPace
                    ? isSwim ? formatPace100m(lap.avgPace) : isCycle ? `${formatSpeed(1 / lap.avgPace)}` : formatPace(lap.avgPace)
                    : "—";
                  return (
                    <div key={lap.lapIndex} style={{ display: "grid", gridTemplateColumns: "3fr 2.5fr 1fr 2.5fr 2fr", alignItems: "center", padding: "9px 0", ...MONO }}>
                      <span style={{ color: "#111", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                        {lapDistanceLabel(lap.distance)}
                      </span>
                      <span style={{ color: "#111", fontSize: 11, textAlign: "center" }}>{lapPace}</span>
                      <span style={{ display: "flex", justifyContent: "center" }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: zoneColor, display: "inline-block" }} />
                      </span>
                      <span style={{ color: "#555", fontSize: 11, textAlign: "center" }}>{durFmt(lap.duration)}</span>
                      <span style={{ color: "#555", fontSize: 11, textAlign: "right" }}>{lap.avgHeartRate ?? "—"}</span>
                    </div>
                  );
                })}

                {/* HR summary */}
                {config.show.heartRate && avgHeartRate && (
                  <>
                    <DashLine />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, ...MONO }}>
                      <span style={{ color: "#888", fontSize: 9 }}>HEART RATE</span>
                      <span style={{ color: "#999", fontSize: 9 }}>{minHR}BPM~{maxHRVal ?? "?"}BPM</span>
                      <span style={{ color: "#111", fontWeight: 700, fontSize: 9 }}>{avgHeartRate}BPM</span>
                    </div>
                    {hrValues.length > 0 && (
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginTop: 8, height: 28 }}>
                        {hrValues.map((v, i) => (
                          <div key={i} style={{ flex: 1, height: Math.max(Math.round((v / maxBarH) * 24), 3), borderRadius: 2, background: "#ccc" }} />
                        ))}
                      </div>
                    )}
                  </>
                )}
                <DashLine style={{ marginTop: 12 }} />
              </>
            )}

            {/* Summary */}
            {summaryRows.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {summaryRows.map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, ...MONO }}>
                    <span style={{ color: "#888", fontSize: 9 }}>{label}</span>
                    <span style={{ color: "#111", fontWeight: 700, fontSize: 9 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <DashLine style={{ marginTop: 4 }} />
            <p style={{ ...MONO, fontWeight: 700, fontSize: 9, color: "#888", textAlign: "center", marginTop: 12 }}>*** DUPLICATE COPY ***</p>
            <p style={{ ...MONO, fontSize: 8, color: "#aaa", textAlign: "center", marginTop: 4 }}>KEEP FOR YOUR RECORDS</p>
          </div>

          {/* Jagged bottom */}
          <div style={{
            height: 8,
            backgroundImage: "linear-gradient(45deg,#0a0a0a 33.33%,transparent 33.33%),linear-gradient(-45deg,#0a0a0a 33.33%,transparent 33.33%)",
            backgroundSize: "12px 8px",
            backgroundRepeat: "repeat-x",
            backgroundPosition: "left bottom",
          }} />
        </div>
      </div>
    </div>
  );
}

function DashLine({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      width: "100%",
      height: 1,
      backgroundImage: "repeating-linear-gradient(to right,#bbb 0,#bbb 4px,transparent 4px,transparent 8px)",
      ...style,
    }} />
  );
}
