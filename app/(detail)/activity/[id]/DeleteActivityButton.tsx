"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

/** Delete a manually logged workout (synced activities reappear on next sync). */
export function DeleteActivityButton({ activityId }: { activityId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
    setDeleting(true);
    const res = await fetch(`/api/activities/${activityId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/activity");
      router.refresh();
    } else {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={doDelete}
          disabled={deleting}
          className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
          style={{ background: "rgba(255,71,87,0.15)", color: "#ff4757", border: "1px solid rgba(255,71,87,0.3)" }}
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          {deleting ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="text-xs text-[var(--text-3)] hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Delete workout"
      className="p-2 text-[var(--text-3)] hover:text-[#ff4757] transition-colors"
    >
      <Trash2 size={18} />
    </button>
  );
}
