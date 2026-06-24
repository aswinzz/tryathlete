/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Settings } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PB_COLORS = ["#9B59B6", "#45B7D1", "#4ECDC4", "#FF6B9D"];

export default async function ProfilePage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { activities: { orderBy: { startTime: "asc" } }, connections: true },
  });

  if (!user) return null;

  const totalActivities = user.activities.length;
  const totalKm = Math.round(user.activities.reduce((s, a) => s + (a.distance || 0), 0) / 1000);
  const runs = user.activities.filter((a) => a.type.toLowerCase().includes("run"));

  const best5k = runs.reduce((best: (typeof runs)[0] | null, a) => {
    const d = a.distance || 0;
    if (d < 4800 || d > 5200) return best;
    return !best || a.duration < best.duration ? a : best;
  }, null);

  const best10k = runs.reduce((best: (typeof runs)[0] | null, a) => {
    const d = a.distance || 0;
    if (d < 9800 || d > 10200) return best;
    return !best || a.duration < best.duration ? a : best;
  }, null);

  const bestHalf = runs.reduce((best: (typeof runs)[0] | null, a) => {
    const d = a.distance || 0;
    if (d < 20000 || d > 22000) return best;
    return !best || a.duration < best.duration ? a : best;
  }, null);

  const longestRun = runs.reduce((best: (typeof runs)[0] | null, a) =>
    !best || (a.distance || 0) > (best.distance || 0) ? a : best, null);

  // Day streak
  const activityDates = new Set(user.activities.map((a) => new Date(a.startTime).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (activityDates.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }

  const garminConn = user.connections.find((c) => c.provider === "garmin");

  // Monthly chart
  const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const monthlyKm = MONTH_LABELS.map((_, m) =>
    Math.round(
      user.activities
        .filter((a) => {
          const d = new Date(a.startTime);
          return d.getFullYear() === currentYear && d.getMonth() === m;
        })
        .reduce((s, a) => s + (a.distance || 0), 0) / 1000
    )
  );
  const maxKm = Math.max(...monthlyKm, 1);
  const visibleMonths = monthlyKm.slice(0, currentMonth + 1);

  const handle = user.name
    ? "@" + user.name.toLowerCase().replace(/\s+/g, "") + "vb"
    : "@" + user.email.split("@")[0];

  const personalBests = [
    { label: "5K", value: best5k ? formatDuration(best5k.duration) : "—", date: best5k ? new Date(best5k.startTime) : null },
    { label: "10K", value: best10k ? formatDuration(best10k.duration) : "—", date: best10k ? new Date(best10k.startTime) : null },
    { label: "Half", value: bestHalf ? formatDuration(bestHalf.duration) : "—", date: bestHalf ? new Date(bestHalf.startTime) : null },
    {
      label: "Longest",
      value: longestRun?.distance ? `${(longestRun.distance / 1000).toFixed(1)} KM` : "—",
      date: longestRun ? new Date(longestRun.startTime) : null,
    },
  ];

  return (
    <div className="px-5 pt-14 pb-28 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <Link href="/settings" className="text-[var(--text-2)] hover:text-white transition-colors p-1">
          <Settings size={20} />
        </Link>
      </div>

      {/* Avatar + info */}
      <div className="flex items-center gap-4">
        <div
          className="w-18 h-18 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0"
          style={{
            width: 72, height: 72,
            background: "rgba(200,255,0,0.15)",
            border: "2px solid rgba(200,255,0,0.35)",
            color: "var(--accent)",
          }}
        >
          {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-xl leading-tight">{user.name || "Athlete"}</p>
          <p className="text-sm text-[var(--text-2)] mt-1">
            {handle}
          </p>
          {garminConn && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full mt-2"
              style={{
                background: "rgba(200,255,0,0.12)",
                color: "var(--accent)",
                border: "1px solid rgba(200,255,0,0.25)",
              }}
            >
              ✓ GARMIN
            </span>
          )}
        </div>
        <Link href="/settings" className="text-xs font-semibold text-[var(--text-2)] bg-[var(--surface-2)] px-4 py-2.5 rounded-full hover:bg-[var(--surface-3)] transition-colors flex-shrink-0 whitespace-nowrap">
          Edit Profile
        </Link>
      </div>

      {/* Stats banner */}
      <div className="relative bg-[var(--surface-2)] rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "var(--accent)" }} />
        <div className="px-5 py-5">
          <div className="grid grid-cols-4">
            {[
              { v: streak.toString(), l: "DAY STREAK", pre: "🔥" },
              { v: totalKm.toString(), l: "TOTAL KM" },
              { v: best5k ? formatDuration(best5k.duration) : "—", l: "BEST 5K" },
              { v: totalActivities.toString(), l: "ACTIVITIES" },
            ].map(({ v, l, pre }, i) => (
              <div key={i} className={i > 0 ? "border-l border-[var(--border)] pl-3" : ""}>
                <p className="text-[18px] font-bold text-white leading-tight">
                  {pre && <span className="mr-0.5">{pre}</span>}{v}
                </p>
                <p className="text-[9px] font-semibold text-[var(--text-2)] uppercase tracking-wider mt-1 leading-tight">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Personal Bests */}
      <div>
        <h2 className="text-base font-bold text-white mb-4">Personal Bests</h2>
        <div className="space-y-3">
          {personalBests.map(({ label, value, date }, i) => (
            <div
              key={label}
              className="bg-[var(--surface-2)] rounded-[14px] flex items-center gap-3 pr-4 overflow-hidden"
              style={{ borderLeft: `4px solid ${PB_COLORS[i]}` }}
            >
              <div className="pl-4 py-4 flex-1">
                <p className="text-sm font-bold text-white">{label}</p>
                <p className="text-[9px] font-semibold text-[var(--text-3)] uppercase tracking-wider mt-0.5">PERSONAL BEST</p>
              </div>
              <span className="text-lg">👑</span>
              <p className="text-[22px] font-black text-white leading-none">{value}</p>
              {date && (
                <p className="text-[11px] text-[var(--text-3)] min-w-[54px] text-right">
                  {date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Distance chart */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-base font-black text-white">Monthly Distance (km)</h2>
          <span className="text-xs text-[var(--text-3)]">{currentYear}</span>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {visibleMonths.map((km, i) => {
            const h = Math.max((km / maxKm) * 88, km > 0 ? 8 : 3);
            const isCurrentMonth = i === currentMonth;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                {km > 0 && (
                  <span className={`text-[9px] font-bold ${isCurrentMonth ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}>
                    {km}
                  </span>
                )}
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: h,
                    background: isCurrentMonth ? "var(--accent)" : "var(--surface-3)",
                  }}
                />
                <span className={`text-[9px] ${isCurrentMonth ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}>
                  {MONTH_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sign out */}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button type="submit" variant="ghost" fullWidth className="text-[var(--text-3)]">
          Sign Out
        </Button>
      </form>
    </div>
  );
}
