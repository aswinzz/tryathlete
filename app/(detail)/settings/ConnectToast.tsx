"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";

const PROVIDER_LABELS: Record<string, string> = {
  whoop:  "WHOOP",
  strava: "Strava",
  garmin: "Garmin",
};

export function ConnectToast({
  provider,
  type,
}: {
  provider: string;
  type: "connected" | "error";
}) {
  const router  = useRouter();
  const [visible, setVisible] = useState(true);
  const label = PROVIDER_LABELS[provider] ?? provider;

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      router.replace("/settings", { scroll: false });
    }, 3500);
    return () => clearTimeout(t);
  }, [router]);

  if (!visible) return null;

  return (
    <div
      className="mx-5 mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold"
      style={{
        background: type === "connected" ? "rgba(0,200,81,0.12)" : "rgba(239,68,68,0.12)",
        border: `1px solid ${type === "connected" ? "rgba(0,200,81,0.3)" : "rgba(239,68,68,0.3)"}`,
        color: type === "connected" ? "#00C851" : "#f87171",
      }}
    >
      {type === "connected" ? <CheckCircle size={16} /> : <XCircle size={16} />}
      {type === "connected"
        ? `${label} connected — initial sync started.`
        : `${label} connection failed. Please try again.`}
    </div>
  );
}
