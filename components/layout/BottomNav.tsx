"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Activity, Star, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", icon: LayoutGrid, label: "Feed" },
  { href: "/activity", icon: Activity, label: "Activity" },
  { href: "/explore", icon: Star, label: "Explore" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50">
      <div className="bg-[var(--surface-1)] border-t border-[var(--border)]">
        <ul className="flex">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = path.startsWith(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-1 pt-[14px] pb-[30px] text-[10px] font-medium uppercase tracking-wider transition-all active:scale-90 active:opacity-70",
                    active
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-3)] hover:text-[var(--text-2)]"
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 1.8}
                    className={active ? "text-[var(--accent)]" : ""}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        {/* iOS home indicator space */}
        <div className="h-safe-bottom" />
      </div>
    </nav>
  );
}
