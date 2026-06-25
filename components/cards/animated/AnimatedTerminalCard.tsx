"use client";
import { useEffect, useRef } from "react";
import { CardConfig, DEFAULT_CONFIG, resolveHero, resolveStats } from "@/lib/cardConfig";
import { getActivityTypeLabel } from "@/lib/utils";
import { format as fmtDate } from "date-fns";

export interface AnimatedTerminalCardProps {
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
}

const LW = 360, LH = 640, PR = 2; // 9:16
const CW = LW * PR, CH = LH * PR;

export const ANIM_TERMINAL_DURATION = 5600;

// ─── Palette ─────────────────────────────────────────────────────────────────
const BG        = "#000d02";
const GREEN     = "#00e040";
const GREEN_DIM = "rgba(0,220,60,0.30)";
const GREEN_MID = "rgba(0,220,60,0.55)";
const GREEN_HI  = "#c8ffca";
const MONO      = `"Courier New", Courier, monospace`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function lerp01(el: number, start: number, dur: number) {
  return Math.max(0, Math.min(1, (el - start) / dur));
}
function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 2);
}

/**
 * Renders text character-by-character at (x, y).
 * Returns { charsDone, charW } so callers can position follow-on elements.
 */
function drawTyped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  charMs: number,
  startMs: number,
  elapsed: number,
  fontSize: number,
  color: string,
  showCursor = false,
  cursorColor?: string
): { charsDone: number; charW: number } {
  const fontStr = `${fontSize}px ${MONO}`;
  ctx.font = fontStr;
  const charW = ctx.measureText("M").width;

  if (elapsed < startMs) return { charsDone: 0, charW };

  const charsDone = Math.min(text.length, Math.floor((elapsed - startMs) / charMs));
  const displayed = text.slice(0, charsDone);

  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  if (displayed) ctx.fillText(displayed, x, y);

  const isTyping = charsDone < text.length;
  if (showCursor && isTyping) {
    const blink = Math.floor(elapsed / 520) % 2 === 0;
    if (blink) {
      ctx.fillStyle = cursorColor ?? color;
      ctx.fillRect(x + charsDone * charW, y + 1, charW * 0.7, fontSize * 1.05);
    }
  }

  return { charsDone, charW };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AnimatedTerminalCard({
  canvasRef,
  name, type, startTime, duration, distance,
  avgHeartRate, maxHeartRate, avgPace, calories, elevGain, steps,
  config = DEFAULT_CONFIG,
  animKey = 0,
}: AnimatedTerminalCardProps) {
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

    // ── Font sizes (logical → canvas) ────────────────────────────────────
    const COMMENT_FS = 8  * s;  // top header comment
    const PROMPT_FS  = 9  * s;  // $ command line
    const LOAD_FS    = 9  * s;  // > loading line
    const PROG_FS    = 8  * s;  // [████] progress bar
    const HERO_FS    = 78 * s;  // big number
    const UNIT_FS    = 11 * s;  // unit label
    const STAT_FS    = 9  * s;  // key: value rows

    // ── Y positions (canvas px) — shifted down to centre in 9:16 ─────────
    const COMMENT_Y = 100 * s;
    const PROMPT_Y  = 118 * s;
    const LOAD_Y    = 136 * s;
    const PROG_Y    = 154 * s;
    const HERO_Y    = 210 * s;  // hero top — 78px font → bottom at 288*s
    const UNIT_Y    = 295 * s;
    const DIV_Y     = 320 * s;
    const STAT_Y0   = 338 * s;
    const STAT_STEP = 22 * s;
    const PX        = 22 * s;   // left margin

    // ── Text content ──────────────────────────────────────────────────────
    const COMMENT  = `# ${titleLabel} · ${dateStr}`;
    const PROMPT   = "$ tryathlete --share";
    const LOAD_TXT = "> loading activity...";
    const BAR_LEN  = 22;

    // Pad stat labels for monospace alignment
    const maxLabelLen = Math.max(8, ...stats.map((s) => s.label.length));
    const statLines = stats.map(({ label, value }) =>
      `${label.padEnd(maxLabelLen + 2)}${value}`
    );

    // ── Timing (ms) ───────────────────────────────────────────────────────
    const PROMPT_CHAR_MS = 44;
    const LOAD_CHAR_MS   = 22;
    const STAT_CHAR_MS   = 28;

    const COMMENT_START  = 150;
    const PROMPT_START   = COMMENT_START + COMMENT.length * 26 + 120;
    const PROMPT_END     = PROMPT_START  + PROMPT.length   * PROMPT_CHAR_MS;
    const LOAD_START     = PROMPT_END    + 100;
    const LOAD_END       = LOAD_START    + LOAD_TXT.length * LOAD_CHAR_MS;
    const PROG_START     = LOAD_START    + 80;   // progress bar starts as load types
    const PROG_DUR       = 520;
    const PROG_END       = PROG_START    + PROG_DUR;
    const HERO_START     = PROG_END      + 220;
    const HERO_CHAR_MS   = Math.max(80, Math.min(140, 5000 / Math.max(1, heroValue.length) / 10));
    const HERO_END       = HERO_START    + heroValue.length * HERO_CHAR_MS;
    const UNIT_START     = HERO_END      + 140;
    const DIV_START      = UNIT_START    + 160;
    const STAT0_START    = DIV_START     + 280;
    const STAT_STAGGER   = 340;
    const lastStatLine   = statLines[statLines.length - 1] ?? "";
    const lastStatEnd    = STAT0_START + (statLines.length - 1) * STAT_STAGGER
                         + lastStatLine.length * STAT_CHAR_MS;
    const OK_START       = lastStatEnd  + 260;
    const CURSOR_START   = OK_START     + 180;

    const OK_TXT = "[OK] export complete";
    const OK_Y   = STAT_Y0 + statLines.length * STAT_STEP + 26 * s;
    const CURSOR_Y = OK_Y + 20 * s;

    let raf: number;
    const t0 = performance.now();

    function draw(now: number) {
      const el = now - t0;
      ctx.clearRect(0, 0, CW, CH);

      // ── Background ──────────────────────────────────────────────────────
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, CW, CH);

      // Subtle scanline texture
      ctx.globalAlpha = 0.028;
      ctx.fillStyle = "#000";
      for (let row = 0; row < CH; row += 3) ctx.fillRect(0, row, CW, 1);
      ctx.globalAlpha = 1;

      // ── Comment header (dim, fast type) ─────────────────────────────────
      drawTyped(ctx, COMMENT, PX, COMMENT_Y, 26, COMMENT_START, el,
        COMMENT_FS, GREEN_DIM);

      // ── Prompt line ─────────────────────────────────────────────────────
      if (el >= PROMPT_START) {
        drawTyped(ctx, PROMPT, PX, PROMPT_Y, PROMPT_CHAR_MS, PROMPT_START, el,
          PROMPT_FS, GREEN, true);
      }

      // ── Load line ────────────────────────────────────────────────────────
      if (el >= LOAD_START) {
        drawTyped(ctx, LOAD_TXT, PX, LOAD_Y, LOAD_CHAR_MS, LOAD_START, el,
          LOAD_FS, GREEN_MID, false);
      }

      // ── Progress bar ─────────────────────────────────────────────────────
      if (el >= PROG_START) {
        const pct     = Math.min(1, (el - PROG_START) / PROG_DUR);
        const filled  = Math.round(BAR_LEN * pct);
        const bar     = "█".repeat(filled) + "░".repeat(BAR_LEN - filled);
        const pctStr  = `${Math.round(pct * 100)}%`.padStart(4);
        ctx.font = `${PROG_FS}px ${MONO}`;
        ctx.fillStyle = GREEN_DIM;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`[${bar}]${pctStr}`, PX, PROG_Y);
      }

      // ── Hero value (large, types char by char) ───────────────────────────
      if (el >= HERO_START) {
        // Subtle glow on the hero text
        const heroA = easeOut(lerp01(el, HERO_START, 200));
        ctx.globalAlpha = heroA;
        // Glow layer
        ctx.shadowBlur = 24 * s;
        ctx.shadowColor = GREEN;
        drawTyped(ctx, heroValue, PX, HERO_Y, HERO_CHAR_MS, HERO_START, el,
          HERO_FS, GREEN_HI, true, GREEN);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // ── Unit ─────────────────────────────────────────────────────────────
      if (el >= UNIT_START && heroUnit) {
        const unitA = easeOut(lerp01(el, UNIT_START, 250));
        ctx.globalAlpha = unitA;
        ctx.font = `${UNIT_FS}px ${MONO}`;
        ctx.fillStyle = GREEN;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(heroUnit, PX, UNIT_Y);
        ctx.globalAlpha = 1;
      }

      // ── Divider grows right ───────────────────────────────────────────────
      if (el >= DIV_START) {
        const divP = easeOut(lerp01(el, DIV_START, 350));
        ctx.strokeStyle = GREEN_DIM;
        ctx.lineWidth   = s;
        ctx.beginPath();
        ctx.moveTo(PX, DIV_Y);
        ctx.lineTo(PX + (CW - PX * 2) * divP, DIV_Y);
        ctx.stroke();
      }

      // ── Stat rows ────────────────────────────────────────────────────────
      statLines.forEach((line, i) => {
        const statStart = STAT0_START + i * STAT_STAGGER;
        if (el < statStart) return;

        const sy = STAT_Y0 + i * STAT_STEP;
        const { charsDone, charW } = drawTyped(
          ctx, line, PX, sy, STAT_CHAR_MS, statStart, el, STAT_FS, GREEN
        );

        // Cursor on currently-typing line
        const isTyping = charsDone < line.length;
        if (isTyping) {
          const blink = Math.floor(el / 520) % 2 === 0;
          if (blink) {
            ctx.fillStyle = GREEN;
            ctx.fillRect(PX + charsDone * charW, sy + 1, charW * 0.7, STAT_FS * 1.05);
          }
        }
      });

      // ── [OK] line ────────────────────────────────────────────────────────
      if (el >= OK_START) {
        const okA = easeOut(lerp01(el, OK_START, 220));
        ctx.globalAlpha = okA;
        ctx.font = `${STAT_FS}px ${MONO}`;
        ctx.fillStyle = GREEN_HI;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(OK_TXT, PX, OK_Y);
        ctx.globalAlpha = 1;
      }

      // ── Blinking cursor at end ─────────────────────────────────────────
      if (el >= CURSOR_START) {
        const blink = Math.floor(el / 600) % 2 === 0;
        if (blink) {
          ctx.font = `${STAT_FS}px ${MONO}`;
          const cw = ctx.measureText("M").width;
          ctx.fillStyle = GREEN;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(PX, CURSOR_Y, cw * 0.7, STAT_FS * 1.1);
          ctx.globalAlpha = 1;
        }
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    animKey,
    name, type, startTime, duration, distance,
    avgPace, avgHeartRate, maxHeartRate, calories, elevGain, steps,
    config,
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
