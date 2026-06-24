"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RunReceipt } from "@/components/receipt/RunReceipt";
import { DarkCard } from "@/components/cards/DarkCard";
import { StoryCard } from "@/components/cards/StoryCard";
import { TransparentCard } from "@/components/cards/TransparentCard";
import { NeonCard } from "@/components/cards/NeonCard";
import { MinimalCard } from "@/components/cards/MinimalCard";
import { RetroCard } from "@/components/cards/RetroCard";
import { NightCard } from "@/components/cards/NightCard";
import { OverlayBarCard } from "@/components/cards/OverlayBarCard";
import { OverlayBoldCard } from "@/components/cards/OverlayBoldCard";
import { OverlayPillsCard } from "@/components/cards/OverlayPillsCard";
import { AnimatedCountCard, ANIM_COUNT_DURATION } from "@/components/cards/animated/AnimatedCountCard";
import { AnimatedECGCard, ANIM_ECG_DURATION } from "@/components/cards/animated/AnimatedECGCard";
import { AnimatedFlipCard, ANIM_FLIP_DURATION } from "@/components/cards/animated/AnimatedFlipCard";
import { AnimatedTerminalCard, ANIM_TERMINAL_DURATION } from "@/components/cards/animated/AnimatedTerminalCard";
import { Button } from "@/components/ui/Button";
import { Download, Share2, ArrowLeft } from "lucide-react";
import {
  CardConfig,
  DEFAULT_CONFIG,
  HERO_LABELS,
  TOGGLE_LABELS,
  availableHeroOptions,
  availableShowToggles,
} from "@/lib/cardConfig";

interface Activity {
  id: string;
  name: string;
  type: string;
  startTime: string;
  duration: number;
  distance: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgPace: number | null;
  bestPace: number | null;
  calories: number | null;
  elevGain: number | null;
  steps: number | null;
  laps: {
    lapIndex: number;
    distance: number;
    duration: number;
    avgHeartRate: number | null;
    avgPace: number | null;
    zone: number | null;
  }[];
}

type Format =
  | "receipt" | "dark" | "neon" | "night" | "story" | "retro" | "minimal"
  | "overlay-clean" | "overlay-bar" | "overlay-bold" | "overlay-pills"
  | "receipt-anim" | "anim-count" | "anim-ecg" | "anim-flip" | "anim-terminal";

interface FormatDef {
  id: Format;
  label: string;
  hint: string;
  bg: string | null;
  swatchBg?: string;
  swatchText?: string;
  group?: string;
}

const FORMATS: FormatDef[] = [
  // — Cards —
  { id: "receipt",      label: "Receipt",   hint: "Static thermal receipt (PNG)",   bg: "#FAFAF8", swatchBg: "#FAFAF8", swatchText: "#333",                   group: "Cards" },
  { id: "dark",         label: "Dark",      hint: "App-style dark card",            bg: "#0a0a0a", swatchBg: "#0a0a0a", swatchText: "rgba(255,255,255,0.6)",   group: "Cards" },
  { id: "neon",         label: "Neon",      hint: "Dark card, lime accents",        bg: "#050505", swatchBg: "#050505", swatchText: "#c8ff00",                 group: "Cards" },
  { id: "night",        label: "Night",     hint: "Deep blue, indigo accents",      bg: "#080c18", swatchBg: "#080c18", swatchText: "#818cf8",                 group: "Cards" },
  { id: "story",        label: "Story",     hint: "9:16 portrait for Stories",      bg: "#0a0a0a", swatchBg: "#0a0a0a", swatchText: "#c8ff00",                 group: "Cards" },
  { id: "retro",        label: "Retro",     hint: "Newspaper column style",         bg: "#F2EDE4", swatchBg: "#F2EDE4", swatchText: "#1a1a1a",                 group: "Cards" },
  { id: "minimal",      label: "Minimal",   hint: "Clean white, modern",            bg: "#ffffff", swatchBg: "#ffffff", swatchText: "#0a0a0a",                 group: "Cards" },
  // — Animated (saves as video) —
  { id: "receipt-anim", label: "Receipt",   hint: "Printer animation · saves as video", bg: "#FAFAF8", swatchBg: "#FAFAF8", swatchText: "#c8ff00",            group: "Animated" },
  { id: "anim-count",   label: "Odometer",  hint: "Stats count up from zero",           bg: "#0a0a0a", swatchBg: "#0a0a0a", swatchText: "#c8ff00",            group: "Animated" },
  { id: "anim-ecg",    label: "ECG",       hint: "Heartbeat trace then stats reveal",  bg: "#04090a", swatchBg: "#04090a", swatchText: "#c8ff00",            group: "Animated" },
  { id: "anim-flip",     label: "Scoreboard", hint: "Split-flap digits flip to your stat",   bg: "#0a0a0a", swatchBg: "#0a0a0a", swatchText: "#c8ff00",   group: "Animated" },
  { id: "anim-terminal", label: "Terminal",   hint: "Stats type out like a terminal command", bg: "#000d02", swatchBg: "#000d02", swatchText: "#00e040",   group: "Animated" },
  // — Overlays (transparent PNG, place over photos) —
  { id: "overlay-clean", label: "Clean",    hint: "Overlay · centered with shadows",        bg: null, swatchBg: undefined, swatchText: "#fff",     group: "Overlay" },
  { id: "overlay-bar",   label: "Bar",      hint: "Overlay · frosted bar at the bottom",    bg: null, swatchBg: undefined, swatchText: "#fff",     group: "Overlay" },
  { id: "overlay-bold",  label: "Bold",     hint: "Overlay · giant number only",            bg: null, swatchBg: undefined, swatchText: "#c8ff00",  group: "Overlay" },
  { id: "overlay-pills", label: "Pills",    hint: "Overlay · floating stat badges",         bg: null, swatchBg: undefined, swatchText: "#fff",     group: "Overlay" },
];

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [format, setFormat] = useState<Format>("receipt");
  const [receiptKey, setReceiptKey] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [config, setConfig] = useState<CardConfig>(DEFAULT_CONFIG);
  const cardRef = useRef<HTMLDivElement>(null);
  const animCanvasRef = useRef<HTMLCanvasElement>(null);

  const CANVAS_ANIM_FORMATS: Format[] = ["anim-count", "anim-ecg", "anim-flip", "anim-terminal"];

  function handleFormatChange(f: Format) {
    if (f === "receipt-anim") setReceiptKey((k) => k + 1);
    if (CANVAS_ANIM_FORMATS.includes(f)) setAnimKey((k) => k + 1);
    setFormat(f);
  }

  function setHero(hero: CardConfig["hero"]) {
    setConfig((c) => ({ ...c, hero }));
  }
  function toggleStat(key: keyof CardConfig["show"]) {
    setConfig((c) => ({ ...c, show: { ...c.show, [key]: !c.show[key] } }));
  }

  useEffect(() => {
    fetch(`/api/activities/${id}`)
      .then((r) => r.json())
      .then(setActivity)
      .finally(() => setLoading(false));
  }, [id]);

  const activeFormat = FORMATS.find((f) => f.id === format)!;

  /** Static PNG capture for non-animated card formats */
  async function captureImage(): Promise<string | null> {
    if (!cardRef.current) return null;
    const { toPng } = await import("html-to-image");
    const opts: Parameters<typeof toPng>[1] = { quality: 1, pixelRatio: 3 };
    if (activeFormat.bg) opts.backgroundColor = activeFormat.bg;
    return toPng(cardRef.current, opts);
  }

  /**
   * Video capture for the receipt format.
   * Instead of capturing HTML frames (async, unreliable), we:
   * 1. Capture the receipt as a single static PNG
   * 2. Replay the printer animation frame-by-frame on a canvas using rAF
   * 3. Record that canvas with MediaRecorder → clean, reliable 30fps video
   */
  async function captureReceiptVideo(): Promise<Blob | null> {
    const el = cardRef.current;
    if (!el) return null;

    const scale = 2;
    const elW = el.offsetWidth;
    const elH = el.offsetHeight;
    if (!elW || !elH) return null;

    // ── Step 1: capture receipt content as static image ──────────────────
    const { toPng } = await import("html-to-image");
    let staticDataUrl: string;
    try {
      staticDataUrl = await toPng(el, { pixelRatio: scale, backgroundColor: "#FAFAF8" });
    } catch (e) {
      console.error("receipt capture failed", e);
      return null;
    }

    const receiptImg = new Image();
    await new Promise<void>((res, rej) => {
      receiptImg.onload = () => res();
      receiptImg.onerror = () => rej(new Error("img load failed"));
      receiptImg.src = staticDataUrl;
    });

    // ── Step 2: recording canvas (printer height + receipt height) ────────
    const PRINTER_H = 70; // logical px
    const canvasW = elW * scale;
    const canvasH = (elH + PRINTER_H) * scale;

    const rc = document.createElement("canvas");
    rc.width = canvasW;
    rc.height = canvasH;
    const ctx = rc.getContext("2d")!;

    // ── Step 3: MediaRecorder setup ───────────────────────────────────────
    const mimeType =
      ["video/webm;codecs=vp9", "video/webm", "video/mp4"].find((t) =>
        MediaRecorder.isTypeSupported(t)
      ) ?? "video/webm";

    const stream = rc.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    // ── Step 4: helpers ───────────────────────────────────────────────────
    /** Draw the printer block on the canvas */
    function drawPrinter(blinkOn: boolean) {
      const s = scale;
      const ph = PRINTER_H * s;
      // Body
      ctx.fillStyle = "#1d1d1d";
      ctx.beginPath();
      ctx.roundRect(0, 0, canvasW, ph - 6 * s, [14 * s, 14 * s, 3 * s, 3 * s]);
      ctx.fill();
      // Feed ribs
      ([[36, 16], [28, 24], [32, 32]] as [number, number][]).forEach(([rw, ry]) => {
        ctx.fillStyle = "#2d2d2d";
        ctx.fillRect(18 * s, ry * s, rw * s, 2 * s);
      });
      // Label
      ctx.fillStyle = "#333";
      ctx.font = `bold ${7 * s}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("THERMAL PRINTER", canvasW / 2, 28 * s);
      // Indicator light
      ctx.beginPath();
      ctx.arc(canvasW - 22 * s, 20 * s, 4 * s, 0, Math.PI * 2);
      if (blinkOn) {
        ctx.shadowBlur = 8 * s;
        ctx.shadowColor = "#c8ff00";
        ctx.fillStyle = "#c8ff00";
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#1e2800";
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      // Paper slot
      ctx.fillStyle = "#080808";
      ctx.fillRect(18 * s, (PRINTER_H - 7) * s, canvasW - 36 * s, 5 * s);
    }

    /**
     * Returns Y offset as a fraction of receipt height (0 = settled, -1 = fully hidden).
     * Mirrors the CSS keyframes exactly (percentage-based).
     */
    function getYFraction(ms: number): number {
      const ANIM_MS = 4500;
      const kf: [number, number][] = [
        [0,    -1],   [0.03, -1],
        [0.08, -0.88],[0.13, -0.88],
        [0.18, -0.74],[0.24, -0.74],
        [0.30, -0.60],[0.36, -0.60],
        [0.42, -0.46],[0.48, -0.46],
        [0.54, -0.32],[0.62, -0.20],
        [0.70, -0.10],[0.78, -0.04],
        [0.87, -0.01],[0.94, -0.002],
        [1.0,   0],
      ];
      const t = Math.min(ms / ANIM_MS, 1);
      for (let i = 1; i < kf.length; i++) {
        if (t <= kf[i][0]) {
          const [t0, y0] = kf[i - 1];
          const [t1, y1] = kf[i];
          return y0 + (y1 - y0) * ((t - t0) / (t1 - t0));
        }
      }
      return 0;
    }

    // ── Step 5: draw first frame then start recording ─────────────────────
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.drawImage(receiptImg, 0, PRINTER_H * scale + getYFraction(0) * receiptImg.height);
    drawPrinter(true);

    recorder.start();
    setReceiptKey((k) => k + 1); // restart on-screen animation too

    // ── Step 6: rAF render loop ───────────────────────────────────────────
    const ANIM_MS = 4500;
    const RECORD_MS = 5800; // animation + 1.3s tail
    const startTime = performance.now();

    await new Promise<void>((resolve) => {
      function draw(now: number) {
        const elapsed = now - startTime;
        if (elapsed >= RECORD_MS) { resolve(); return; }

        const yPx = getYFraction(elapsed) * receiptImg.height;
        const blinkOn = elapsed < ANIM_MS && Math.floor(elapsed / 300) % 2 === 0;

        // Background
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Receipt (animated — starts fully hidden, slides into view)
        ctx.drawImage(receiptImg, 0, PRINTER_H * scale + yPx);

        // Scan-line glow at the printer slot — new content emerges through here
        if (elapsed < ANIM_MS) {
          const slotY = PRINTER_H * scale;
          const grad = ctx.createLinearGradient(0, slotY, 0, slotY + 22 * scale);
          grad.addColorStop(0, "rgba(200,255,0,0.10)");
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.fillRect(0, slotY, canvasW, 22 * scale);
        }

        // Printer drawn last — covers the part of the receipt still inside
        drawPrinter(blinkOn);

        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
    });

    // ── Step 7: stop cleanly ──────────────────────────────────────────────
    recorder.requestData();
    await new Promise((r) => setTimeout(r, 300)); // let final chunk flush
    recorder.stop();
    stream.getTracks().forEach((t) => t.stop());

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob.size > 5000 ? blob : null);
      };
    });
  }

  const isReceiptAnim = format === "receipt-anim";
  const isCanvasAnim  = CANVAS_ANIM_FORMATS.includes(format);
  const isAnimatedFormat = isReceiptAnim || isCanvasAnim;

  /** Record a canvas-based animated card directly from its captureStream */
  async function captureCanvasVideo(durationMs: number): Promise<Blob | null> {
    const canvas = animCanvasRef.current;
    if (!canvas) return null;

    const mimeType =
      ["video/webm;codecs=vp9", "video/webm", "video/mp4"].find((t) =>
        MediaRecorder.isTypeSupported(t)
      ) ?? "video/webm";

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.start();
    setAnimKey((k) => k + 1); // restart animation from frame 0

    await new Promise((r) => setTimeout(r, durationMs));

    recorder.requestData();
    await new Promise((r) => setTimeout(r, 300));
    recorder.stop();
    stream.getTracks().forEach((t) => t.stop());

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob.size > 5000 ? blob : null);
      };
    });
  }

  function animVideoDuration(): number {
    if (format === "anim-count") return ANIM_COUNT_DURATION + 500;
    if (format === "anim-ecg")   return ANIM_ECG_DURATION   + 500;
    if (format === "anim-flip")     return ANIM_FLIP_DURATION     + 500;
    if (format === "anim-terminal") return ANIM_TERMINAL_DURATION + 500;
    return 6500;
  }

  async function handleDownload() {
    setSaving(true);
    try {
      if (isReceiptAnim) {
        const blob = await captureReceiptVideo();
        if (!blob) return;
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tryathlete-receipt-${id}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (isCanvasAnim) {
        const blob = await captureCanvasVideo(animVideoDuration());
        if (!blob) return;
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tryathlete-${format}-${id}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const dataUrl = await captureImage();
        if (!dataUrl) return;
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `tryathlete-${format}-${id}.png`;
        a.click();
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  async function handleShare() {
    setSaving(true);
    try {
      const getVideoBlob = async () =>
        isReceiptAnim ? captureReceiptVideo() : captureCanvasVideo(animVideoDuration());

      if (isAnimatedFormat) {
        const blob = await getVideoBlob();
        if (!blob) return;
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `tryathlete-${format}-${id}.${ext}`, { type: blob.type });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: `My ${activity?.type || "Workout"}`, files: [file] });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        const dataUrl = await captureImage();
        if (!dataUrl) return;
        const blob = await fetch(dataUrl).then((r) => r.blob());
        const file = new File([blob], `tryathlete-${format}-${id}.png`, { type: "image/png" });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `My ${activity?.type || "Workout"}`,
            text: "Check out my workout on TryAthlete!",
            files: [file],
          });
        } else {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = file.name;
          a.click();
        }
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4">
        <p className="text-[var(--text-2)]">Activity not found</p>
        <Button variant="surface" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const sharedProps = {
    name: activity.name,
    type: activity.type,
    startTime: new Date(activity.startTime),
    duration: activity.duration,
    distance: activity.distance,
    avgHeartRate: activity.avgHeartRate,
    maxHeartRate: activity.maxHeartRate,
    avgPace: activity.avgPace,
    bestPace: activity.bestPace,
    calories: activity.calories,
    elevGain: activity.elevGain,
    steps: activity.steps,
    laps: activity.laps,
  };

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-5">
        <button
          onClick={() => router.back()}
          className="text-sm font-semibold text-[var(--text-2)] hover:text-white transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className="text-base font-bold text-white">Share</h1>
        <div className="w-16" />
      </div>

      {/* Format picker */}
      <div className="px-5 mb-4">
        {(["Cards", "Animated", "Overlay"] as const).map((group) => {
          const groupFormats = FORMATS.filter((f) => f.group === group);
          return (
            <div key={group} className="mb-3">
              <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-2">
                {group === "Overlay" ? "Overlay (transparent PNG)" : group === "Animated" ? "Animated (saves as video)" : group}
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {groupFormats.map((f) => {
                  const isActive = format === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => handleFormatChange(f.id)}
                      className="flex-shrink-0 flex flex-col items-center gap-1.5"
                    >
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          background: f.swatchBg ?? undefined,
                          backgroundImage: !f.bg
                            ? "repeating-conic-gradient(#222 0% 25%, #111 0% 50%)"
                            : undefined,
                          backgroundSize: !f.bg ? "10px 10px" : undefined,
                          border: isActive
                            ? "2px solid var(--accent)"
                            : "2px solid var(--surface-3)",
                          boxShadow: isActive ? "0 0 0 1px var(--accent)" : "none",
                        }}
                      >
                        {(f.id === "receipt-anim" || CANVAS_ANIM_FORMATS.includes(f.id as Format)) ? (
                          <span style={{ fontSize: 20, color: f.swatchText ?? "#c8ff00" }}>▶</span>
                        ) : (
                          <span className="text-[11px] font-black" style={{ color: f.swatchText ?? "rgba(255,255,255,0.6)" }}>
                            KM
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold" style={{ color: isActive ? "var(--accent)" : "var(--text-3)" }}>
                        {f.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <p className="text-[10px] text-[var(--text-3)] mt-1 uppercase tracking-widest">
          {activeFormat.hint}
        </p>
      </div>

      {/* Stat configurator */}
      {(() => {
        const activityData = {
          type: activity.type,
          duration: activity.duration,
          distance: activity.distance,
          avgPace: activity.avgPace,
          avgHeartRate: activity.avgHeartRate,
          maxHeartRate: activity.maxHeartRate,
          calories: activity.calories,
          elevGain: activity.elevGain,
          steps: activity.steps,
        };
        const heroOptions = availableHeroOptions(activityData);
        const showToggles = availableShowToggles(activityData);
        return (
          <div className="px-5 mb-4 space-y-3">
            {/* Hero stat */}
            {heroOptions.length > 1 && (
              <div>
                <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-2">Main stat</p>
                <div className="flex gap-2">
                  {heroOptions.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHero(h)}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all"
                      style={{
                        background: config.hero === h ? "var(--accent)" : "var(--surface-2)",
                        color: config.hero === h ? "#000" : "var(--text-2)",
                      }}
                    >
                      {HERO_LABELS[h]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Stat toggles */}
            <div>
              <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-2">Show</p>
              <div className="flex gap-2 flex-wrap">
                {showToggles.map((key) => {
                  const on = config.show[key];
                  return (
                    <button
                      key={key}
                      onClick={() => toggleStat(key)}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all"
                      style={{
                        background: on ? "var(--surface-3)" : "var(--surface-2)",
                        color: on ? "var(--text)" : "var(--text-3)",
                        border: on ? "1px solid var(--border)" : "1px solid transparent",
                      }}
                    >
                      {on ? "✓ " : ""}{TOGGLE_LABELS[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Card preview */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {format === "receipt" && (
          <RunReceipt receiptRef={cardRef} orderNumber={activity.id.slice(-4).toUpperCase()} {...sharedProps} />
        )}

        {format === "receipt-anim" && (
          <div style={{ position: "relative" }}>
            {/* Printer body */}
            <div style={{
              background: "linear-gradient(180deg, #1d1d1d 0%, #141414 100%)",
              borderRadius: "16px 16px 2px 2px",
              padding: "14px 20px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              zIndex: 10,
              boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
            }}>
              {/* Left: feed ribs */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ width: 36, height: 2, background: "#2e2e2e", borderRadius: 1 }} />
                <div style={{ width: 28, height: 2, background: "#252525", borderRadius: 1 }} />
                <div style={{ width: 32, height: 2, background: "#2e2e2e", borderRadius: 1 }} />
              </div>
              {/* Center label */}
              <span style={{ fontFamily: "monospace", fontSize: 8, color: "#3a3a3a", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                THERMAL PRINTER
              </span>
              {/* Right: blinking indicator */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#c8ff00",
                  boxShadow: "0 0 7px rgba(200,255,0,0.9)",
                  animation: "printer-blink 0.6s ease-in-out 14",
                }}
              />
            </div>

            {/* Paper slot + roller texture */}
            <div style={{
              height: 6,
              position: "relative",
              zIndex: 10,
              background: "repeating-linear-gradient(90deg, #0f0f0f 0px, #0f0f0f 4px, #111 4px, #111 8px)",
              animation: "printer-roller 0.08s linear infinite",
              animationDelay: "0s",
              animationIterationCount: "30",
            }} />

            {/* Animated receipt emerging from printer */}
            <div
              key={receiptKey}
              style={{ position: "relative", zIndex: 5, animation: "receipt-print 4.5s cubic-bezier(0.4, 0, 0.2, 1) both" }}
            >
              {/* Scan-line glow sweep */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: 24,
                  pointerEvents: "none",
                  zIndex: 20,
                  background: "linear-gradient(180deg, rgba(200,255,0,0.08) 0%, rgba(200,255,0,0.04) 60%, transparent 100%)",
                  animation: "receipt-scan 4.5s linear both",
                }}
              />
              <RunReceipt receiptRef={cardRef} orderNumber={activity.id.slice(-4).toUpperCase()} {...sharedProps} />
            </div>
          </div>
        )}
        {format === "dark" && <DarkCard cardRef={cardRef} config={config} {...sharedProps} />}
        {format === "neon" && <NeonCard cardRef={cardRef} config={config} {...sharedProps} />}
        {format === "night" && <NightCard cardRef={cardRef} config={config} {...sharedProps} />}
        {format === "story" && <StoryCard cardRef={cardRef} config={config} {...sharedProps} />}
        {format === "retro" && <RetroCard cardRef={cardRef} config={config} {...sharedProps} />}
        {format === "minimal" && <MinimalCard cardRef={cardRef} config={config} {...sharedProps} />}

        {format === "anim-count" && (
          <AnimatedCountCard
            canvasRef={animCanvasRef}
            animKey={animKey}
            config={config}
            {...sharedProps}
          />
        )}

        {format === "anim-ecg" && (
          <AnimatedECGCard
            canvasRef={animCanvasRef}
            animKey={animKey}
            config={config}
            {...sharedProps}
          />
        )}

        {format === "anim-flip" && (
          <AnimatedFlipCard
            canvasRef={animCanvasRef}
            animKey={animKey}
            config={config}
            {...sharedProps}
          />
        )}

        {format === "anim-terminal" && (
          <AnimatedTerminalCard
            canvasRef={animCanvasRef}
            animKey={animKey}
            config={config}
            {...sharedProps}
          />
        )}

        {/* Overlay variants — checkerboard preview shows transparency */}
        {(format === "overlay-clean" || format === "overlay-bar" || format === "overlay-bold" || format === "overlay-pills") && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundImage: "repeating-conic-gradient(#1e1e1e 0% 25%, #0a0a0a 0% 50%)",
              backgroundSize: "14px 14px",
            }}
          >
            {format === "overlay-clean"  && <TransparentCard cardRef={cardRef} config={config} {...sharedProps} />}
            {format === "overlay-bar"    && <OverlayBarCard cardRef={cardRef} config={config} {...sharedProps} />}
            {format === "overlay-bold"   && <OverlayBoldCard cardRef={cardRef} config={config} {...sharedProps} />}
            {format === "overlay-pills"  && <OverlayPillsCard cardRef={cardRef} config={config} {...sharedProps} />}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="px-5 pb-10 pt-4 border-t border-[var(--border)] bg-[var(--bg)]">
        <div className="flex gap-3">
          <Button
            variant="accent"
            size="lg"
            className="flex-1"
            loading={saving}
            onClick={handleShare}
          >
            <Share2 size={15} />
            Share
          </Button>
          <Button
            variant="surface"
            size="lg"
            loading={saving}
            onClick={handleDownload}
          >
            <Download size={15} />
          </Button>
        </div>
        <p className="text-center text-[10px] text-[var(--text-3)] mt-2.5">
          {isAnimatedFormat
            ? "Records the animation as a video — tap Share → Instagram Stories"
            : "Share opens your phone's share sheet → pick Instagram Stories"}
        </p>
      </div>
    </div>
  );
}
