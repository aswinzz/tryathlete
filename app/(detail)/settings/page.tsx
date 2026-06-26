import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  parseDataPrefs,
  DEFAULT_WHOOP_PREFS,
  DEFAULT_GARMIN_PREFS,
} from "@/lib/whoop";
import { DeviceSettings } from "./DeviceSettings";
import { WhoopToast } from "./WhoopToast";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const userId = session!.user!.id!;
  const sp = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { connections: true },
  });
  if (!user) return null;

  const garminConn = user.connections.find((c) => c.provider === "garmin");
  const whoopConn  = user.connections.find((c) => c.provider === "whoop");

  const garminPrefs = parseDataPrefs(garminConn?.dataPrefs, DEFAULT_GARMIN_PREFS as typeof DEFAULT_WHOOP_PREFS);
  const whoopPrefs  = parseDataPrefs(whoopConn?.dataPrefs,  DEFAULT_WHOOP_PREFS);

  const devices = [
    {
      provider:   "garmin",
      label:      "Garmin",
      color:      "#00B4D8",
      icon:       "G",
      connected:  !!garminConn,
      lastSyncAt: garminConn?.lastSyncAt?.toISOString() ?? null,
      prefs:      garminPrefs,
    },
    {
      provider:   "whoop",
      label:      "WHOOP",
      color:      "#00C851",
      icon:       "W",
      connected:  !!whoopConn,
      lastSyncAt: whoopConn?.lastSyncAt?.toISOString() ?? null,
      prefs:      whoopPrefs,
    },
  ];

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

      {/* OAuth toast feedback */}
      {sp.whoop === "connected" && <WhoopToast type="success" />}
      {sp.whoop === "error"     && <WhoopToast type="error" />}

      <div className="flex-1 px-5 py-7 space-y-8">
        {/* Profile */}
        <section>
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-4">
            Profile
          </p>
          <div className="space-y-2">
            <SettingsRow label="Name"  value={user.name  || "—"} />
            <SettingsRow label="Email" value={user.email} />
          </div>
        </section>

        {/* Device management (client component) */}
        <DeviceSettings devices={devices} />

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
