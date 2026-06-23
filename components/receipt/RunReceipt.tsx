"use client";
import {
  formatPace,
  formatDuration,
  formatDistance,
  ZONE_COLORS,
  lapDistanceLabel,
} from "@/lib/utils";
import { format } from "date-fns";

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
}

export function RunReceipt({
  receiptRef,
  name,
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
}: RunReceiptProps) {
  const bestLapPace = laps.length
    ? laps.reduce((best, l) => (!best || (l.avgPace && l.avgPace < best) ? l.avgPace! : best), 0)
    : null;

  const fastestLapIndex = laps.length
    ? laps.reduce((bi, l, i, arr) => (l.avgPace && (!arr[bi].avgPace || l.avgPace < arr[bi].avgPace!) ? i : bi), 0)
    : -1;

  const hrValues = laps.map((l) => l.avgHeartRate).filter(Boolean) as number[];
  const minHR = hrValues.length ? Math.min(...hrValues) : avgHeartRate;
  const maxHR = hrValues.length ? Math.max(...hrValues) : maxHeartRate;

  return (
    <div className="px-1">
      {/* Receipt wrapper */}
      <div
        ref={receiptRef}
        id="run-receipt"
        className="bg-[#FAFAF8] text-[#111] font-receipt receipt-top receipt-bottom shadow-2xl"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}
      >
        <div className="px-6 py-6">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🏃</div>
            <h1 className="text-lg font-black tracking-widest uppercase">Run Receipt</h1>
            <p className="text-xs text-[#555] mt-2 uppercase tracking-wider">
              Order:#{orderNumber.padStart(4, "0")}
            </p>
            <p className="text-xs text-[#555] uppercase tracking-wider">
              {format(new Date(startTime), "MMMM d, yyyy")}
            </p>
            <p className="text-xs text-[#555] uppercase tracking-wider">
              {type.toUpperCase()} — {name.toUpperCase()}
            </p>
          </div>

          <DashLine />

          {/* Column headers */}
          <div className="grid grid-cols-[3fr_3fr_1fr_2.5fr_2fr] text-[9px] text-[#888] uppercase tracking-wider mb-1">
            <span>Item</span>
            <span className="text-center">Pace</span>
            <span className="text-center">Zn</span>
            <span className="text-center">Time</span>
            <span className="text-right">HR</span>
          </div>

          <DashLine />

          {/* Lap rows */}
          {laps.length > 0 ? (
            <div className="space-y-0.5 my-1">
              {laps.map((lap, i) => {
                const isFastest = i === fastestLapIndex && laps.length > 2;
                const zone = lap.zone || 2;
                const zoneColor = ZONE_COLORS[zone];
                return (
                  <div
                    key={lap.lapIndex}
                    className="grid grid-cols-[3fr_3fr_1fr_2.5fr_2fr] items-center text-[11px] py-0.5"
                  >
                    <span className="font-medium flex items-center gap-1">
                      {lapDistanceLabel(lap.distance)}
                      {isFastest && (
                        <span
                          className="text-[7px] font-black px-1 py-0.5 rounded"
                          style={{ background: "#111", color: "#FAFAF8" }}
                        >
                          FAST
                        </span>
                      )}
                    </span>
                    <span className="text-center text-[#111]">
                      {lap.avgPace ? formatPace(lap.avgPace) : "—"}
                    </span>
                    <span className="flex justify-center">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ background: zoneColor }}
                      />
                    </span>
                    <span className="text-center text-[#555]">
                      {formatDuration(lap.duration)}
                    </span>
                    <span className="text-right text-[#555]">
                      {lap.avgHeartRate ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-[10px] text-[#888] py-3">No lap data</p>
          )}

          <DashLine />

          {/* HR summary */}
          <div className="flex justify-between items-center text-[10px] my-2">
            <span className="text-[#888] uppercase tracking-wider">Heart Rate</span>
            <span className="text-[#888]">
              {minHR}BPM ~ {maxHR}BPM
            </span>
            <span className="font-bold">{avgHeartRate}BPM</span>
          </div>

          {/* HR sparkline */}
          {hrValues.length > 0 && (
            <div className="flex items-end gap-1 h-8 mb-3">
              {hrValues.map((v, i) => {
                const minV = Math.min(...hrValues);
                const maxV = Math.max(...hrValues);
                const h = Math.round(((v - minV) / (maxV - minV)) * 24) + 4;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{ height: h, background: "#CCC" }}
                  />
                );
              })}
            </div>
          )}

          <DashLine />

          {/* Totals */}
          <div className="space-y-1 my-3 text-[11px]">
            <TotalRow label="TOTAL" value={distance ? `${formatDistance(distance)} KM` : "—"} bold />
            <TotalRow label="DURATION" value={formatDuration(duration)} />
            {avgPace && <TotalRow label="AVG PACE" value={formatPace(avgPace) + "/KM"} />}
            {bestLapPace && <TotalRow label="BEST 1K" value={formatPace(bestLapPace) + "/KM"} />}
            {steps && <TotalRow label="EST. STEPS" value={steps.toLocaleString()} />}
            {calories && <TotalRow label="CALORIES" value={`${calories} KCAL`} />}
            {elevGain && <TotalRow label="ELEVATION" value={`+${Math.round(elevGain)}m`} />}
          </div>

          <DashLine />

          {/* Footer */}
          <div className="text-center mt-4 space-y-1">
            <p className="text-[10px] font-bold text-[#666] tracking-widest">
              *** DUPLICATE COPY ***
            </p>
            <p className="text-[9px] text-[#999] tracking-wider uppercase">
              Keep for your records
            </p>
            <p className="text-[8px] text-[#BBB] leading-relaxed mt-2">
              Every run leaves a trace. TryAthlete turns it into
              <br />
              something you can keep and share.
            </p>
            <p className="text-[10px] font-bold text-[#555] mt-3">
              🏃 TryAthlete · tryathlete.app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashLine() {
  return (
    <div
      className="my-2"
      style={{
        borderTop: "1px dashed #BBBBB",
        borderTopColor: "#BBBBBB",
      }}
    />
  );
}

function TotalRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-[#888] uppercase tracking-wider">{label}</span>
      <span className={bold ? "font-bold text-[#111]" : "font-medium text-[#333]"}>
        {value}
      </span>
    </div>
  );
}
