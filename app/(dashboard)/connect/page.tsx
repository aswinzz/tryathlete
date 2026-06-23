"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

const TRACKERS = [
  { id: "garmin", name: "Garmin", sub: "Connect + Garmin watches", color: "#00B4D8", available: true },
  { id: "apple", name: "Apple Watch", sub: "HealthKit integration", color: "#E8E8E8", available: false },
  { id: "coros", name: "COROS", sub: "COROS training hub", color: "#FF6B35", available: false },
  { id: "whoop", name: "Whoop", sub: "Recovery + strain data", color: "#00C851", available: false },
  { id: "strava", name: "Strava", sub: "Import from Strava", color: "#FC4C02", available: false },
];

export default function ConnectPage() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>("garmin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<string[]>([]);
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

    // Auto-sync
    setSyncing(true);
    await fetch("/api/garmin/sync", { method: "POST" });
    setSyncing(false);
  }

  return (
    <div className="px-5 pt-14 pb-10 flex flex-col min-h-dvh">
      <Link
        href="/dashboard"
        className="text-sm text-[var(--text-2)] mb-10 inline-block hover:text-white transition-colors"
      >
        ← Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">
          Connect your{" "}
          <span style={{ color: "var(--accent)" }}>tracker.</span>
        </h1>
        <p className="text-sm text-[var(--text-2)] mt-2">
          We&apos;ll automatically import your runs, cycles, and workouts.
        </p>
      </div>

      <div className="space-y-3 flex-1">
        {TRACKERS.map((tracker) => {
          const isConnected = connected.includes(tracker.id);
          const isOpen = expanded === tracker.id;

          return (
            <div
              key={tracker.id}
              className="bg-[var(--surface-2)] rounded-2xl overflow-hidden"
            >
              <button
                className="w-full flex items-center gap-4 p-4"
                onClick={() =>
                  tracker.available && setExpanded(isOpen ? null : tracker.id)
                }
                disabled={!tracker.available}
              >
                {/* Logo */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-base font-black flex-shrink-0 border"
                  style={{
                    background: `${tracker.color}20`,
                    borderColor: `${tracker.color}40`,
                    color: tracker.color,
                  }}
                >
                  {tracker.name[0]}
                </div>

                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white text-sm">{tracker.name}</p>
                    {!tracker.available && (
                      <span className="text-[9px] font-bold text-[var(--text-3)] uppercase tracking-wider bg-[var(--surface-3)] px-2 py-0.5 rounded-full">
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-2)] mt-0.5">{tracker.sub}</p>
                </div>

                {isConnected ? (
                  <CheckCircle2 size={20} className="text-[var(--accent)] flex-shrink-0" />
                ) : tracker.available ? (
                  isOpen ? (
                    <ChevronUp size={18} className="text-[var(--text-3)]" />
                  ) : (
                    <ChevronDown size={18} className="text-[var(--text-3)]" />
                  )
                ) : null}
              </button>

              {/* Garmin form */}
              {isOpen && tracker.id === "garmin" && !isConnected && (
                <form onSubmit={handleGarminConnect} className="px-4 pb-4 space-y-3 border-t border-[var(--border)] pt-4">
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

              {/* Connected state */}
              {isConnected && (
                <div className="px-4 pb-4 pt-2 border-t border-[var(--border)]">
                  {syncing ? (
                    <p className="text-xs text-[var(--text-2)] flex items-center gap-2">
                      <span className="w-3 h-3 border border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      Syncing activities…
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--accent)] flex items-center gap-1.5">
                      <CheckCircle2 size={13} />
                      Connected & synced
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 space-y-3">
        <Button
          variant="accent"
          size="lg"
          fullWidth
          onClick={() => router.push("/dashboard")}
        >
          Continue to Dashboard
        </Button>
        <button
          className="w-full text-center text-sm text-[var(--text-2)] hover:text-white transition-colors py-2"
          onClick={() => router.push("/dashboard")}
        >
          Skip for now — I&apos;ll connect later
        </button>
      </div>
    </div>
  );
}
