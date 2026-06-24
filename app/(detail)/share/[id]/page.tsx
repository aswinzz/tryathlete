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
  | "overlay-clean" | "overlay-bar" | "overlay-bold" | "overlay-pills";

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
  { id: "receipt",      label: "Receipt",   hint: "Paper thermal receipt",          bg: "#FAFAF8", swatchBg: "#FAFAF8", swatchText: "#333",                   group: "Cards" },
  { id: "dark",         label: "Dark",      hint: "App-style dark card",            bg: "#0a0a0a", swatchBg: "#0a0a0a", swatchText: "rgba(255,255,255,0.6)",   group: "Cards" },
  { id: "neon",         label: "Neon",      hint: "Dark card, lime accents",        bg: "#050505", swatchBg: "#050505", swatchText: "#c8ff00",                 group: "Cards" },
  { id: "night",        label: "Night",     hint: "Deep blue, indigo accents",      bg: "#080c18", swatchBg: "#080c18", swatchText: "#818cf8",                 group: "Cards" },
  { id: "story",        label: "Story",     hint: "9:16 portrait for Stories",      bg: "#0a0a0a", swatchBg: "#0a0a0a", swatchText: "#c8ff00",                 group: "Cards" },
  { id: "retro",        label: "Retro",     hint: "Newspaper column style",         bg: "#F2EDE4", swatchBg: "#F2EDE4", swatchText: "#1a1a1a",                 group: "Cards" },
  { id: "minimal",      label: "Minimal",   hint: "Clean white, modern",            bg: "#ffffff", swatchBg: "#ffffff", swatchText: "#0a0a0a",                 group: "Cards" },
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
  const [config, setConfig] = useState<CardConfig>(DEFAULT_CONFIG);
  const cardRef = useRef<HTMLDivElement>(null);

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
        {(["Cards", "Overlay"] as const).map((group) => {
          const groupFormats = FORMATS.filter((f) => f.group === group);
          return (
            <div key={group} className="mb-3">
              <p className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-2">
                {group === "Overlay" ? "Overlay (transparent PNG)" : group}
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {groupFormats.map((f) => {
                  const isActive = format === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
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
                        <span className="text-[11px] font-black" style={{ color: f.swatchText ?? "rgba(255,255,255,0.6)" }}>
                          KM
                        </span>
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
        {format === "dark" && <DarkCard cardRef={cardRef} config={config} {...sharedProps} />}
        {format === "neon" && <NeonCard cardRef={cardRef} config={config} {...sharedProps} />}
        {format === "night" && <NightCard cardRef={cardRef} config={config} {...sharedProps} />}
        {format === "story" && <StoryCard cardRef={cardRef} config={config} {...sharedProps} />}
        {format === "retro" && <RetroCard cardRef={cardRef} config={config} {...sharedProps} />}
        {format === "minimal" && <MinimalCard cardRef={cardRef} config={config} {...sharedProps} />}

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
