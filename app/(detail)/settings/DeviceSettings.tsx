"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wifi, WifiOff, Loader2, Check, ChevronRight } from "lucide-react";

interface DevicePrefs {
  syncActivities: boolean;
  syncRecovery:   boolean;
  syncSleep:      boolean;
}

interface ConnectedDevice {
  provider:   string;
  label:      string;
  color:      string;
  icon:       string;
  connected:  boolean;
  lastSyncAt: string | null;
  prefs:      DevicePrefs;
}

interface Props {
  devices: ConnectedDevice[];
  showGarminForm?: boolean;
}

export function DeviceSettings({ devices: initial }: Props) {
  const router = useRouter();
  const [devices, setDevices] = useState(initial);
  const [disconnecting, setDisconnecting]   = useState<string | null>(null);
  const [savingPref, setSavingPref]         = useState<string | null>(null); // "provider:key"
  const [garminForm, setGarminForm]         = useState(false);
  const [garminUser, setGarminUser]         = useState("");
  const [garminPass, setGarminPass]         = useState("");
  const [garminError, setGarminError]       = useState("");
  const [garminLoading, setGarminLoading]   = useState(false);

  const garmin = devices.find((d) => d.provider === "garmin");
  const whoop  = devices.find((d) => d.provider === "whoop");
  const connectedCount = devices.filter((d) => d.connected).length;
  const bothConnected = (connectedCount >= 2);

  // ── Garmin connect ─────────────────────────────────────────────────────────
  async function connectGarmin(e: React.FormEvent) {
    e.preventDefault();
    setGarminError("");
    setGarminLoading(true);
    const res = await fetch("/api/garmin/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: garminUser, password: garminPass }),
    });
    const data = await res.json();
    if (!res.ok) { setGarminError(data.error || "Connection failed"); setGarminLoading(false); return; }
    await fetch("/api/garmin/sync", { method: "POST" });
    setGarminLoading(false);
    router.refresh();
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────
  async function disconnect(provider: string) {
    setDisconnecting(provider);
    const url =
      provider === "garmin" ? "/api/garmin/connect" : `/api/${provider}/disconnect`;
    await fetch(url, { method: "DELETE" });
    setDisconnecting(null);
    router.refresh();
  }

  // ── Preferences ────────────────────────────────────────────────────────────
  async function updatePref(provider: string, key: keyof DevicePrefs, value: boolean) {
    const tag = `${provider}:${key}`;
    setSavingPref(tag);
    const res = await fetch(`/api/tracker/${provider}/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    if (res.ok) {
      const { prefs } = await res.json();
      // Mutually exclusive syncActivities — update all devices
      setDevices((prev) => prev.map((d) => {
        if (d.provider === provider) return { ...d, prefs };
        if (key === "syncActivities" && value) {
          return { ...d, prefs: { ...d.prefs, syncActivities: false } };
        }
        return d;
      }));
    }
    setSavingPref(null);
  }

  return (
    <div className="space-y-8">

      {/* ── Device Cards ────────────────────────────────────────────────────── */}
      <section>
        <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-4">
          Connected Devices
        </p>
        <div className="space-y-3">

          {/* Garmin */}
          <DeviceCard
            label="Garmin"
            sub="Connect with email + password"
            color="#00B4D8"
            icon="G"
            connected={garmin?.connected ?? false}
            lastSyncAt={garmin?.lastSyncAt ?? null}
            disconnecting={disconnecting === "garmin"}
            onDisconnect={() => disconnect("garmin")}
            action={
              !garmin?.connected ? (
                <button
                  onClick={() => setGarminForm((v) => !v)}
                  className="text-xs font-bold text-[var(--accent)] bg-[var(--surface-3)] px-3 py-1.5 rounded-full"
                >
                  {garminForm ? "Cancel" : "Connect"}
                </button>
              ) : undefined
            }
          >
            {!garmin?.connected && garminForm && (
              <form onSubmit={connectGarmin} className="space-y-2 border-t border-[var(--border)] pt-3">
                <p className="text-xs text-[var(--text-3)]">Enter your Garmin Connect credentials.</p>
                <input
                  type="email"
                  placeholder="Email"
                  value={garminUser}
                  onChange={(e) => setGarminUser(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={garminPass}
                  onChange={(e) => setGarminPass(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}
                />
                {garminError && <p className="text-xs text-red-400">{garminError}</p>}
                <button
                  type="submit"
                  disabled={garminLoading}
                  className="w-full py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "var(--accent)", color: "#000" }}
                >
                  {garminLoading && <Loader2 size={13} className="animate-spin" />}
                  {garminLoading ? "Connecting…" : "Connect Garmin"}
                </button>
              </form>
            )}
          </DeviceCard>

          {/* WHOOP */}
          <DeviceCard
            label="WHOOP"
            sub="Connect via OAuth"
            color="#00C851"
            icon="W"
            connected={whoop?.connected ?? false}
            lastSyncAt={whoop?.lastSyncAt ?? null}
            disconnecting={disconnecting === "whoop"}
            onDisconnect={() => disconnect("whoop")}
            action={
              !whoop?.connected ? (
                <a
                  href="/api/whoop/auth"
                  className="text-xs font-bold text-[var(--accent)] bg-[var(--surface-3)] px-3 py-1.5 rounded-full"
                >
                  Connect
                </a>
              ) : undefined
            }
          />

          {/* Strava */}
          {(() => {
            const strava = devices.find((d) => d.provider === "strava");
            return (
              <DeviceCard
                label="Strava"
                sub="Connect via OAuth"
                color="#FC4C02"
                icon="S"
                connected={strava?.connected ?? false}
                lastSyncAt={strava?.lastSyncAt ?? null}
                disconnecting={disconnecting === "strava"}
                onDisconnect={() => disconnect("strava")}
                action={
                  !strava?.connected ? (
                    <a
                      href="/api/strava/auth"
                      className="text-xs font-bold text-[var(--accent)] bg-[var(--surface-3)] px-3 py-1.5 rounded-full"
                    >
                      Connect
                    </a>
                  ) : undefined
                }
              />
            );
          })()}
        </div>
      </section>

      {/* ── Activity Source ──────────────────────────────────────────────────── */}
      {(garmin?.connected || whoop?.connected) && (
        <section>
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-1">
            Activity Source
          </p>
          <p className="text-xs text-[var(--text-3)] mb-4">
            {bothConnected
              ? "Choose which device syncs your workouts. Only one can be active to avoid duplicates."
              : "Workouts are synced from your connected device."}
          </p>
          <div className="space-y-2">
            {devices.filter((d) => d.connected).map((d) => {
              const isActive = d.prefs.syncActivities;
              const saving   = savingPref === `${d.provider}:syncActivities`;
              return (
                <button
                  key={d.provider}
                  onClick={() => !isActive && updatePref(d.provider, "syncActivities", true)}
                  disabled={isActive || saving}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
                  style={{
                    background: isActive ? `${d.color}15` : "var(--surface-2)",
                    border: isActive ? `1px solid ${d.color}50` : "1px solid transparent",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: `${d.color}25`, color: d.color }}
                  >
                    {d.icon}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-white">{d.label}</span>
                  {saving
                    ? <Loader2 size={15} className="animate-spin text-[var(--text-3)]" />
                    : isActive
                    ? <Check size={15} style={{ color: d.color }} />
                    : <div className="w-4 h-4 rounded-full border-2 border-[var(--border)]" />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── WHOOP Insights ───────────────────────────────────────────────────── */}
      {whoop?.connected && (
        <section>
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-1">
            WHOOP Insights
          </p>
          <p className="text-xs text-[var(--text-3)] mb-4">
            Choose what wellness data to fetch from WHOOP each sync.
          </p>
          <div className="bg-[var(--surface-2)] rounded-2xl divide-y divide-[var(--border)]">
            {([
              { key: "syncRecovery" as const, label: "Recovery Score + HRV", sub: "Daily readiness, resting HR, SpO₂" },
              { key: "syncSleep"    as const, label: "Sleep Analysis",        sub: "REM, deep, light, efficiency" },
            ] as const).map(({ key, label, sub }) => {
              const value  = whoop.prefs[key];
              const saving = savingPref === `whoop:${key}`;
              return (
                <div key={key} className="flex items-center gap-4 px-4 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-[var(--text-3)] mt-0.5">{sub}</p>
                  </div>
                  <button
                    onClick={() => updatePref("whoop", key, !value)}
                    disabled={saving}
                    className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                    style={{ background: value ? "#00C851" : "var(--surface-3)" }}
                    aria-label={`Toggle ${label}`}
                  >
                    {saving
                      ? <Loader2 size={12} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                      : <span
                          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                          style={{ left: value ? "calc(100% - 22px)" : "2px" }}
                        />}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── DeviceCard ───────────────────────────────────────────────────────────────

function DeviceCard({
  label, sub, color, icon, connected, lastSyncAt, disconnecting, onDisconnect,
  action, children,
}: {
  label: string; sub: string; color: string; icon: string;
  connected: boolean; lastSyncAt: string | null;
  disconnecting: boolean; onDisconnect: () => void;
  /** Button/link shown in the row when not connected */
  action?: React.ReactNode;
  /** Content shown below the row (e.g. connect form) */
  children?: React.ReactNode;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const syncLabel = lastSyncAt
    ? `Last synced ${new Date(lastSyncAt).toLocaleDateString()}`
    : "Never synced";

  return (
    <div className="bg-[var(--surface-2)] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-base font-black flex-shrink-0"
          style={{ background: connected ? `${color}20` : "var(--surface-3)", color: connected ? color : "var(--text-3)" }}
        >
          {connected ? icon : <WifiOff size={16} className="text-[var(--text-3)]" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-[var(--text-3)] mt-0.5">
            {connected ? syncLabel : sub}
          </p>
        </div>
        {connected ? (
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: `${color}15`, color }}
            >
              <Wifi size={11} /> Active <ChevronRight size={10} className={showMenu ? "rotate-90 transition-transform" : "transition-transform"} />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-full mt-1 z-10 rounded-xl overflow-hidden shadow-xl"
                style={{ background: "var(--surface-1)", border: "1px solid var(--border)", minWidth: 140 }}
              >
                <button
                  onClick={() => { setShowMenu(false); onDisconnect(); }}
                  disabled={disconnecting}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[var(--surface-2)] transition-colors flex items-center gap-2"
                >
                  {disconnecting ? <Loader2 size={13} className="animate-spin" /> : <WifiOff size={13} />}
                  Disconnect
                </button>
              </div>
            )}
          </div>
        ) : action}
      </div>
      {/* Below-row expansion (e.g. Garmin credential form) */}
      {children && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
