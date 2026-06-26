"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

interface Props {
  hasGarmin?: boolean;
  hasWhoop?:  boolean;
}

export function SyncButton({ hasGarmin = true, hasWhoop = false }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const calls: Promise<Response>[] = [];
      if (hasGarmin) calls.push(fetch("/api/garmin/sync", { method: "POST" }));
      if (hasWhoop)  calls.push(fetch("/api/whoop/sync",  { method: "POST" }));
      await Promise.allSettled(calls);
      router.refresh();
    } catch {
      // silent fail
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      onClick={handleSync}
      disabled={syncing}
      className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
      title="Sync"
    >
      <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
    </button>
  );
}
