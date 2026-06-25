"use client";
import { X } from "lucide-react";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}

export function ConfirmSheet({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  loading,
  danger = true,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="w-full max-w-[480px] rounded-t-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px)+80px)] space-y-4"
        style={{ background: "var(--surface-1)" }}
      >
        <div className="flex items-center justify-between">
          <p className="font-bold text-white text-lg">{title}</p>
          <button onClick={onCancel}>
            <X size={20} className="text-[var(--text-3)]" />
          </button>
        </div>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-semibold text-sm"
            style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
            style={{
              background: danger ? "rgba(255,59,48,0.15)" : "var(--accent)",
              color: danger ? "#ff3b30" : "#000",
              border: danger ? "1px solid rgba(255,59,48,0.3)" : "none",
            }}
          >
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
