"use client";
import { useEffect, useRef } from "react";
import { CardConfig, DEFAULT_CONFIG, resolveHero, resolveStats } from "@/lib/cardConfig";
import { getActivityTypeLabel } from "@/lib/utils";
import { format as fmtDate } from "date-fns";
import { type RoutePoint, projectRouteToCanvas } from "@/lib/routeUtils";

export interface AnimatedFlipCardProps {
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
  laps?: {
    lapIndex: number;
    distance: number;
    duration: number;
    avgHeartRate?: number | null;
    avgPace?: number | null;
  }[];
  config?: CardConfig;
  animKey?: number;
  routePoints?: RoutePoint[] | null;
}

const LW = 360, LH = 640, PR = 2; // 9:16
const CW = LW * PR, CH = LH * PR;

export const ANIM_FLIP_DURATION = 5800;

// ─── Types ────────────────────────────────────────────────────────────────────
type Seg = { type: "digit" | "sep"; char: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseSegs(str: string): Seg[] {
  return str.split("").map((c) => ({
    type: /[0-9]/.test(c) ? "digit" : "sep",
    char: c,
  }));
}

/** Pre-compute cumulative flip timestamps (ms from cycle start) for one digit.
 *  Speed decelerates quadratically: 65 ms/flip → 300 ms/flip. */
function computeFlipSchedule(totalMs: number): number[] {
  const sched: number[] = [];
  let t = 0;
  while (t < totalMs) {
    sched.push(t);
    const p = Math.min(1, t / Math.max(1, totalMs));
    t += 65 + p * p * 235;
  }
  return sched;
}

function lerp01(el: number, start: number, dur: number) {
  return Math.max(0, Math.min(1, (el - start) / dur));
}
function easeOut(t: number, exp = 3) {
  return 1 - Math.pow(1 - t, exp);
}

const DC = "0123456789"; // cycling chars for digits

/** Return which characters to show at the current cycle time. */
function getFlipInfo(
  sched: number[],
  cycleElapsed: number,
  cycleDur: number,
  targetChar: string
): { topChar: string; bottomChar: string; flipP: number } {
  if (sched.length === 0) return { topChar: targetChar, bottomChar: targetChar, flipP: 0 };

  let fi = 0;
  for (let i = sched.length - 1; i >= 0; i--) {
    if (sched[i] <= cycleElapsed) { fi = i; break; }
  }

  const flipStart = sched[fi];
  const flipEnd = sched[fi + 1] ?? cycleDur;
  const flipP = Math.min(1, (cycleElapsed - flipStart) / Math.max(1, flipEnd - flipStart));
  const isLast = fi + 1 >= sched.length;

  return {
    topChar: DC[fi % 10],
    bottomChar: isLast ? targetChar : DC[(fi + 1) % 10],
    flipP,
  };
}

/** Draw one split-flap cell.
 *  topChar = character on the descending (outgoing) flap.
 *  bottomChar = character on the ascending (incoming) flap.
 *  flipP ∈ [0,1]: 0–0.5 top folds down, 0.5–1 bottom unfolds from top. */
function drawFlipCell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  topChar: string, bottomChar: string,
  flipP: number, flashA: number,
  s: number
) {
  const halfH = h / 2;
  const midY = y + halfH;
  const r = 7 * s;
  const fontSize = Math.round(h * 0.58);
  const cx = x + w / 2;
  const textY = y + h / 2; // centre of full cell = at midY

  // ── Cell background ────────────────────────────────────────────────────
  ctx.beginPath();
  (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x, y, w, h, r);
  ctx.fillStyle = "#1b1b1b";
  ctx.fill();

  if (flashA > 0) {
    ctx.globalAlpha = flashA * 0.28;
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x, y, w, h, r);
    ctx.fillStyle = "#c8ff00";
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.font = `900 ${fontSize}px system-ui, -apple-system, "Helvetica Neue", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // ── Bottom half: static, always shows incoming char ────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, midY, w, halfH);
  ctx.clip();
  ctx.fillStyle = flashA > 0 ? `rgba(200,255,0,${0.55 + flashA * 0.45})` : "#efefef";
  ctx.fillText(bottomChar, cx, textY);
  ctx.restore();

  // ── Top half: animated flap ────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, halfH);
  ctx.clip();

  if (flipP <= 0.5) {
    // Phase 1: old char squishes down toward mid (scaleY 1 → 0)
    const scaleY = Math.max(0.001, 1 - flipP * 2);
    ctx.save();
    ctx.translate(cx, midY);
    ctx.scale(1, scaleY);
    ctx.translate(-cx, -midY);
    ctx.fillStyle = "#efefef";
    ctx.fillText(topChar, cx, textY);
    // Progressive shadow as it folds
    const shadowA = (1 - scaleY) * 0.5;
    if (shadowA > 0) {
      ctx.globalAlpha = shadowA;
      ctx.fillStyle = "#000";
      ctx.fillRect(x, y, w, halfH);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  } else {
    // Phase 2: new char unfolds from mid (scaleY 0 → 1)
    const scaleY = Math.max(0.001, (flipP - 0.5) * 2);
    ctx.save();
    ctx.translate(cx, midY);
    ctx.scale(1, scaleY);
    ctx.translate(-cx, -midY);
    ctx.fillStyle = flashA > 0 ? `rgba(200,255,0,${0.6 + flashA * 0.4})` : "#efefef";
    ctx.fillText(bottomChar, cx, textY);
    // Shadow fades as it opens
    const shadowA = (1 - scaleY) * 0.35;
    if (shadowA > 0) {
      ctx.globalAlpha = shadowA;
      ctx.fillStyle = "#000";
      ctx.fillRect(x, y, w, halfH);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  ctx.restore();

  // ── Middle divider ─────────────────────────────────────────────────────
  ctx.fillStyle = "#000";
  ctx.fillRect(x, midY - Math.round(s * 0.5), w, Math.round(s * 1.2));
  // subtle bright groove line
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, midY + Math.round(s * 0.5), w, Math.round(s * 0.5));
  ctx.globalAlpha = 1;

  // ── Cell border ─────────────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = s * 0.5;
  ctx.beginPath();
  (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.stroke();
}

/** Draw a separator (colon → two dots, period → single dot). */
function drawSep(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  char: string, alpha: number, s: number
) {
  ctx.globalAlpha = alpha * 0.75;
  ctx.fillStyle = "#c8ff00";
  const dotR = char === ":" ? 4 * s : 3.5 * s;
  const mcx = x + w / 2;

  if (char === ":") {
    ctx.beginPath(); ctx.arc(mcx, y + h * 0.35, dotR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mcx, y + h * 0.65, dotR, 0, Math.PI * 2); ctx.fill();
  } else {
    // period, slash, etc – single dot at lower centre
    ctx.fillStyle = "#888";
    ctx.beginPath(); ctx.arc(mcx, y + h * 0.68, dotR, 0, Math.PI * 2); ctx.fill();
  }

  ctx.globalAlpha = 1;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AnimatedFlipCard({
  canvasRef,
  name, type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  config = DEFAULT_CONFIG,
  animKey = 0,
  routePoints,
}: AnimatedFlipCardProps) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const ref = (canvasRef ?? localRef) as React.RefObject<HTMLCanvasElement>;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext("2d")!;
    const s = PR;

    const actData = {
      type, duration, distance, avgPace,
      avgHeartRate, maxHeartRate, calories, elevGain, steps,
    };
    const { value: heroValue, unit: heroUnit } = resolveHero(config, actData);
    const stats = resolveStats(config, actData, 3);
    const typeLabel = getActivityTypeLabel(type).toUpperCase();
    const titleLabel = config.titleMode === "name" && name ? name.toUpperCase() : typeLabel;
    const dateStr = fmtDate(new Date(startTime), "d MMM yyyy").toUpperCase();

    // Parse hero string into segments
    const segs = parseSegs(heroValue);
    const numDigits = segs.filter((sg) => sg.type === "digit").length;
    const numSeps   = segs.filter((sg) => sg.type === "sep").length;
    const numGaps   = segs.length - 1;

    // ── Timing ────────────────────────────────────────────────────────────
    const CYCLE_START  = 280;
    const LAND_BASE    = 1950;
    const LAND_STAGGER = 390;
    const lastLandTime = LAND_BASE + (numDigits - 1) * LAND_STAGGER + 300;
    const UNIT_IN      = lastLandTime + 260;
    const DIV_IN       = UNIT_IN + 160;
    const STATS_IN     = DIV_IN  + 370;
    const STAT_STAGGER = 265;

    // ── Cell geometry ─────────────────────────────────────────────────────
    const AVAIL  = 316 * s;
    const GAP    = 5 * s;
    const SEP_RATIO = 0.36;
    const cellW  = Math.min(68 * s, Math.floor(
      (AVAIL - numGaps * GAP) / (numDigits + numSeps * SEP_RATIO)
    ));
    const cellH  = Math.round(cellW * 1.2);
    const sepW   = Math.round(cellW * SEP_RATIO);
    const rowW   = numDigits * cellW + numSeps * sepW + numGaps * GAP;
    const rowX   = Math.round((CW - rowW) / 2);
    const rowY   = Math.round(CH / 2 - cellH / 2 - 14 * s);

    // ── Flip schedules ─────────────────────────────────────────────────────
    let dIdxSchedule = 0;
    const schedules: number[][] = segs.map((seg) => {
      if (seg.type === "digit") {
        const landT = LAND_BASE + dIdxSchedule * LAND_STAGGER;
        dIdxSchedule++;
        return computeFlipSchedule(landT - CYCLE_START);
      }
      return [];
    });

    // ── RAF draw loop ──────────────────────────────────────────────────────
    let raf: number;
    const t0 = performance.now();

    function draw(now: number) {
      const el = now - t0;
      ctx.clearRect(0, 0, CW, CH);

      // Background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, CW, CH);

      // Faint background route
      if (config.show.route && routePoints && routePoints.length > 1) {
        const proj = projectRouteToCanvas(routePoints, CW, CH, 48);
        ctx.save();
        ctx.globalAlpha = 0.07;
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

      // Top lime bar
      const barP = easeOut(lerp01(el, 0, 600));
      ctx.fillStyle = "#c8ff00";
      ctx.fillRect(0, 0, CW * barP, 3 * s);

      // Header
      const hdrA = lerp01(el, 60, 500);
      if (hdrA > 0) {
        ctx.globalAlpha = hdrA;
        ctx.font = `700 ${9 * s}px system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillStyle = "#c8ff00";
        ctx.textAlign = "left";
        ctx.fillText(titleLabel, 24 * s, 22 * s);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.textAlign = "right";
        ctx.fillText(dateStr, CW - 24 * s, 22 * s);
        ctx.globalAlpha = 1;
      }

      // Board backdrop shadow
      const boardA = easeOut(lerp01(el, CYCLE_START - 80, 280));
      if (boardA > 0) {
        const pad = 14 * s;
        ctx.globalAlpha = boardA * 0.32;
        ctx.beginPath();
        (ctx as CanvasRenderingContext2D & { roundRect: (...a: number[]) => void })
          .roundRect(rowX - pad, rowY - pad * 0.7, rowW + pad * 2, cellH + pad * 1.4, 10 * s);
        ctx.fillStyle = "#040404";
        ctx.fill();
        ctx.globalAlpha = boardA * 0.1;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = s;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ── Flip cells ───────────────────────────────────────────────────────
      const cellsA = easeOut(lerp01(el, CYCLE_START - 40, 320));
      if (cellsA > 0) {
        let cx = rowX;
        let dIdx = 0;

        for (let i = 0; i < segs.length; i++) {
          const seg = segs[i];
          const cy = rowY;

          if (seg.type === "sep") {
            drawSep(ctx, cx, cy, sepW, cellH, seg.char, cellsA, s);
            cx += sepW;
          } else {
            const landTime = LAND_BASE + dIdx * LAND_STAGGER;
            const cycleElapsed = el - CYCLE_START;
            const cycleDur = landTime - CYCLE_START;

            let topChar = "0", bottomChar = "0", flipP = 0, flashA = 0;

            if (el < CYCLE_START) {
              // Not started yet — show '0'
              topChar = bottomChar = "0"; flipP = 0;
            } else if (el >= landTime + 300) {
              // Fully settled
              topChar = bottomChar = seg.char; flipP = 0;
            } else if (el >= landTime) {
              // Final landing flip
              const landP = (el - landTime) / 300;
              const lastDigitOfSchedule = schedules[i];
              topChar = DC[(lastDigitOfSchedule.length) % 10];
              bottomChar = seg.char;
              flipP = Math.min(1, landP);
              flashA = Math.max(0, 1 - (el - landTime) / 270);
            } else {
              // Cycling
              const info = getFlipInfo(
                schedules[i],
                Math.min(cycleElapsed, cycleDur),
                cycleDur,
                seg.char
              );
              topChar = info.topChar;
              bottomChar = info.bottomChar;
              flipP = info.flipP;
            }

            ctx.save();
            ctx.globalAlpha = cellsA;
            drawFlipCell(ctx, cx, cy, cellW, cellH, topChar, bottomChar, flipP, flashA, s);
            ctx.restore();

            cx += cellW;
            dIdx++;
          }

          if (i < segs.length - 1) cx += GAP;
        }
      }

      // ── Unit label ───────────────────────────────────────────────────────
      if (heroUnit) {
        const unitA = easeOut(lerp01(el, UNIT_IN, 450));
        if (unitA > 0) {
          ctx.globalAlpha = unitA;
          ctx.font = `700 ${13 * s}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "#c8ff00";
          ctx.fillText(heroUnit, CW / 2, rowY + cellH + 13 * s);
          ctx.globalAlpha = 1;
        }
      }

      // ── Divider ──────────────────────────────────────────────────────────
      const divA = easeOut(lerp01(el, DIV_IN, 500));
      if (divA > 0) {
        const divY = rowY + cellH + (heroUnit ? 37 : 18) * s;
        ctx.globalAlpha = divA * 0.15;
        ctx.fillStyle = "#fff";
        ctx.fillRect(24 * s, divY, (CW - 48 * s) * divA, s);
        ctx.globalAlpha = 1;
      }

      // ── Secondary stats ──────────────────────────────────────────────────
      if (stats.length > 0) {
        const statBaseY = rowY + cellH + (heroUnit ? 52 : 30) * s;
        const statCellW = (CW - 48 * s) / stats.length;
        stats.forEach(({ label, value }, i) => {
          const statA = easeOut(lerp01(el, STATS_IN + i * STAT_STAGGER, 500));
          if (statA <= 0) return;
          const lift = (1 - statA) * 16 * s;
          const scx = 24 * s + i * statCellW + statCellW / 2;
          const sy  = statBaseY - lift;

          ctx.globalAlpha = statA;
          if (i > 0) {
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fillRect(24 * s + i * statCellW, sy - 18 * s, s, 56 * s);
          }
          ctx.fillStyle = "#fff";
          ctx.font = `700 ${15 * s}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(value, scx, sy);
          ctx.fillStyle = "rgba(255,255,255,0.38)";
          ctx.font = `500 ${8 * s}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(label, scx, sy + 22 * s);
          ctx.globalAlpha = 1;
        });
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    animKey,
    name, type, startTime, duration, distance,
    avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps,
    config, routePoints,
  ]);

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
