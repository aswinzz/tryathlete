"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RunReceipt } from "@/components/receipt/RunReceipt";
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

export default function SharePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/activities/${id}`)
      .then((r) => r.json())
      .then(setActivity)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDownload() {
    if (!receiptRef.current) return;
    setSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(receiptRef.current, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: "#FAFAF8",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `tryathlete-receipt-${id}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  async function handleShare() {
    if (!receiptRef.current) return;
    setSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(receiptRef.current, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: "#FAFAF8",
      });
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const file = new File([blob], "tryathlete-receipt.png", { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `My ${activity?.type || "Workout"} Receipt`,
          text: "Check out my workout on TryAthlete!",
          files: [file],
        });
      } else {
        // Fallback: download
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `tryathlete-receipt-${id}.png`;
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
        <Button variant="surface" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <button
          onClick={() => router.back()}
          className="text-sm font-semibold text-[var(--text-2)] hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h1 className="text-base font-bold text-white">Share Run</h1>
        <div className="w-16" />
      </div>

      {/* Receipt preview */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <RunReceipt
          receiptRef={receiptRef}
          name={activity.name}
          type={activity.type}
          startTime={new Date(activity.startTime)}
          duration={activity.duration}
          distance={activity.distance}
          avgHeartRate={activity.avgHeartRate}
          maxHeartRate={activity.maxHeartRate}
          avgPace={activity.avgPace}
          bestPace={activity.bestPace}
          calories={activity.calories}
          elevGain={activity.elevGain}
          steps={activity.steps}
          laps={activity.laps}
          orderNumber={activity.id.slice(-4).toUpperCase()}
        />
      </div>

      {/* Action bar */}
      <div className="px-5 pb-8 pt-4 space-y-3 border-t border-[var(--border)] bg-[var(--surface-1)]">
        <Button
          variant="accent"
          size="lg"
          fullWidth
          loading={saving}
          onClick={handleShare}
        >
          <Share2 size={16} />
          Share to Instagram
        </Button>
        <Button
          variant="surface"
          size="lg"
          fullWidth
          loading={saving}
          onClick={handleDownload}
        >
          <Download size={16} />
          Download Image
        </Button>
      </div>
    </div>
  );
}
