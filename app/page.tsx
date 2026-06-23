import Link from "next/link";
import { Button } from "@/components/ui/Button";

const TRACKERS = ["GARMIN", "APPLE", "COROS", "WHOOP", "STRAVA"];

const PREVIEW_LAPS = [
  { km: "1 KM", pace: "05'13\"", color: "#45B7D1", hr: "142" },
  { km: "2 KM", pace: "04'58\"", color: "#9B59B6", hr: "158" },
  { km: "3 KM", pace: "04'45\"", color: "#FF6B9D", hr: "168" },
];

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-dvh bg-[var(--bg)] px-5 pt-14 pb-10 select-none">
      {/* Background large number */}
      <div
        className="absolute top-10 right-4 text-[280px] font-black leading-none pointer-events-none"
        style={{ color: "rgba(255,255,255,0.04)", zIndex: 0 }}
        aria-hidden
      >
        7
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Wordmark */}
        <div className="mb-2">
          <h1 className="text-5xl font-black leading-none tracking-tight text-white">
            TRY
          </h1>
          <h1
            className="text-5xl font-black leading-none tracking-tight"
            style={{ color: "var(--accent)" }}
          >
            ATHLETE
          </h1>
        </div>

        {/* Accent line */}
        <div
          className="w-12 h-1 rounded-full mb-5 mt-3"
          style={{ background: "var(--accent)" }}
        />

        {/* Tagline */}
        <p className="text-3xl font-bold text-white leading-snug mb-3">
          Make every workout
          <br />
          instagrammable.
        </p>
        <p className="text-sm text-[var(--text-2)] leading-relaxed mb-8">
          Connect Garmin, Apple Watch, COROS or Whoop.
          <br />
          Turn your data into stunning shareable receipts.
        </p>

        {/* Preview Card */}
        <div className="bg-[var(--surface-2)] rounded-2xl overflow-hidden mb-8">
          <div
            className="h-[3px]"
            style={{ background: "var(--accent)" }}
          />
          <div className="p-5">
            <p className="text-[10px] font-semibold text-[var(--text-2)] uppercase tracking-widest mb-1">
              Morning Run · Outdoor
            </p>
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-4xl font-black text-white">12.4 KM</span>
              <span className="text-base font-bold text-[var(--text-2)]">01:04:22</span>
            </div>
            <div
              className="mb-3"
              style={{ borderTop: "1px solid var(--border)" }}
            />
            <div className="space-y-2">
              {PREVIEW_LAPS.map((lap) => (
                <div key={lap.km} className="flex items-center gap-3 text-xs">
                  <span className="text-[var(--text-2)] w-10">{lap.km}</span>
                  <span className="font-semibold text-white flex-1">{lap.pace}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: lap.color }}
                  />
                  <span className="text-[var(--text-2)] w-14 text-right">
                    {lap.hr} BPM
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3 mt-auto">
          <Link href="/auth/signup">
            <Button variant="accent" size="lg" fullWidth>
              Get Started — Free
            </Button>
          </Link>
          <p className="text-center text-sm text-[var(--text-2)]">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="text-white font-semibold hover:text-[var(--accent)] transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Tracker chips */}
        <div className="mt-8">
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-3">
            Works with
          </p>
          <div className="flex gap-2 flex-wrap">
            {TRACKERS.map((t) => (
              <span
                key={t}
                className="text-[9px] font-bold text-[var(--text-2)] bg-[var(--surface-2)] px-3 py-1 rounded-full uppercase tracking-wider"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
