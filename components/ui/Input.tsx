import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label className="text-xs font-semibold text-[var(--text-2)] uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-5 py-[15px] text-base text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent)] transition-colors",
            error && "border-[var(--zone-5)]",
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs text-[var(--zone-5)]">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
