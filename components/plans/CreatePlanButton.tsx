"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  label?: string;
}

export function CreatePlanButton({ label }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
    });
    if (res.ok) {
      const plan = await res.json();
      router.push(`/plans/${plan.id}`);
    }
    setLoading(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl"
        style={{ background: "var(--accent)", color: "#000" }}
      >
        <Plus size={15} strokeWidth={2.5} />
        {label || "New Plan"}
      </button>

      {/* Sheet overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-2xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px)+80px)] space-y-4"
            style={{ background: "var(--surface-1)" }}
          >
            <div className="flex items-center justify-between">
              <p className="font-bold text-white text-lg">New Plan</p>
              <button onClick={() => setOpen(false)}>
                <X size={20} className="text-[var(--text-3)]" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                  Plan Title
                </label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 16-Week Marathon Plan"
                  className="w-full mt-1 px-4 py-3 rounded-xl text-white text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--text-3)] uppercase tracking-wider">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this plan for?"
                  rows={3}
                  className="w-full mt-1 px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={!title.trim() || loading}
              className="w-full py-3 rounded-xl font-bold text-sm transition-opacity disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              {loading ? "Creating…" : "Create Plan"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
