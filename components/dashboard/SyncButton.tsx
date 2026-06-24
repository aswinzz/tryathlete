"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      await fetch("/api/garmin/sync", { method: "POST" });
      router.refresh();
    } catch {
      // silent fail — user can retry
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
      title="Sync Garmin"
    >
      <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
    </button>
  );
}
