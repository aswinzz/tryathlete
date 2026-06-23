import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "accent" | "surface" | "zone";
  color?: string;
}

export function Badge({ variant = "surface", color, className, children, ...props }: BadgeProps) {
  const variants = {
    accent: "bg-[var(--accent)] text-[var(--bg)]",
    surface: "bg-[var(--surface-3)] text-[var(--text-2)]",
    zone: "",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
        variants[variant],
        className
      )}
      style={color ? { backgroundColor: color, color: "#fff" } : undefined}
      {...props}
    >
      {children}
    </span>
  );
}
