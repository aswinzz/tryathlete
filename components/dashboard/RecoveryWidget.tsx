import Link from "next/link";
import { Heart, Moon, Zap, ChevronRight, Activity } from "lucide-react";

interface Props {
  recovery: {
    date:          Date;
    recoveryScore: number | null;
    hrv:           number | null;
    restingHR:     number | null;
    totalSleepMin: number | null;
    sleepScore:    number | null;
    strain:        number | null;
  } | null;
  /** Pass false when WHOOP is not connected at all */
  whoopConnected: boolean;
}

function scoreColor(score: number | null): string {
  if (score === null) return "var(--text-3)";
  if (score >= 67)    return "#00C851";
  if (score >= 34)    return "#FF9500";
  return "#FF3B30";
}

function scoreLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 67)    return "Optimal";
  if (score >= 34)    return "Moderate";
  return "Low";
}

function fmtSleep(mins: number | null): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function RecoveryWidget({ recovery, whoopConnected }: Props) {
  if (!whoopConnected) return null;

  if (!recovery) {
    return (
      <div className="bg-[var(--surface-2)] rounded-2xl p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[var(--surface-3)] flex items-center justify-center">
          <Activity size={18} className="text-[var(--text-3)]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">WHOOP Recovery</p>
          <p className="text-xs text-[var(--text-3)] mt-0.5">No data yet — sync to fetch</p>
        </div>
      </div>
    );
  }

  const color = scoreColor(recovery.recoveryScore);

  return (
    <Link href="/wellness" className="block">
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: "var(--surface-2)" }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">
            Today&apos;s Recovery
          </p>
          <div className="flex items-center gap-1 text-[var(--text-3)]">
            <span className="text-[11px]">Details</span>
            <ChevronRight size={12} />
          </div>
        </div>

        {/* Score + stats row */}
        <div className="flex items-center gap-4">
          {/* Score ring */}
          <div
            className="relative w-16 h-16 flex-shrink-0 rounded-full flex items-center justify-center"
            style={{ background: `${color}18`, border: `2px solid ${color}` }}
          >
            <div className="text-center">
              <p className="text-xl font-black" style={{ color, lineHeight: 1 }}>
                {recovery.recoveryScore ?? "—"}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color }}>
                {scoreLabel(recovery.recoveryScore)}
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex-1 grid grid-cols-3 gap-2">
            <Metric
              icon={<Zap size={11} />}
              label="HRV"
              value={recovery.hrv !== null ? `${Math.round(recovery.hrv)}ms` : "—"}
              color="#00B4D8"
            />
            <Metric
              icon={<Heart size={11} />}
              label="Resting HR"
              value={recovery.restingHR !== null ? `${recovery.restingHR}bpm` : "—"}
              color="#FF6B6B"
            />
            <Metric
              icon={<Moon size={11} />}
              label="Sleep"
              value={fmtSleep(recovery.totalSleepMin)}
              color="#9B8FFF"
            />
          </div>
        </div>

        {/* Strain bar */}
        {recovery.strain !== null && (
          <div>
            <div className="flex justify-between text-[10px] text-[var(--text-3)] mb-1">
              <span>Strain</span>
              <span className="font-bold text-white">{recovery.strain.toFixed(1)} / 21</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (recovery.strain / 21) * 100)}%`,
                  background: "linear-gradient(90deg, #00B4D8, #FF6B6B)",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function Metric({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl px-2 py-2 flex flex-col items-center gap-1 text-center"
      style={{ background: `${color}10` }}
    >
      <span style={{ color }}>{icon}</span>
      <p className="text-xs font-bold text-white leading-tight">{value}</p>
      <p className="text-[9px] text-[var(--text-3)] leading-tight">{label}</p>
    </div>
  );
}
