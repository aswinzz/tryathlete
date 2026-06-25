"use client";
import { useEffect, useRef } from "react";
import { CardConfig, DEFAULT_CONFIG, resolveStats } from "@/lib/cardConfig";
import { getActivityTypeLabel } from "@/lib/utils";
import { format as fmtDate } from "date-fns";
import { type RoutePoint, projectRouteToCanvas } from "@/lib/routeUtils";

export interface AnimatedECGCardProps {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  name?: string;
  type: string;
  startTime: Date;
  duration: number;
  distance?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  avgPace?: number | null;
  calories?: number | null;
  elevGain?: number | null;
  steps?: number | null;
  laps?: { lapIndex: number; distance: number; duration: number; avgHeartRate?: number | null; avgPace?: number | null }[];
  config?: CardConfig;
  animKey?: number;
  routePoints?: RoutePoint[] | null;
}

const LW = 360, LH = 640, PR = 2; // 9:16
const CW = LW * PR, CH = LH * PR;

export const ANIM_ECG_DURATION = 6200;

// One ECG beat: [normalised position within beat (0–1), amplitude (-1 down → +1 up)]
const BEAT: [number, number][] = [
  [0.00,  0.00],
  [0.07,  0.00],  // flat
  [0.12,  0.09],  // P wave up
  [0.17,  0.13],  // P wave peak
  [0.22,  0.00],  // P wave down
  [0.29,  0.00],  // PR segment
  [0.32, -0.09],  // Q dip
  [0.36,  1.00],  // R peak  ← tall spike
  [0.40, -0.30],  // S wave
  [0.45,  0.00],  // return baseline
  [0.53,  0.17],  // T wave up
  [0.62,  0.20],  // T wave peak
  [0.71,  0.00],  // T wave down
  [1.00,  0.00],  // flat
];

function yAtBeatProgress(p: number): number {
  for (let i = 1; i < BEAT.length; i++) {
    if (p <= BEAT[i][0]) {
      const [t0, y0] = BEAT[i - 1];
      const [t1, y1] = BEAT[i];
      return y0 + (y1 - y0) * ((p - t0) / (t1 - t0));
    }
  }
  return 0;
}

const NUM_BEATS   = 2;
const PTS_PER_BEAT = 140; // high res for smooth curves

function buildPath(centerY: number, amplitude: number) {
  const pts: { x: number; y: number }[] = [];
  for (let b = 0; b < NUM_BEATS; b++) {
    for (let i = 0; i < PTS_PER_BEAT; i++) {
      const bp = i / PTS_PER_BEAT;
      pts.push({
        x: ((b + bp) / NUM_BEATS) * CW,
        y: centerY - yAtBeatProgress(bp) * amplitude,
      });
    }
  }
  pts.push({ x: CW, y: centerY });
  return pts;
}

function lerp01(el: number, start: number, dur: number) {
  return Math.max(0, Math.min(1, (el - start) / dur));
}
function easeOut(t: number, exp = 3) {
  return 1 - Math.pow(1 - t, exp);
}
function fmtSec(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AnimatedECGCard({
  canvasRef, name, type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  config = DEFAULT_CONFIG,
  animKey = 0,
  routePoints,
}: AnimatedECGCardProps) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = (canvasRef ?? localRef) as React.RefObject<HTMLCanvasElement>;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext("2d")!;
    const s = PR;

    const ECG_CENTER_Y = 255 * s;  // 40% of 640 logical
    const AMPLITUDE    = 72 * s;
    const pathPts = buildPath(ECG_CENTER_Y, AMPLITUDE);

    const typeLabel = getActivityTypeLabel(type).toUpperCase();
    const titleLabel = config.titleMode === "name" && name ? name.toUpperCase() : typeLabel;
    const dateStr   = fmtDate(new Date(startTime), "d MMM yyyy").toUpperCase();
    const data = { type, duration, distance, avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps };
    const stats = resolveStats(config, data, 3);

    // Hero: always avg HR if available, else fallback to duration
    const heroVal  = avgHeartRate ? avgHeartRate.toString() : fmtSec(duration);
    const heroUnit = avgHeartRate ? "BPM" : "TIME";
    const heroSub  = avgHeartRate
      ? (maxHeartRate ? `MAX ${maxHeartRate} BPM` : "AVG HEART RATE")
      : "DURATION";

    // Timing (ms)
    const ECG_START   = 300;
    const ECG_DUR     = 2600;
    const ECG_END     = ECG_START + ECG_DUR;
    const DIM_START   = ECG_END;
    const DIM_DUR     = 600;
    const HERO_IN     = ECG_END + 300;
    const DIV_IN      = HERO_IN + 250;
    const STATS_IN    = DIV_IN  + 300;
    const STAGGER     = 260;

    let raf: number;
    const t0 = performance.now();

    function draw(now: number) {
      const el = now - t0;
      ctx.clearRect(0, 0, CW, CH);

      // ── Background ────────────────────────────────────────────────────
      ctx.fillStyle = "#04090a";
      ctx.fillRect(0, 0, CW, CH);

      // ── Faint background route ────────────────────────────────────────
      if (config.show.route && routePoints && routePoints.length > 1) {
        const proj = projectRouteToCanvas(routePoints, CW, CH, 48);
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = "#c8ff00";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(proj[0].x, proj[0].y);
        for (let i = 1; i < proj.length; i++) ctx.lineTo(proj[i].x, proj[i].y);
        ctx.stroke();
        ctx.restore();
      }

      // ── ECG grid ─────────────────────────────────────────────────────
      const gridA = easeOut(lerp01(el, 0, 600));
      if (gridA > 0) {
        ctx.globalAlpha = gridA * 0.07;
        ctx.strokeStyle = "#c8ff00";
        ctx.lineWidth = 1;
        for (let y = 0; y < CH; y += 18 * s) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
        }
        for (let x = 0; x < CW; x += 18 * s) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // ── Header ────────────────────────────────────────────────────────
      const hdrA = lerp01(el, 0, 500);
      if (hdrA > 0) {
        ctx.globalAlpha = hdrA;
        ctx.font = `600 ${8 * s}px system-ui, monospace`;
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(200,255,0,0.55)";
        ctx.fillText(titleLabel, 20 * s, 18 * s);
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillText(dateStr, CW - 20 * s, 18 * s);
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(200,255,0,0.25)";
        ctx.fillText("HEART RATE MONITOR", CW / 2, 18 * s);
        ctx.globalAlpha = 1;
      }

      // ── ECG waveform ─────────────────────────────────────────────────
      const ecgP   = lerp01(el, ECG_START, ECG_DUR);
      const dimP   = easeOut(lerp01(el, DIM_START, DIM_DUR));
      const ecgAlpha = 1 - dimP * 0.78; // dims from 1 → 0.22
      const drawUpTo = Math.max(2, Math.floor(ecgP * pathPts.length));
      const pts    = pathPts.slice(0, drawUpTo);

      if (pts.length > 1) {
        ctx.globalAlpha = ecgAlpha;
        ctx.lineJoin = "round";
        ctx.lineCap  = "round";

        // Outer glow
        ctx.beginPath();
        pts.forEach(({ x, y }, i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.strokeStyle = "rgba(200,255,0,0.08)";
        ctx.lineWidth = 22 * s;
        ctx.stroke();

        // Inner glow
        ctx.beginPath();
        pts.forEach(({ x, y }, i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.strokeStyle = "rgba(200,255,0,0.20)";
        ctx.lineWidth = 9 * s;
        ctx.stroke();

        // Main line
        ctx.beginPath();
        pts.forEach(({ x, y }, i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.strokeStyle = "#c8ff00";
        ctx.lineWidth = 2.5 * s;
        ctx.stroke();

        // Glowing head
        if (ecgP < 1) {
          const head = pts[pts.length - 1];
          ctx.shadowBlur  = 22 * s;
          ctx.shadowColor = "#c8ff00";
          ctx.fillStyle   = "#ffffff";
          ctx.beginPath();
          ctx.arc(head.x, head.y, 5 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.globalAlpha = 1;
      }

      // ── Radial mask behind hero number (fades in as ECG dims) ────────
      if (dimP > 0) {
        const maskR = ctx.createRadialGradient(CW / 2, ECG_CENTER_Y, 0, CW / 2, ECG_CENTER_Y, 110 * s);
        maskR.addColorStop(0, `rgba(4,9,10,${dimP * 0.88})`);
        maskR.addColorStop(1, "transparent");
        ctx.fillStyle = maskR;
        ctx.fillRect(0, ECG_CENTER_Y - 120 * s, CW, 240 * s);
      }

      // ── Hero BPM number ───────────────────────────────────────────────
      const heroA = easeOut(lerp01(el, HERO_IN, 500));
      if (heroA > 0) {
        ctx.globalAlpha = heroA;

        ctx.fillStyle = "#ffffff";
        ctx.font = `900 ${74 * s}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(heroVal, CW / 2, ECG_CENTER_Y);

        ctx.fillStyle = "#c8ff00";
        ctx.font = `700 ${12 * s}px system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText(heroUnit, CW / 2, ECG_CENTER_Y + 44 * s);

        ctx.fillStyle = "rgba(255,255,255,0.30)";
        ctx.font = `500 ${7 * s}px system-ui, monospace`;
        ctx.fillText(heroSub, CW / 2, ECG_CENTER_Y + 60 * s);

        ctx.globalAlpha = 1;
      }

      // ── Divider ───────────────────────────────────────────────────────
      const divA = easeOut(lerp01(el, DIV_IN, 500));
      if (divA > 0) {
        ctx.globalAlpha = divA * 0.18;
        ctx.fillStyle = "#c8ff00";
        ctx.fillRect(20 * s, 400 * s, (CW - 40 * s) * divA, 1 * s);
        ctx.globalAlpha = 1;
      }

      // ── Secondary stats ───────────────────────────────────────────────
      if (stats.length > 0) {
        const cellW = (CW - 40 * s) / stats.length;
        stats.forEach(({ label, value }, i) => {
          const statA = easeOut(lerp01(el, STATS_IN + i * STAGGER, 450));
          if (statA <= 0) return;
          const lift = (1 - statA) * 16 * s;
          const cx   = 20 * s + i * cellW + cellW / 2;
          const sy   = 460 * s - lift;

          ctx.globalAlpha = statA;

          if (i > 0) {
            ctx.fillStyle = "rgba(200,255,0,0.12)";
            ctx.fillRect(20 * s + i * cellW, sy - 16 * s, 1 * s, 54 * s);
          }

          ctx.fillStyle = "#ffffff";
          ctx.font = `700 ${14 * s}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(value, cx, sy);

          ctx.fillStyle = "rgba(200,255,0,0.5)";
          ctx.font = `500 ${8 * s}px system-ui, monospace`;
          ctx.fillText(label, cx, sy + 20 * s);

          ctx.globalAlpha = 1;
        });
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [animKey, name, type, startTime, duration, distance, avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps, config, routePoints]);

  return (
    <canvas
      ref={ref}
      style={{
        width: "100%",
        aspectRatio: `${LW} / ${LH}`,
        display: "block",
        borderRadius: 0,
      }}
    />
  );
}
