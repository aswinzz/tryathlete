import Link from "next/link";
import { Button } from "@/components/ui/Button";

const TRACKERS = ["GARMIN", "APPLE", "COROS", "WHOOP", "STRAVA"];

const PREVIEW_LAPS = [
  { km: "1 KM", pace: "05'13\"", color: "#45B7D1", hr: "142" },
  { km: "2 KM", pace: "04'58\"", color: "#9B59B6", hr: "158" },
  { km: "3 KM", pace: "04'45\"", color: "#FF6B9D", hr: "168" },
];

export default function GetStartedPage() {
  return (
    <div className="app-container">
      <main className="flex flex-col min-h-dvh bg-[var(--bg)] px-5 pt-14 pb-10 select-none">
        {/* Background large number */}
        <div
          className="absolute top-10 right-4 text-[280px] font-black leading-none pointer-events-none"
          style={{ color: "rgba(255,255,255,0.04)", zIndex: 0 }}
          aria-hidden
        >
          7
        </div>

        <div className="relative z-10 flex flex-col flex-1 justify-between gap-6">
          {/* Top: Wordmark + tagline */}
          <div>
            <div className="mb-4">
              <h1 className="text-[52px] font-black leading-none tracking-tight text-white">
                TRY
              </h1>
              <h1
                className="text-[52px] font-black leading-none tracking-tight"
                style={{ color: "var(--accent)" }}
              >
                ATHLETE
              </h1>
            </div>
            <p className="text-3xl font-bold text-white leading-snug mb-3">
              Give your AI coach
              <br />
              real training data.
            </p>
            <p className="text-sm text-[var(--text-2)] leading-relaxed">
              Connect your wearables, build structured training plans,
              <br />
              and let AI work with your actual workouts — not guesses.
            </p>
          </div>

          {/* Middle: Feature list */}
          <div className="bg-[var(--surface-2)] rounded-2xl overflow-hidden">
            <div className="h-[3px]" style={{ background: "var(--accent)" }} />
            <div className="p-5 space-y-4">
              {[
                { icon: "⚡", label: "Sync Strava, WHOOP & Garmin automatically" },
                { icon: "📋", label: "Build structured multi-week training plans" },
                { icon: "💤", label: "Track HRV, sleep & daily recovery scores" },
                { icon: "🤖", label: "Export context to ChatGPT or Claude instantly" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <span className="text-xl">{f.icon}</span>
                  <span className="text-sm text-white">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: CTA + chips */}
          <div className="space-y-5">
            <div className="space-y-3">
              <Link href="/auth/signup">
                <Button variant="accent" size="lg" fullWidth>
                  Get Started — Free
                </Button>
              </Link>
              <p className="text-center text-sm text-[var(--text-2)] pt-2">
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="text-white font-semibold hover:text-[var(--accent)] transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-3">
                Works with
              </p>
              <div className="flex gap-2 flex-wrap">
                {TRACKERS.map((t) => (
                  <span
                    key={t}
                    className="text-[9px] font-bold text-[var(--text-2)] bg-[var(--surface-2)] px-3 py-1.5 rounded-full uppercase tracking-wider"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
