"use client";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "accent" | "surface" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "accent",
      size = "md",
      loading,
      fullWidth,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-bold rounded-full transition-all duration-150 select-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-95";

    const variants = {
      accent: "bg-[var(--accent)] text-[var(--bg)] hover:brightness-110",
      surface:
        "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-3)]",
      ghost: "bg-transparent text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
      danger: "bg-[var(--zone-5)] text-white hover:brightness-110",
    };

    const sizes = {
      sm: "px-5 py-3 text-xs",
      md: "px-6 py-4 text-sm",
      lg: "px-8 py-[17px] text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
