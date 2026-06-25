"use client";
import { useEffect, useRef } from "react";
import { CardConfig, DEFAULT_CONFIG, resolveHero, resolveStats } from "@/lib/cardConfig";
import { getActivityTypeLabel } from "@/lib/utils";
import { format as fmtDate } from "date-fns";
import { RoutePoint } from "@/lib/routeUtils";

export interface AnimatedRouteCardProps {
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
  laps?: unknown[];
  config?: CardConfig;
  animKey?: number;
  routePoints?: RoutePoint[] | null;
}

// 9:16 canvas at 2× pixel ratio
const LW = 360;
const LH = 640;
const PR = 2;
const CW = LW * PR;
const CH = LH * PR;

// Timing (ms)
const TRACE_START    = 200;
const TRACE_DUR      = 2800;
const HERO_START     = TRACE_START + TRACE_DUR - 200;
const HERO_DUR       = 600;
const STATS_START    = HERO_START + HERO_DUR + 200;
const STATS_STAGGER  = 220;
const TOTAL_DUR      = STATS_START + STATS_STAGGER * 3 + 800;

export const ANIM_ROUTE_DURATION = TOTAL_DUR;

// Design tokens (logical coords)
const BG     = "#060911";
const ACCENT = "#c8ff00";
const TEXT   = "#ffffff";
const TEXT2  = "rgba(255,255,255,0.45)";
const TEXT3  = "rgba(255,255,255,0.20)";
const SURFACE = "#0d1320";

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
function easeOut(t: number) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}
function lerp01(elapsed: number, start: number, dur: number) {
  return Math.max(0, Math.min(1, (elapsed - start) / dur));
}

/** Normalise lat/lon array into canvas-space (x, y) points. */
function projectRoute(
  pts: RoutePoint[],
  canvasW: number,
  canvasH: number,
  mapTop: number,
  mapH: number,
  pad: number
): { x: number; y: number }[] {
  const lats = pts.map((p) => p.lat);
  const lons = pts.map((p) => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const latR = maxLat - minLat || 0.001;
  const lonR = maxLon - minLon || 0.001;
  const w = canvasW - pad * 2;
  const h = mapH - pad * 2;
  const scale = Math.min(w / lonR, h / latR);
  const drawW = lonR * scale;
  const drawH = latR * scale;
  const ox = pad + (w - drawW) / 2;
  const oy = mapTop + pad + (h - drawH) / 2;

  return pts.map((p) => ({
    x: ox + ((p.lon - minLon) / lonR) * drawW,
    y: oy + drawH - ((p.lat - minLat) / latR) * drawH,
  }));
}

export function AnimatedRouteCard({
  canvasRef,
  name, type, startTime, duration, distance,
  avgHeartRate, avgPace, calories, elevGain, steps,
  config = DEFAULT_CONFIG,
  animKey = 0,
  routePoints,
}: AnimatedRouteCardProps) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = canvasRef ?? localRef;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext("2d")!;

    const typeLabel = getActivityTypeLabel(type).toUpperCase();
    const titleLabel = config.titleMode === "name" && name ? name.toUpperCase() : typeLabel;
    const dateStr = fmtDate(new Date(startTime), "MMM d, yyyy").toUpperCase();

    const data = { type, duration, distance, avgPace, avgHeartRate, calories, elevGain, steps };
    const { value: heroValue, unit: heroUnit } = resolveHero(config, data);
    const stats = resolveStats(config, data, 3);

    // Map region (in canvas px)
    const MAP_TOP  = 160;   // canvas px (logical 80)
    const MAP_H    = 600;   // canvas px (logical 300)
    const MAP_PAD  = 48;    // canvas px

    // Project route to canvas coords
    const projectedPts = routePoints && routePoints.length > 1
      ? projectRoute(routePoints, CW, CH, MAP_TOP, MAP_H, MAP_PAD)
      : null;

    let raf = 0;
    let start: number | null = null;

    function draw(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;

      ctx.clearRect(0, 0, CW, CH);

      // ── Background ───────────────────────────────────────────────────────
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, CW, CH);

      // ── Map area ─────────────────────────────────────────────────────────
      ctx.fillStyle = SURFACE;
      ctx.fillRect(0, MAP_TOP, CW, MAP_H);

      // ── Accent bar ───────────────────────────────────────────────────────
      const barProgress = easeOut(lerp01(elapsed, 0, 400));
      ctx.fillStyle = ACCENT;
      ctx.fillRect(44, 44, Math.round(72 * barProgress), 6);

      // ── Header text ──────────────────────────────────────────────────────
      const hdrAlpha = easeOut(lerp01(elapsed, 100, 400));
      ctx.globalAlpha = hdrAlpha;
      ctx.font = `700 ${20}px system-ui, sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.fillText(titleLabel, 44, 96);
      ctx.font = `600 ${18}px system-ui, sans-serif`;
      ctx.fillStyle = TEXT3;
      ctx.fillText(dateStr, 44, 120);
      ctx.globalAlpha = 1;

      // ── Route trace ───────────────────────────────────────────────────────
      if (projectedPts) {
        const traceT = easeInOut(lerp01(elapsed, TRACE_START, TRACE_DUR));
        const numPts = Math.floor(projectedPts.length * traceT);

        if (numPts > 1) {
          const drawn = projectedPts.slice(0, numPts + 1);

          // Glow pass
          ctx.save();
          ctx.globalAlpha = 0.18;
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = 14;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(drawn[0].x, drawn[0].y);
          for (let i = 1; i < drawn.length; i++) ctx.lineTo(drawn[i].x, drawn[i].y);
          ctx.stroke();
          ctx.restore();

          // Main line
          ctx.save();
          ctx.globalAlpha = 0.92;
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(drawn[0].x, drawn[0].y);
          for (let i = 1; i < drawn.length; i++) ctx.lineTo(drawn[i].x, drawn[i].y);
          ctx.stroke();
          ctx.restore();

          // Start dot
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = TEXT;
          ctx.beginPath();
          ctx.arc(drawn[0].x, drawn[0].y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Moving dot at tip (while tracing)
          if (traceT < 0.98) {
            const tip = drawn[drawn.length - 1];
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = ACCENT;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = 1;
            ctx.fillStyle = ACCENT;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            // Finished — show end dot
            const tip = drawn[drawn.length - 1];
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = ACCENT;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.fillStyle = ACCENT;
            ctx.beginPath();
            ctx.arc(tip.x, tip.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      } else {
        // No route — show placeholder
        const alpha = easeOut(lerp01(elapsed, TRACE_START, 600));
        ctx.globalAlpha = alpha * 0.35;
        ctx.font = `600 ${28}px system-ui, sans-serif`;
        ctx.fillStyle = TEXT;
        ctx.textAlign = "center";
        ctx.fillText("No GPS data", CW / 2, MAP_TOP + MAP_H / 2);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
      }

      // ── Hero stat ─────────────────────────────────────────────────────────
      const heroY = MAP_TOP + MAP_H + 80;
      const heroAlpha = easeOut(lerp01(elapsed, HERO_START, HERO_DUR));
      ctx.globalAlpha = heroAlpha;

      ctx.font = `900 ${112}px system-ui, sans-serif`;
      ctx.fillStyle = TEXT;
      ctx.fillText(heroValue, 44, heroY + 90);

      if (heroUnit) {
        ctx.font = `700 ${36}px system-ui, sans-serif`;
        ctx.fillStyle = TEXT2;
        const heroW = ctx.measureText(heroValue).width;
        // Measure at the big font before switching
        const heroFont = `900 ${112}px system-ui, sans-serif`;
        ctx.font = heroFont;
        const hw = ctx.measureText(heroValue).width;
        ctx.font = `700 ${36}px system-ui, sans-serif`;
        ctx.fillText(heroUnit, 44 + hw + 12, heroY + 80);
      }
      ctx.globalAlpha = 1;

      // ── Divider ───────────────────────────────────────────────────────────
      const divY = heroY + 120;
      const divAlpha = easeOut(lerp01(elapsed, STATS_START - 200, 300));
      ctx.globalAlpha = divAlpha * 0.15;
      ctx.fillStyle = TEXT;
      ctx.fillRect(44, divY, CW - 88, 2);
      ctx.globalAlpha = 1;

      // ── Secondary stats ───────────────────────────────────────────────────
      const statY = divY + 48;
      const colW = (CW - 88) / Math.max(stats.length, 1);

      stats.forEach(({ label, value }, i) => {
        const alpha = easeOut(lerp01(elapsed, STATS_START + i * STATS_STAGGER, 500));
        if (alpha <= 0) return;
        const x = 44 + i * colW;

        if (i > 0) {
          ctx.globalAlpha = alpha * 0.15;
          ctx.fillStyle = TEXT;
          ctx.fillRect(x, statY - 8, 2, 72);
          ctx.globalAlpha = 1;
        }

        ctx.globalAlpha = alpha;
        ctx.font = `800 ${38}px system-ui, sans-serif`;
        ctx.fillStyle = TEXT;
        ctx.fillText(value, x + (i > 0 ? 24 : 0), statY + 36);

        ctx.font = `600 ${18}px system-ui, sans-serif`;
        ctx.fillStyle = TEXT2;
        ctx.fillText(label, x + (i > 0 ? 24 : 0), statY + 64);
        ctx.globalAlpha = 1;
      });

      if (elapsed < TOTAL_DUR + 600) {
        raf = requestAnimationFrame(draw);
      }
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey, routePoints]);

  return (
    <canvas
      ref={ref}
      style={{ display: "block", width: "100%", aspectRatio: "9/16", borderRadius: 16 }}
    />
  );
}
