"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function SyncLapsButton({ activityId }: { activityId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/garmin/sync-laps/${activityId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="surface" size="sm" onClick={handleSync} disabled={loading}>
        <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        {loading ? "Syncing..." : "Load Splits"}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
