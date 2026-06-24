"use client";
import { useEffect, useRef } from "react";
import { CardConfig, DEFAULT_CONFIG, resolveStats } from "@/lib/cardConfig";
import { getActivityTypeLabel } from "@/lib/utils";
import { format as fmtDate } from "date-fns";

export interface AnimatedCountCardProps {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
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
}

// Logical px → canvas px at 2× for crisp export  (9:16 = 360×640)
const LW = 360;
const LH = 640;
const PR = 2;
const CW = LW * PR;
const CH = LH * PR;

export const ANIM_COUNT_DURATION = 5500; // ms — used by share page for video length

// Animation milestones (ms)
const BAR_START    = 0;
const BAR_DUR      = 700;
const HDR_START    = 150;
const HDR_DUR      = 500;
const COUNT_START  = 300;
const COUNT_DUR    = 2800;
const UNIT_START   = COUNT_START + COUNT_DUR + 100;
const DIV_START    = UNIT_START + 100;
const STAT0_START  = DIV_START + 300;
const STAT_STAGGER = 260;

function easeOut(t: number, exp = 3) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), exp);
}
function lerp01(elapsed: number, start: number, dur: number) {
  return Math.max(0, Math.min(1, (elapsed - start) / dur));
}

export function AnimatedCountCard({
  canvasRef,
  type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  config = DEFAULT_CONFIG,
  animKey = 0,
}: AnimatedCountCardProps) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = (canvasRef ?? localRef) as React.RefObject<HTMLCanvasElement>;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext("2d")!;

    // ── Hero numeric value ─────────────────────────────────────────────
    const tl = type.toLowerCase();
    const isSwim = tl.includes("swim");
    const isCycle = tl.includes("cycl") || tl.includes("bike") || tl.includes("ride");

    let heroFinal = 0;
    let heroUnit = "";
    let heroIsTime = false;
    let heroDecimals = 1;

    if (config.hero === "distance" && distance) {
      if (isSwim) { heroFinal = Math.round(distance); heroUnit = "M"; heroDecimals = 0; }
      else { heroFinal = distance / 1000; heroUnit = "KM"; }
    } else if (config.hero === "pace" && avgPace) {
      heroFinal = avgPace * 1000; // sec/km
      heroUnit = "/KM"; heroIsTime = true;
    } else {
      heroFinal = duration; heroIsTime = true;
    }

    function fmtHero(v: number): string {
      if (heroIsTime) {
        const sec = Math.round(v);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        return `${m}:${String(s).padStart(2, "0")}`;
      }
      return heroDecimals > 0 ? v.toFixed(heroDecimals) : Math.round(v).toString();
    }

    const data = { type, duration, distance, avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps };
    const stats = resolveStats(config, data, 3);
    const typeLabel = getActivityTypeLabel(type).toUpperCase();
    const dateStr = fmtDate(new Date(startTime), "d MMM yyyy").toUpperCase();

    const s = PR;
    let raf: number;
    const t0 = performance.now();

    function draw(now: number) {
      const el = now - t0;
      ctx.clearRect(0, 0, CW, CH);

      // Background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, CW, CH);

      // ── Lime top bar grows left → right ───────────────────────────
      const barP = easeOut(lerp01(el, BAR_START, BAR_DUR));
      ctx.fillStyle = "#c8ff00";
      ctx.fillRect(0, 0, CW * barP, 3 * s);

      // ── Header: type (lime) left, date (dim) right ────────────────
      const hdrA = lerp01(el, HDR_START, HDR_DUR);
      if (hdrA > 0) {
        ctx.globalAlpha = hdrA;
        ctx.font = `700 ${9 * s}px system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = "top";

        ctx.fillStyle = "#c8ff00";
        ctx.textAlign = "left";
        ctx.fillText(typeLabel, 24 * s, 22 * s);

        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.textAlign = "right";
        ctx.fillText(dateStr, CW - 24 * s, 22 * s);
        ctx.globalAlpha = 1;
      }

      // ── Hero count-up ─────────────────────────────────────────────
      const countP  = easeOut(lerp01(el, COUNT_START, COUNT_DUR), 4);
      const heroVal = countP * heroFinal;
      const display = fmtHero(heroVal);
      const heroY   = CH / 2 - 4 * s;

      // Ghost leading digit (motion-blur feel)
      if (countP < 0.97) {
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = "#c8ff00";
        ctx.font = `900 ${78 * s}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(fmtHero(Math.min(heroFinal, heroVal + heroFinal * 0.04)), CW / 2, heroY + 4 * s);
        ctx.globalAlpha = 1;
      }

      // Main hero number
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${78 * s}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(display, CW / 2, heroY);

      // Unit label
      const unitA = easeOut(lerp01(el, UNIT_START, 500));
      if (unitA > 0 && heroUnit) {
        ctx.globalAlpha = unitA;
        ctx.fillStyle = "#c8ff00";
        ctx.font = `600 ${13 * s}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(heroUnit, CW / 2, heroY + 48 * s);
        ctx.globalAlpha = 1;
      }

      // ── Divider grows left → right ────────────────────────────────
      const divA = easeOut(lerp01(el, DIV_START, 600));
      if (divA > 0) {
        ctx.globalAlpha = divA * 0.18;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(24 * s, heroY + 76 * s, (CW - 48 * s) * divA, 1 * s);
        ctx.globalAlpha = 1;
      }

      // ── Secondary stats slide up + fade in ───────────────────────
      if (stats.length > 0) {
        const cellW = (CW - 48 * s) / stats.length;
        stats.forEach(({ label, value }, i) => {
          const statA  = easeOut(lerp01(el, STAT0_START + i * STAT_STAGGER, 500));
          if (statA <= 0) return;
          const lift   = (1 - statA) * 18 * s;
          const cx     = 24 * s + i * cellW + cellW / 2;
          const statY  = heroY + 100 * s - lift;

          ctx.globalAlpha = statA;

          // Vertical divider between cells
          if (i > 0) {
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fillRect(24 * s + i * cellW, statY - 18 * s, 1 * s, 54 * s);
          }

          ctx.fillStyle = "#ffffff";
          ctx.font = `700 ${15 * s}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(value, cx, statY);

          ctx.fillStyle = "rgba(255,255,255,0.38)";
          ctx.font = `500 ${8 * s}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(label, cx, statY + 22 * s);

          ctx.globalAlpha = 1;
        });
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [animKey, type, startTime, duration, distance, avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps, config]);

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
