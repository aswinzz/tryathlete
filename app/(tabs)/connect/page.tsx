"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const TRACKERS = [
  { id: "garmin", name: "Garmin",      sub: "Garmin watches + Connect",  color: "#00B4D8", available: true,  oauth: false },
  { id: "whoop",  name: "WHOOP",       sub: "Recovery, sleep & HRV",     color: "#00C851", available: true,  oauth: true  },
  { id: "apple",  name: "Apple Watch", sub: "HealthKit integration",      color: "#9E9E9E", available: false, oauth: false },
  { id: "coros",  name: "COROS",       sub: "COROS training hub",         color: "#FF6B35", available: false, oauth: false },
  { id: "strava", name: "Strava",      sub: "Import from Strava",         color: "#FC4C02", available: false, oauth: false },
];

export default function ConnectPage() {
  const router = useRouter();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connected, setConnected] = useState<string[]>([]);
  const [showForm, setShowForm] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function handleGarminConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/garmin/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Connection failed");
      return;
    }
    setConnected((c) => [...c, "garmin"]);
    setShowForm(null);
    setSyncing(true);
    await fetch("/api/garmin/sync", { method: "POST" });
    setSyncing(false);
  }

  return (
    <div className="px-5 pt-14 pb-10 flex flex-col min-h-dvh">
      <Link
        href="/dashboard"
        className="text-sm text-[var(--text-2)] mb-8 inline-flex items-center gap-1 hover:text-white transition-colors"
      >
        ← Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-white leading-tight">
          Connect your{" "}
          <span style={{ color: "var(--accent)" }}>tracker.</span>
        </h1>
        <p className="text-sm text-[var(--text-2)] mt-2">
          We&apos;ll automatically import your runs,<br />cycles, swims and workouts.
        </p>
      </div>

      <div className="space-y-3 flex-1">
        {TRACKERS.map((tracker) => {
          const isConnected = connected.includes(tracker.id);
          const isFormOpen = showForm === tracker.id;

          return (
            <div
              key={tracker.id}
              className="bg-[var(--surface-2)] rounded-2xl overflow-hidden"
            >
              <div className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-base font-black flex-shrink-0"
                  style={{
                    background: `${tracker.color}25`,
                    color: tracker.color,
                  }}
                >
                  {tracker.name[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{tracker.name}</p>
                  <p className="text-xs text-[var(--text-2)] mt-0.5">{tracker.sub}</p>
                </div>

                {isConnected ? (
                  <span
                    className="text-[11px] font-black px-3 py-1.5 rounded-full flex-shrink-0"
                    style={{ background: "var(--accent)", color: "var(--bg)" }}
                  >
                    CONNECTED
                  </span>
                ) : tracker.available && tracker.oauth ? (
                  <a
                    href={`/api/${tracker.id}/auth`}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-full flex-shrink-0 transition-colors"
                    style={{ background: "var(--surface-3)", color: "var(--text)" }}
                  >
                    CONNECT
                  </a>
                ) : (
                  <button
                    onClick={() => tracker.available && setShowForm(isFormOpen ? null : tracker.id)}
                    disabled={!tracker.available}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-full flex-shrink-0 transition-colors"
                    style={{
                      background: "var(--surface-3)",
                      color: tracker.available ? "var(--text)" : "var(--text-3)",
                      cursor: tracker.available ? "pointer" : "default",
                    }}
                  >
                    {tracker.available ? "CONNECT" : "SOON"}
                  </button>
                )}
              </div>

              {/* Garmin credentials form */}
              {isFormOpen && tracker.id === "garmin" && !isConnected && (
                <form
                  onSubmit={handleGarminConnect}
                  className="px-4 pb-4 space-y-3 border-t border-[var(--border)] pt-4"
                >
                  <p className="text-xs text-[var(--text-2)]">
                    Enter your Garmin Connect credentials to import activities.
                  </p>
                  <Input
                    label="Garmin Email"
                    type="email"
                    placeholder="you@example.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <Input
                    label="Garmin Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    error={error}
                  />
                  <Button type="submit" variant="accent" fullWidth loading={loading}>
                    Connect Garmin
                  </Button>
                </form>
              )}

              {/* Post-connect syncing state */}
              {isConnected && syncing && (
                <div className="px-4 pb-3 pt-1 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--text-2)] flex items-center gap-2">
                    <span className="w-3 h-3 border border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    Syncing activities…
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        className="w-full text-center text-sm text-[var(--text-2)] hover:text-white transition-colors py-4 mt-6"
        onClick={() => router.push("/dashboard")}
      >
        Skip for now — I&apos;ll connect later
      </button>
    </div>
  );
}
