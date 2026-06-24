import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Smartphone, Wifi, WifiOff } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const userId = session!.user!.id!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { connections: true },
  });

  if (!user) return null;

  const garminConn = user.connections.find((c) => c.provider === "garmin");

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-5 border-b border-[var(--border)]">
        <Link
          href="/profile"
          className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-2)] hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-base font-bold text-white">Settings</h1>
        <div className="w-14" />
      </div>

      <div className="flex-1 px-5 py-7 space-y-8">
        {/* Profile details */}
        <section>
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-4">
            Profile
          </p>
          <div className="space-y-2">
            <SettingsRow label="Name" value={user.name || "—"} />
            <SettingsRow label="Email" value={user.email} />
          </div>
        </section>

        {/* Connected Devices */}
        <section>
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-4">
            Connected Devices
          </p>
          <div className="space-y-3">
            {/* Garmin */}
            <div className="bg-[var(--surface-2)] rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{
                    background: garminConn ? "rgba(200,255,0,0.12)" : "var(--surface-3)",
                  }}
                >
                  <Smartphone
                    size={18}
                    style={{ color: garminConn ? "var(--accent)" : "var(--text-3)" }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Garmin</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">
                    {garminConn ? "Connected · syncing automatically" : "Not connected"}
                  </p>
                </div>
              </div>
              {garminConn ? (
                <span
                  className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full"
                  style={{
                    background: "rgba(200,255,0,0.1)",
                    color: "var(--accent)",
                  }}
                >
                  <Wifi size={11} />
                  Active
                </span>
              ) : (
                <Link
                  href="/connect"
                  className="text-xs font-bold text-[var(--accent)] bg-[var(--surface-3)] px-3 py-1.5 rounded-full"
                >
                  Connect
                </Link>
              )}
            </div>

            {/* Other trackers — coming soon */}
            {["Apple Watch", "COROS", "Whoop", "Strava"].map((tracker) => (
              <div
                key={tracker}
                className="bg-[var(--surface-2)] rounded-2xl p-4 flex items-center justify-between opacity-40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--surface-3)]">
                    <WifiOff size={18} className="text-[var(--text-3)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{tracker}</p>
                    <p className="text-xs text-[var(--text-3)] mt-0.5">Coming soon</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[var(--text-3)] bg-[var(--surface-3)] px-3 py-1.5 rounded-full">
                  Soon
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* App info */}
        <section>
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-4">
            App
          </p>
          <div className="bg-[var(--surface-2)] rounded-2xl divide-y divide-[var(--border)]">
            <div className="px-5 py-4 flex items-center justify-between">
              <span className="text-sm text-[var(--text-2)]">Version</span>
              <span className="text-sm text-[var(--text-3)]">0.1.0 beta</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface-2)] rounded-2xl px-5 py-4 flex items-center justify-between">
      <span className="text-sm text-[var(--text-2)]">{label}</span>
      <span className="text-sm font-semibold text-white truncate max-w-[200px] text-right">
        {value}
      </span>
    </div>
  );
}
