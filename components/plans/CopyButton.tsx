"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all",
        className
      )}
      style={{
        background: copied ? "rgba(204,255,0,0.12)" : "var(--surface-2)",
        color: copied ? "var(--accent)" : "var(--text-2)",
      }}
    >
      {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
      {label ? (copied ? "Copied!" : label) : copied ? "Copied!" : "Copy"}
    </button>
  );
}
