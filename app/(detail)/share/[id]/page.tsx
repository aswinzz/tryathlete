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
import { Button } from "@/components/ui/Button";
import { Download, Share2, ArrowLeft } from "lucide-react";

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

type Format = "receipt" | "dark" | "story" | "transparent" | "neon" | "minimal" | "retro" | "night";

const FORMATS: { id: Format; label: string; hint: string; bg: string | null; swatchBg?: string; swatchText?: string }[] = [
  { id: "receipt",     label: "Receipt",   hint: "Paper thermal receipt",           bg: "#FAFAF8", swatchBg: "#FAFAF8", swatchText: "#333" },
  { id: "dark",        label: "Dark",      hint: "App-style dark card",             bg: "#0a0a0a", swatchBg: "#0a0a0a", swatchText: "rgba(255,255,255,0.6)" },
  { id: "neon",        label: "Neon",      hint: "Dark card with lime accents",     bg: "#050505", swatchBg: "#050505", swatchText: "#c8ff00" },
  { id: "night",       label: "Night",     hint: "Deep blue with indigo accents",   bg: "#080c18", swatchBg: "#080c18", swatchText: "#818cf8" },
  { id: "story",       label: "Story",     hint: "9:16 portrait for Stories",       bg: "#0a0a0a", swatchBg: "#0a0a0a", swatchText: "#c8ff00" },
  { id: "retro",       label: "Retro",     hint: "Newspaper column style",          bg: "#F2EDE4", swatchBg: "#F2EDE4", swatchText: "#1a1a1a" },
  { id: "minimal",     label: "Minimal",   hint: "Clean white, modern",             bg: "#ffffff", swatchBg: "#ffffff", swatchText: "#0a0a0a" },
  { id: "transparent", label: "Overlay",   hint: "Transparent — place over photo",  bg: null,      swatchBg: undefined, swatchText: "rgba(255,255,255,0.6)" },
];

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [format, setFormat] = useState<Format>("receipt");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/activities/${id}`)
      .then((r) => r.json())
      .then(setActivity)
      .finally(() => setLoading(false));
  }, [id]);

  const activeFormat = FORMATS.find((f) => f.id === format)!;

  async function captureImage(): Promise<string | null> {
    if (!cardRef.current) return null;
    const { toPng } = await import("html-to-image");
    const opts: Parameters<typeof toPng>[1] = { quality: 1, pixelRatio: 3 };
    if (activeFormat.bg) opts.backgroundColor = activeFormat.bg;
    return toPng(cardRef.current, opts);
  }

  async function handleDownload() {
    setSaving(true);
    try {
      const dataUrl = await captureImage();
      if (!dataUrl) return;
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `tryathlete-${format}-${id}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  async function handleShare() {
    setSaving(true);
    try {
      const dataUrl = await captureImage();
      if (!dataUrl) return;
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const file = new File([blob], `tryathlete-${format}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `My ${activity?.type || "Workout"}`,
          text: "Check out my workout on TryAthlete!",
          files: [file],
        });
      } else {
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
        <div className="flex gap-3 overflow-x-auto pb-1">
          {FORMATS.map((f) => {
            const isActive = format === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5"
              >
                {/* Swatch */}
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
                  <span
                    className="text-[11px] font-black"
                    style={{ color: f.swatchText ?? "rgba(255,255,255,0.6)" }}
                  >
                    KM
                  </span>
                </div>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: isActive ? "var(--accent)" : "var(--text-3)" }}
                >
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-[var(--text-3)] mt-2 uppercase tracking-widest">
          {activeFormat.hint}
        </p>
      </div>

      {/* Card preview */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {format === "receipt" && (
          <RunReceipt receiptRef={cardRef} orderNumber={activity.id.slice(-4).toUpperCase()} {...sharedProps} />
        )}
        {format === "dark" && <DarkCard cardRef={cardRef} {...sharedProps} />}
        {format === "neon" && <NeonCard cardRef={cardRef} {...sharedProps} />}
        {format === "night" && <NightCard cardRef={cardRef} {...sharedProps} />}
        {format === "story" && <StoryCard cardRef={cardRef} {...sharedProps} />}
        {format === "retro" && <RetroCard cardRef={cardRef} {...sharedProps} />}
        {format === "minimal" && <MinimalCard cardRef={cardRef} {...sharedProps} />}
        {format === "transparent" && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundImage: "repeating-conic-gradient(#1e1e1e 0% 25%, #0a0a0a 0% 50%)",
              backgroundSize: "14px 14px",
            }}
          >
            <TransparentCard cardRef={cardRef} {...sharedProps} />
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="px-5 pb-10 pt-5 flex gap-3 border-t border-[var(--border)] bg-[var(--bg)]">
        <Button
          variant="accent"
          size="lg"
          className="flex-1"
          loading={saving}
          onClick={handleShare}
        >
          <Share2 size={15} />
          Save
        </Button>
        {/* <Button
          variant="surface"
          size="lg"
          loading={saving}
          onClick={handleDownload}
        >
          <Download size={15} />
          Download
        </Button> */}
      </div>
    </div>
  );
}
