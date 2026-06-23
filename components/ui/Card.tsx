import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accentTop?: boolean;
  accentColor?: string;
}

export function Card({ accentTop, accentColor, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "relative bg-[var(--surface-2)] rounded-2xl overflow-hidden",
        className
      )}
      {...props}
    >
      {accentTop && (
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: accentColor || "var(--accent)" }}
        />
      )}
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4", className)} {...props}>
      {children}
    </div>
  );
}
