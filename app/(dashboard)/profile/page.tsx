/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDuration } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Settings, CheckCircle2, Link2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { activities: { orderBy: { startTime: "asc" } }, connections: true },
  });

  if (!user) return null;

  const totalActivities = user.activities.length;
  const totalKm = user.activities.reduce((s, a) => s + (a.distance || 0), 0) / 1000;
  const totalDuration = user.activities.reduce((s, a) => s + a.duration, 0);

  const runs = user.activities.filter((a) => a.type.toLowerCase().includes("run"));
  const best5k = runs.reduce(
    (best: (typeof runs)[0] | null, a) => {
      const d = a.distance || 0;
      if (d < 4800 || d > 5200) return best;
      if (!best || a.duration < best.duration) return a;
      return best;
    },
    null
  );

  const garminConn = user.connections.find((c) => c.provider === "garmin");

  // Monthly distances for chart
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentYear = new Date().getFullYear();
  const monthlyKm = months.map((_, m) => {
    const acts = user.activities.filter((a) => {
      const d = new Date(a.startTime);
      return d.getFullYear() === currentYear && d.getMonth() === m;
    });
    return acts.reduce((s, a) => s + (a.distance || 0), 0) / 1000;
  });
  const maxKm = Math.max(...monthlyKm, 1);

  const currentMonth = new Date().getMonth();
  const visibleMonths = monthlyKm.slice(0, currentMonth + 1);

  return (
    <div className="px-5 pt-14 pb-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <button className="text-[var(--text-2)] hover:text-white transition-colors">
          <Settings size={20} />
        </button>
      </div>

      {/* Avatar + info */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-2xl font-black"
          style={{ border: "2px solid var(--accent)", color: "var(--accent)" }}>
          {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-bold text-white text-lg">{user.name || "Athlete"}</p>
          <p className="text-xs text-[var(--text-2)]">{user.email}</p>
          {garminConn && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--accent)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full mt-1">
              <CheckCircle2 size={10} />
              Garmin Connected
            </span>
          )}
        </div>
        <button className="text-xs font-semibold text-[var(--text-2)] bg-[var(--surface-2)] px-4 py-2 rounded-full hover:bg-[var(--surface-3)] transition-colors">
          Edit
        </button>
      </div>

      {/* Stats banner */}
      <Card accentTop>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: totalActivities.toString(), l: "Activities" },
              { v: `${totalKm.toFixed(0)}`, l: "Total KM" },
              { v: best5k ? formatDuration(best5k.duration) : "—", l: "Best 5K" },
              { v: Math.ceil(totalDuration / 86400).toString(), l: "Days" },
            ].map(({ v, l }, i) => (
              <div key={i} className={i > 0 ? "border-l border-[var(--border)] pl-2" : ""}>
                <p className="text-lg font-bold text-white">{v}</p>
                <p className="text-[9px] font-bold text-[var(--text-2)] uppercase tracking-widest">{l}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly chart */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">Monthly Distance</h2>
          <span className="text-xs text-[var(--text-2)]">{currentYear}</span>
        </div>
        <div className="flex items-end gap-1.5 h-20">
          {visibleMonths.map((km, i) => {
            const h = Math.max((km / maxKm) * 72, km > 0 ? 4 : 2);
            const isCurrentMonth = i === currentMonth;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                {km > 0 && (
                  <span className={`text-[8px] font-bold ${isCurrentMonth ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}>
                    {km.toFixed(0)}
                  </span>
                )}
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: h,
                    background: isCurrentMonth ? "var(--accent)" : "var(--surface-3)",
                  }}
                />
                <span className={`text-[8px] ${isCurrentMonth ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}>
                  {months[i].charAt(0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Connections */}
      <div>
        <h2 className="text-sm font-bold text-white mb-3">Connections</h2>
        <div className="space-y-2">
          {garminConn ? (
            <div className="bg-[var(--surface-2)] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm"
                  style={{ background: "#00B4D220", color: "#00B4D2" }}>
                  G
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Garmin</p>
                  <p className="text-xs text-[var(--text-2)]">{garminConn.garminUsername}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[var(--accent)]">CONNECTED</span>
            </div>
          ) : (
            <Link href="/connect" className="block bg-[var(--surface-2)] rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] flex items-center justify-center">
                  <Link2 size={18} className="text-[var(--text-2)]" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Connect a tracker</p>
                  <p className="text-xs text-[var(--text-2)]">Garmin, Apple Watch, COROS…</p>
                </div>
              </div>
            </Link>
          )}
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
