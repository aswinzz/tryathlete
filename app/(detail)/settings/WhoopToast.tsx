"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";

export function WhoopToast({ type }: { type: "success" | "error" }) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      // Remove the query param from the URL
      router.replace("/settings", { scroll: false });
    }, 3500);
    return () => clearTimeout(t);
  }, [router]);

  if (!visible) return null;

  return (
    <div
      className="mx-5 mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold"
      style={{
        background: type === "success" ? "rgba(0,200,81,0.12)" : "rgba(239,68,68,0.12)",
        border: `1px solid ${type === "success" ? "rgba(0,200,81,0.3)" : "rgba(239,68,68,0.3)"}`,
        color: type === "success" ? "#00C851" : "#f87171",
      }}
    >
      {type === "success"
        ? <CheckCircle size={16} />
        : <XCircle size={16} />}
      {type === "success"
        ? "WHOOP connected — initial sync started."
        : "WHOOP connection failed. Please try again."}
    </div>
  );
}
