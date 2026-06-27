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
import { AnimatedRouteCard, ANIM_ROUTE_DURATION } from "@/components/cards/animated/AnimatedRouteCard";
import { RouteCard } from "@/components/cards/RouteCard";
import { HRZoneCard } from "@/components/cards/HRZoneCard";
import type { RoutePoint } from "@/lib/routeUtils";
import { Button } from "@/components/ui/Button";
import { Download, Share2, ArrowLeft } from "lucide-react";
import { toMp4 } from "@/lib/ffmpegConvert";
import {
  CardConfig,
  DEFAULT_CONFIG,
  HERO_LABELS,
  TOGGLE_LABELS,
  TITLE_MODE_LABELS,
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
  minHeartRate: number | null;
  avgPace: number | null;
  bestPace: number | null;
  calories: number | null;
  elevGain: number | null;
  steps: number | null;
  routePoints: string | null;
  hrStream: string | null;
  hrZones: string | null;
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
  | "receipt" | "dark" | "neon" | "night" | "story" | "retro" | "minimal" | "route" | "hr-zone"
  | "overlay-clean" | "overlay-bar" | "overlay-bold" | "overlay-pills"
  | "receipt-anim" | "anim-count" | "anim-ecg" | "anim-flip" | "anim-terminal" | "anim-route"
  | "dark-glass" | "neon-glass" | "night-glass" | "story-glass" | "retro-glass" | "minimal-glass"
  | "hr-zone-glass";

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
  { id: "route",        label: "Route",     hint: "GPS route map with stats",       bg: "#060911", swatchBg: "#060911", swatchText: "#c8ff00",                 group: "Cards" },
  { id: "hr-zone",     label: "HR Zones",  hint: "Heart rate curve + zone breakdown", bg: "#04090a", swatchBg: "#04090a", swatchText: "#FF6B9D",                group: "Cards" },
  // — Animated (saves as video) —
  { id: "receipt-anim", label: "Receipt",   hint: "Printer animation · saves as video", bg: "#FAFAF8", swatchBg: "#FAFAF8", swatchText: "#c8ff00",            group: "Animated" },
  { id: "anim-count",   label: "Odometer",  hint: "Stats count up from zero",           bg: "#0a0a0a", swatchBg: "#0a0a0a", swatchText: "#c8ff00",            group: "Animated" },
  { id: "anim-ecg",    label: "ECG",       hint: "Heartbeat trace then stats reveal",  bg: "#04090a", swatchBg: "#04090a", swatchText: "#c8ff00",            group: "Animated" },
  { id: "anim-flip",     label: "Scoreboard", hint: "Split-flap digits flip to your stat",   bg: "#0a0a0a", swatchBg: "#0a0a0a", swatchText: "#c8ff00",   group: "Animated" },
  { id: "anim-terminal", label: "Terminal",   hint: "Stats type out like a terminal command", bg: "#000d02", swatchBg: "#000d02", swatchText: "#00e040",   group: "Animated" },
  { id: "anim-route",   label: "Route",     hint: "GPS route traces itself on screen",        bg: "#060911", swatchBg: "#060911", swatchText: "#c8ff00",   group: "Animated" },
  // — Overlays (transparent PNG, place over photos) —
  { id: "overlay-clean", label: "Clean",    hint: "Overlay · centered with shadows",        bg: null, swatchBg: undefined, swatchText: "#fff",     group: "Overlay" },
  { id: "overlay-bar",   label: "Bar",      hint: "Overlay · frosted bar at the bottom",    bg: null, swatchBg: undefined, swatchText: "#fff",     group: "Overlay" },
  { id: "overlay-bold",  label: "Bold",     hint: "Overlay · giant number only",            bg: null, swatchBg: undefined, swatchText: "#c8ff00",  group: "Overlay" },
  { id: "overlay-pills", label: "Pills",    hint: "Overlay · floating stat badges",         bg: null, swatchBg: undefined, swatchText: "#fff",     group: "Overlay" },
  // — Glass (full card themes with transparent background) —
  { id: "dark-glass",    label: "Dark",     hint: "Dark theme · transparent",  bg: null, swatchBg: "#0a0a0a", swatchText: "rgba(255,255,255,0.6)",  group: "Glass" },
  { id: "neon-glass",    label: "Neon",     hint: "Neon theme · transparent",  bg: null, swatchBg: "#050505", swatchText: "#c8ff00",               group: "Glass" },
  { id: "night-glass",   label: "Night",    hint: "Night theme · transparent", bg: null, swatchBg: "#080c18", swatchText: "#818cf8",               group: "Glass" },
  { id: "story-glass",   label: "Story",    hint: "Story theme · transparent", bg: null, swatchBg: "#0a0a0a", swatchText: "#c8ff00",               group: "Glass" },
  { id: "retro-glass",   label: "Retro",    hint: "Retro theme · transparent", bg: null, swatchBg: "#F2EDE4", swatchText: "#1a1a1a",               group: "Glass" },
  { id: "minimal-glass", label: "Minimal",  hint: "Minimal theme · transparent", bg: null, swatchBg: "#ffffff", swatchText: "#0a0a0a",             group: "Glass" },
  { id: "hr-zone-glass", label: "HR Zones", hint: "HR zones card · transparent", bg: null, swatchBg: "#04090a", swatchText: "#FF6B9D",              group: "Glass" },
];

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMsg, setSavingMsg] = useState<string | null>(null);
  const saving = savingMsg !== null;
  const [format, setFormat] = useState<Format>("receipt");
  const [receiptKey, setReceiptKey] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [config, setConfig] = useState<CardConfig>(DEFAULT_CONFIG);
  // Activity name editing
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);         // receipt element ref (for video capture sizing)
  const exportWrapperRef = useRef<HTMLDivElement>(null); // 9:16 wrapper — captured for static PNGs
  const animCanvasRef = useRef<HTMLCanvasElement>(null);

  const CANVAS_ANIM_FORMATS: Format[] = ["anim-count", "anim-ecg", "anim-flip", "anim-terminal", "anim-route"];

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
  function setTitleMode(titleMode: CardConfig["titleMode"]) {
    setConfig((c) => ({ ...c, titleMode }));
  }
  function toggleHideSeconds() {
    setConfig((c) => ({ ...c, hideSeconds: !c.hideSeconds }));
  }

  async function saveName() {
    if (!nameInput.trim() || !activity) return;
    setNameSaving(true);
    try {
      const res = await fetch(`/api/activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      if (res.ok) {
        setActivity((a) => a ? { ...a, name: nameInput.trim() } : a);
        setEditingName(false);
      }
    } finally {
      setNameSaving(false);
    }
  }

  useEffect(() => {
    fetch(`/api/activities/${id}`)
      .then((r) => r.json())
      .then(setActivity)
      .finally(() => setLoading(false));
  }, [id]);

  const activeFormat = FORMATS.find((f) => f.id === format)!;

  /** Static PNG capture — uses 9:16 wrapper for all formats; receipt gets canvas composition. */
  async function captureImage(): Promise<string | null> {
    const { toPng } = await import("html-to-image");

    // ── Receipt: capture at natural size then compose centred onto 9:16 canvas ──
    if (format === "receipt") {
      const el = cardRef.current;
      if (!el) return null;
      let receiptDataUrl: string;
      try {
        receiptDataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: "#FAFAF8" });
      } catch { return null; }

      return new Promise<string | null>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const W = 1080, H = 1920; // 9:16 at 3× resolution
          const canvas = document.createElement("canvas");
          canvas.width = W; canvas.height = H;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#FAFAF8";
          ctx.fillRect(0, 0, W, H);
          // Scale to fill width, centre vertically
          const scale = W / img.width;
          const drawH = img.height * scale;
          const drawY = Math.round((H - drawH) / 2);
          ctx.drawImage(img, 0, drawY, W, drawH);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(null);
        img.src = receiptDataUrl;
      });
    }

    // ── All other static formats: capture the 9:16 export wrapper ──
    const el = exportWrapperRef.current;
    if (!el) return null;
    const opts: Parameters<typeof toPng>[1] = {
      quality: 1,
      pixelRatio: 3,
      filter: (node: Node) =>
        !(node instanceof Element && node.classList.contains("preview-only")),
    };
    if (activeFormat.bg) opts.backgroundColor = activeFormat.bg;
    return toPng(el, opts);
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

    // ── Step 1: capture receipt content as static image ──────────────────
    const { toPng } = await import("html-to-image");
    let staticDataUrl: string;
    try {
      staticDataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: "#FAFAF8" });
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

    // ── Step 2: fixed 9:16 recording canvas ───────────────────────────────
    const PRINTER_H = 70; // logical px
    const canvasW = 720;  // 360 × 2
    const canvasH = 1280; // 640 × 2  (9:16)

    const rc = document.createElement("canvas");
    rc.width = canvasW;
    rc.height = canvasH;
    const ctx = rc.getContext("2d")!;

    // ── Step 3: MediaRecorder setup ───────────────────────────────────────
    // Prefer native MP4 (Safari + Chrome 130+); fall back to WebM for older browsers.
    const mimeType =
      ["video/mp4;codecs=h264,aac", "video/mp4", "video/webm;codecs=h264",
       "video/webm;codecs=vp9", "video/webm"].find((t) =>
        MediaRecorder.isTypeSupported(t)
      ) ?? "video/webm";

    const stream = rc.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    // ── Step 4: helpers ───────────────────────────────────────────────────
    const scale = 2; // pixel ratio (canvas px / logical px)

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

    const PRINTER_PX = PRINTER_H * 2; // 70 * 2 = 140 canvas px

    // Scale receipt to fit within the canvas area below the printer.
    // Long receipts (many laps / stats) can exceed 1140px at 2× — without scaling
    // the bottom would be silently clipped in the exported video.
    const maxReceiptH = canvasH - PRINTER_PX; // 1140 canvas px
    const receiptScale = Math.min(1, maxReceiptH / receiptImg.height);
    const drawW = Math.round(receiptImg.width * receiptScale);
    const drawH = Math.round(receiptImg.height * receiptScale);
    const receiptDrawX = Math.round((canvasW - drawW) / 2);

    // ── Step 5: draw first frame then start recording ─────────────────────
    ctx.fillStyle = "#FAFAF8";
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.drawImage(receiptImg, receiptDrawX, PRINTER_PX + getYFraction(0) * drawH, drawW, drawH);
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

        const yPx = getYFraction(elapsed) * drawH;
        const blinkOn = elapsed < ANIM_MS && Math.floor(elapsed / 300) % 2 === 0;

        // Background — cream to match receipt
        ctx.fillStyle = "#FAFAF8";
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Receipt centred horizontally, animated vertically (scaled to fit)
        ctx.drawImage(receiptImg, receiptDrawX, PRINTER_PX + yPx, drawW, drawH);

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
      recorder.onstop = async () => {
        const raw = new Blob(chunks, { type: mimeType });
        if (raw.size <= 5000) { resolve(null); return; }
        try {
          setSavingMsg("Converting to MP4…");
          resolve(await toMp4(raw));
        } catch {
          resolve(raw); // fall back to WebM if conversion fails
        }
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
      ["video/mp4;codecs=h264,aac", "video/mp4", "video/webm;codecs=h264",
       "video/webm;codecs=vp9", "video/webm"].find((t) =>
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
      recorder.onstop = async () => {
        const raw = new Blob(chunks, { type: mimeType });
        if (raw.size <= 5000) { resolve(null); return; }
        try {
          setSavingMsg("Converting to MP4…");
          resolve(await toMp4(raw));
        } catch {
          resolve(raw); // fall back to WebM if conversion fails
        }
      };
    });
  }

  function animVideoDuration(): number {
    if (format === "anim-count")    return ANIM_COUNT_DURATION    + 500;
    if (format === "anim-ecg")      return ANIM_ECG_DURATION      + 500;
    if (format === "anim-flip")     return ANIM_FLIP_DURATION     + 500;
    if (format === "anim-terminal") return ANIM_TERMINAL_DURATION + 500;
    if (format === "anim-route")    return ANIM_ROUTE_DURATION    + 500;
    return 6500;
  }

  async function handleDownload() {
    setSavingMsg("Recording…");
    try {
      if (isReceiptAnim) {
        const blob = await captureReceiptVideo();
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tryathlete-receipt-${id}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (isCanvasAnim) {
        const blob = await captureCanvasVideo(animVideoDuration());
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tryathlete-${format}-${id}.mp4`;
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
    setSavingMsg(null);
  }

  async function handleShare() {
    setSavingMsg("Recording…");
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
    setSavingMsg(null);
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

  // Parse stored GPS route (string → RoutePoint[])
  let parsedRoutePoints: RoutePoint[] | null = null;
  try {
    if (activity.routePoints) {
      parsedRoutePoints = JSON.parse(activity.routePoints) as RoutePoint[];
    }
  } catch { /* ignore */ }

  const sharedProps = {
    name: activity.name,
    type: activity.type,
    startTime: new Date(activity.startTime),
    duration: activity.duration,
    distance: activity.distance,
    avgHeartRate: activity.avgHeartRate,
    maxHeartRate: activity.maxHeartRate,
    minHeartRate: activity.minHeartRate,
    avgPace: activity.avgPace,
    bestPace: activity.bestPace,
    calories: activity.calories,
    elevGain: activity.elevGain,
    steps: activity.steps,
    laps: activity.laps,
    routePoints: parsedRoutePoints,
    hrStream: activity.hrStream,
    hrZones: activity.hrZones,
  };

  const hrCardProps = {
    name: activity.name,
    type: activity.type,
    startTime: new Date(activity.startTime),
    duration: activity.duration,
    avgHeartRate: activity.avgHeartRate,
    maxHeartRate: activity.maxHeartRate,
    minHeartRate: activity.minHeartRate,
    hrStream: activity.hrStream,
    hrZones: activity.hrZones,
  };

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-3">
        <button
          onClick={() => router.back()}
          className="text-sm font-semibold text-[var(--text-2)] hover:text-white transition-all active:opacity-50 flex items-center gap-1.5"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className="text-base font-bold text-white">Share</h1>
        <div className="w-16" />
      </div>

      {/* Activity name editor */}
      <div className="px-5 pb-4">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
              className="flex-1 bg-[var(--surface-2)] text-white text-sm font-semibold rounded-xl px-3 py-2 outline-none border border-[var(--accent)]"
              placeholder="Activity name…"
            />
            <button
              onClick={saveName}
              disabled={nameSaving}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-[var(--accent)] text-black"
            >
              {nameSaving ? "…" : "Save"}
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="text-xs font-semibold px-3 py-2 rounded-xl bg-[var(--surface-2)] text-[var(--text-2)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setNameInput(activity.name); setEditingName(true); }}
            className="flex items-center gap-2 group"
          >
            <span className="text-sm font-semibold text-white truncate max-w-[220px]">{activity.name}</span>
            <span className="text-[10px] font-semibold text-[var(--accent)] opacity-60 group-hover:opacity-100 transition-opacity">Edit</span>
          </button>
        )}
      </div>

      {/* Format picker */}
      <div className="px-5 mb-4">
        {(["Cards", "Animated", "Overlay", "Glass"] as const).map((group) => {
          const groupFormats = FORMATS.filter((f) => f.group === group);
          return (
            <div key={group} className="mb-3">
              <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-2">
                {group === "Overlay" ? "Overlay (transparent PNG)" : group === "Animated" ? "Animated (saves as video)" : group === "Glass" ? "Glass (transparent PNG)" : group}
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
        // Laps (splits table) only applies to static dark/neon/night/minimal/retro cards
        const LAPS_FORMATS: Format[] = ["receipt", "receipt-anim", "dark", "neon", "night", "minimal", "retro", "dark-glass", "neon-glass", "night-glass", "retro-glass", "minimal-glass"];
        // Route map applies to all formats except pure canvas animations without overlay
        const ROUTE_FORMATS: Format[] = ["receipt", "receipt-anim", "dark", "neon", "night", "minimal", "retro", "story", "route", "overlay-clean", "overlay-bar", "overlay-bold", "overlay-pills", "dark-glass", "neon-glass", "night-glass", "story-glass", "retro-glass", "minimal-glass", "anim-count", "anim-ecg", "anim-flip", "anim-terminal", "anim-route"];
        const showToggles = availableShowToggles(activityData, {
          formatSupportsLaps: LAPS_FORMATS.includes(format),
          formatSupportsRoute: ROUTE_FORMATS.includes(format),
          hasRoute: !!parsedRoutePoints,
          lapCount: activity.laps?.length ?? 0,
        });
        return (
          <div className="px-5 mb-4 space-y-3">
            {/* Title display mode */}
            <div>
              <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-2">Title</p>
              <div className="flex gap-2">
                {(["type", "name"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTitleMode(mode)}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: config.titleMode === mode ? "var(--accent)" : "var(--surface-2)",
                      color: config.titleMode === mode ? "#000" : "var(--text-2)",
                    }}
                  >
                    {TITLE_MODE_LABELS[mode]}
                  </button>
                ))}
              </div>
            </div>
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
            {/* Distance format — only when distance is visible somewhere */}
            {(config.hero === "distance" || config.show.distance) && (
              <div>
                <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-2">Distance format</p>
                <div className="flex gap-2">
                  {([
                    { label: "5.01 km", value: false },
                    { label: "5.0 km",  value: true  },
                  ] as const).map(({ label, value }) => (
                    <button
                      key={label}
                      onClick={() => setConfig((c) => ({ ...c, roundDistance: value }))}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all"
                      style={{
                        background: config.roundDistance === value ? "var(--accent)" : "var(--surface-2)",
                        color: config.roundDistance === value ? "#000" : "var(--text-2)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Seconds toggle — only when time is visible somewhere */}
            {(config.hero === "time" || config.show.time) && (
              <div>
                <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-2">Time format</p>
                <div className="flex gap-2">
                  {([
                    { label: "H:MM:SS", value: false },
                    { label: "H:MM",    value: true  },
                  ] as const).map(({ label, value }) => (
                    <button
                      key={label}
                      onClick={() => setConfig((c) => ({ ...c, hideSeconds: value }))}
                      className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all"
                      style={{
                        background: config.hideSeconds === value ? "var(--accent)" : "var(--surface-2)",
                        color: config.hideSeconds === value ? "#000" : "var(--text-2)",
                      }}
                    >
                      {label}
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

        {/* ── Receipt: natural height preview (export composes onto 9:16 canvas) ── */}
        {format === "receipt" && (
          <RunReceipt receiptRef={cardRef} orderNumber={activity.id.slice(-4).toUpperCase()} config={config} {...sharedProps} />
        )}

        {/* ── Other static card formats — wrapped in a 9:16 export container ── */}
        {!isReceiptAnim && !isCanvasAnim && format !== "receipt" && (
          <div
            ref={exportWrapperRef}
            className="export-wrap"
            style={{
              aspectRatio: "9 / 16",
              width: "100%",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: activeFormat.bg ?? "transparent",
            }}
          >
            {format === "dark"    && <DarkCard    cardRef={cardRef} config={config} {...sharedProps} />}
            {format === "neon"    && <NeonCard    cardRef={cardRef} config={config} {...sharedProps} />}
            {format === "night"   && <NightCard   cardRef={cardRef} config={config} {...sharedProps} />}
            {format === "story"   && <StoryCard   cardRef={cardRef} config={config} {...sharedProps} />}
            {format === "retro"   && <RetroCard   cardRef={cardRef} config={config} {...sharedProps} />}
            {format === "minimal" && <MinimalCard cardRef={cardRef} config={config} {...sharedProps} />}
            {format === "route"   && <RouteCard   cardRef={cardRef} config={config} {...sharedProps} />}
            {format === "hr-zone" && <HRZoneCard  cardRef={cardRef} {...hrCardProps} />}

            {/* Overlay + Glass variants — checkerboard is preview-only (excluded from PNG export) */}
            {(format === "overlay-clean" || format === "overlay-bar" || format === "overlay-bold" || format === "overlay-pills" ||
              format === "dark-glass" || format === "neon-glass" || format === "night-glass" || format === "story-glass" || format === "retro-glass" || format === "minimal-glass" || format === "hr-zone-glass") && (
              <>
                <div
                  className="preview-only"
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: "repeating-conic-gradient(#1e1e1e 0% 25%, #0a0a0a 0% 50%)",
                    backgroundSize: "14px 14px",
                    zIndex: 0,
                  }}
                />
                <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
                  {format === "overlay-clean"  && <TransparentCard cardRef={cardRef} config={config} {...sharedProps} />}
                  {format === "overlay-bar"    && <OverlayBarCard  cardRef={cardRef} config={config} {...sharedProps} />}
                  {format === "overlay-bold"   && <OverlayBoldCard cardRef={cardRef} config={config} {...sharedProps} />}
                  {format === "overlay-pills"  && <OverlayPillsCard cardRef={cardRef} config={config} {...sharedProps} />}
                  {format === "dark-glass"     && <DarkCard    glass cardRef={cardRef} config={config} {...sharedProps} />}
                  {format === "neon-glass"     && <NeonCard    glass cardRef={cardRef} config={config} {...sharedProps} />}
                  {format === "night-glass"    && <NightCard   glass cardRef={cardRef} config={config} {...sharedProps} />}
                  {format === "story-glass"    && <StoryCard   glass cardRef={cardRef} config={config} {...sharedProps} />}
                  {format === "retro-glass"    && <RetroCard   glass cardRef={cardRef} config={config} {...sharedProps} />}
                  {format === "minimal-glass"  && <MinimalCard glass cardRef={cardRef} config={config} {...sharedProps} />}
                  {format === "hr-zone-glass"  && <HRZoneCard  glass cardRef={cardRef} {...hrCardProps} />}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Receipt animation ── */}
        {isReceiptAnim && (
          <div style={{ position: "relative" }}>
            {/* Printer body + roller wrapped together so they stick as one unit */}
            <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <div style={{
                background: "linear-gradient(180deg, #1d1d1d 0%, #141414 100%)",
                borderRadius: "16px 16px 2px 2px",
                padding: "14px 20px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ width: 36, height: 2, background: "#2e2e2e", borderRadius: 1 }} />
                  <div style={{ width: 28, height: 2, background: "#252525", borderRadius: 1 }} />
                  <div style={{ width: 32, height: 2, background: "#2e2e2e", borderRadius: 1 }} />
                </div>
                <span style={{ fontFamily: "monospace", fontSize: 8, color: "#3a3a3a", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  THERMAL PRINTER
                </span>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#c8ff00", boxShadow: "0 0 7px rgba(200,255,0,0.9)",
                  animation: "printer-blink 0.6s ease-in-out 14",
                }} />
              </div>
              {/* Paper slot roller — immediately below, no gap */}
              <div style={{
                height: 6,
                background: "repeating-linear-gradient(90deg, #0f0f0f 0px, #0f0f0f 4px, #111 4px, #111 8px)",
                animation: "printer-roller 0.08s linear infinite",
                animationIterationCount: "30",
              }} />
            </div>
            {/* Animated receipt */}
            <div
              key={receiptKey}
              style={{ position: "relative", zIndex: 5, animation: "receipt-print 4.5s cubic-bezier(0.4, 0, 0.2, 1) both" }}
            >
              <div style={{
                position: "absolute", left: 0, right: 0, height: 24,
                pointerEvents: "none", zIndex: 20,
                background: "linear-gradient(180deg, rgba(200,255,0,0.08) 0%, rgba(200,255,0,0.04) 60%, transparent 100%)",
                animation: "receipt-scan 4.5s linear both",
              }} />
              <RunReceipt receiptRef={cardRef} orderNumber={activity.id.slice(-4).toUpperCase()} config={config} {...sharedProps} />
            </div>
          </div>
        )}

        {/* ── Canvas-based animated formats (already 9:16) ── */}
        {format === "anim-count" && (
          <AnimatedCountCard canvasRef={animCanvasRef} animKey={animKey} config={config} {...sharedProps} />
        )}
        {format === "anim-ecg" && (
          <AnimatedECGCard canvasRef={animCanvasRef} animKey={animKey} config={config} {...sharedProps} />
        )}
        {format === "anim-flip" && (
          <AnimatedFlipCard canvasRef={animCanvasRef} animKey={animKey} config={config} {...sharedProps} />
        )}
        {format === "anim-terminal" && (
          <AnimatedTerminalCard canvasRef={animCanvasRef} animKey={animKey} config={config} {...sharedProps} />
        )}
        {format === "anim-route" && (
          <AnimatedRouteCard canvasRef={animCanvasRef} animKey={animKey} config={config} {...sharedProps} />
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
          {savingMsg
            ? savingMsg
            : isAnimatedFormat
              ? "Records the animation as MP4 — tap Share → Instagram Stories"
              : "Share opens your phone's share sheet → pick Instagram Stories"}
        </p>
      </div>
    </div>
  );
}
