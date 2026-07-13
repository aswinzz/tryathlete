import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Moon, Zap, Activity, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

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

function fmtDate(d: Date): string {
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default async function WellnessPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const userId = session!.user!.id!;

  const [whoopConn, garminConn] = await Promise.all([
    prisma.trackerConnection.findUnique({
      where: { userId_provider: { userId, provider: "whoop" } },
    }),
    prisma.trackerConnection.findUnique({
      where: { userId_provider: { userId, provider: "garmin" } },
    }),
  ]);

  if (!whoopConn && !garminConn) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="flex items-center justify-between px-5 pt-14 pb-5 border-b border-[var(--border)]">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-2)] hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back
          </Link>
          <h1 className="text-base font-bold text-white">Wellness</h1>
          <div className="w-14" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-4xl">💚</p>
          <p className="font-semibold text-[var(--text-2)]">No wellness data yet</p>
          <p className="text-sm text-[var(--text-3)]">
            Connect WHOOP or Garmin in Settings to sync recovery, sleep, and HRV data.
          </p>
          <Link
            href="/settings"
            className="text-sm font-bold px-5 py-2.5 rounded-full"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  let records = await prisma.whoopRecovery.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 30,
  });

  // Garmin fallback — Training Readiness / Body Battery mapped into the same
  // record shape (plus VO2 max & stress extras used by the today card).
  if (records.length === 0 && garminConn) {
    const garmin = await prisma.garminWellness.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 30,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    records = garmin.map((g: any) => ({
      id: g.id,
      date: g.date,
      recoveryScore: g.trainingReadiness ?? g.bodyBattery ?? null,
      hrv: g.hrv,
      restingHR: g.restingHR,
      totalSleepMin: g.totalSleepMin,
      sleepScore: g.sleepScore,
      sleepEff: null,
      remMin: g.remMin, deepMin: g.deepMin, lightMin: g.lightMin, awakeMin: g.awakeMin,
      strain: null, kilojoule: null, avgHR: null, maxHR: null,
      spo2: null, skinTemp: null, respRate: null,
      vo2Max: g.vo2Max, vo2MaxCycling: g.vo2MaxCycling,
      stressAvg: g.stressAvg, stressMax: g.stressMax,
      source: "garmin",
    }));
  }

  // Only label a record "Today" if its date is actually today (UTC)
  const utcNow    = new Date();
  const todayStart = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
  const latest    = records[0] ?? null;
  const isToday   = latest !== null && latest.date >= todayStart;
  const today     = latest; // still show most recent — but label it correctly below

  const avgHRV    = records.filter((r) => r.hrv    !== null).map((r) => r.hrv!);
  const avgHR     = records.filter((r) => r.restingHR !== null).map((r) => r.restingHR!);
  const avgScores = records.filter((r) => r.recoveryScore !== null).map((r) => r.recoveryScore!);

  const mean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-5 border-b border-[var(--border)]">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-2)] hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="text-base font-bold text-white">Wellness</h1>
        <div className="w-14" />
      </div>

      <div className="flex-1 px-5 py-6 space-y-6 pb-28">

        {/* No records yet */}
        {records.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Activity size={36} className="text-[var(--text-3)]" />
            <p className="font-semibold text-[var(--text-2)]">No recovery data yet</p>
            <p className="text-sm text-[var(--text-3)]">Your tracker is connected — sync will populate this page.</p>
          </div>
        )}

        {records.length > 0 && (
          <>
            {/* Most recent spotlight */}
            {today && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest">
                    {isToday ? "Today" : fmtDate(today.date)}
                  </p>
                  {!isToday && (
                    <p className="text-[10px] text-[#FF9500]">
                      Not synced today
                    </p>
                  )}
                </div>
                <TodayCard record={today} />
              </section>
            )}

            {/* 30-day averages */}
            <section>
              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-3">
                {records.length}-Day Averages
              </p>
              <div className="grid grid-cols-3 gap-2">
                <SummaryTile
                  icon={<Zap size={14} />}
                  label="Avg HRV"
                  value={mean(avgHRV) !== null ? `${Math.round(mean(avgHRV)!)}ms` : "—"}
                  color="#00B4D8"
                />
                <SummaryTile
                  icon={<Heart size={14} />}
                  label="Avg RHR"
                  value={mean(avgHR) !== null ? `${Math.round(mean(avgHR)!)}bpm` : "—"}
                  color="#FF6B6B"
                />
                <SummaryTile
                  icon={<TrendingUp size={14} />}
                  label="Avg Score"
                  value={mean(avgScores) !== null ? `${Math.round(mean(avgScores)!)}` : "—"}
                  color="#00C851"
                />
              </div>
            </section>

            {/* History list */}
            <section>
              <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-3">
                History
              </p>
              <div className="space-y-2">
                {records.map((r) => (
                  <HistoryRow key={r.id} record={r} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type RecoveryRecord = Awaited<ReturnType<typeof prisma.whoopRecovery.findFirst>>;

function TodayCard({ record }: { record: NonNullable<RecoveryRecord> }) {
  const color = scoreColor(record.recoveryScore);
  // Extended metrics — whichever the tracker provides (WHOOP: spo2/respRate/skinTemp,
  // Garmin: VO2 max/stress). Mirrors the iOS wellness card.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = record as any;
  const extras: { label: string; value: string }[] = [
    r.vo2Max        != null ? { label: "VO₂ MAX",   value: Number(r.vo2Max).toFixed(1) } : null,
    r.vo2MaxCycling != null ? { label: "VO₂ CYCLE", value: Number(r.vo2MaxCycling).toFixed(1) } : null,
    r.stressAvg     != null ? { label: "STRESS",    value: `${r.stressAvg}` } : null,
    r.spo2          != null ? { label: "SPO₂",      value: `${Math.round(r.spo2)}%` } : null,
    r.respRate      != null ? { label: "RESP RATE", value: `${Number(r.respRate).toFixed(1)}/min` } : null,
    r.skinTemp      != null ? { label: "SKIN TEMP", value: `${Number(r.skinTemp).toFixed(1)}°C` } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="bg-[var(--surface-2)] rounded-2xl p-5 space-y-4">
      {/* Score */}
      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ background: `${color}15`, border: `2.5px solid ${color}` }}
        >
          <div className="text-center">
            <p className="text-3xl font-black" style={{ color, lineHeight: 1 }}>
              {record.recoveryScore ?? "—"}
            </p>
            <p className="text-[10px] font-bold uppercase" style={{ color }}>
              {scoreLabel(record.recoveryScore)}
            </p>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <MetricRow icon={<Zap size={12} className="text-[#00B4D8]" />} label="HRV" value={record.hrv !== null ? `${Math.round(record.hrv)} ms` : "—"} />
          <MetricRow icon={<Heart size={12} className="text-[#FF6B6B]" />} label="Resting HR" value={record.restingHR !== null ? `${record.restingHR} bpm` : "—"} />
          <MetricRow icon={<Moon size={12} className="text-[#9B8FFF]" />} label="Sleep" value={fmtSleep(record.totalSleepMin)} />
        </div>
      </div>

      {/* Sleep breakdown */}
      {(record.remMin || record.deepMin || record.lightMin) && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-wide">Sleep Stages</p>
          <div className="flex h-3 rounded-full overflow-hidden gap-px">
            {[
              { mins: record.deepMin,  color: "#3B5BDB", label: "Deep" },
              { mins: record.remMin,   color: "#9B8FFF", label: "REM" },
              { mins: record.lightMin, color: "#4DABF7", label: "Light" },
              { mins: record.awakeMin, color: "#868E96", label: "Awake" },
            ].filter((s) => s.mins).map((s) => {
              const total = (record.deepMin || 0) + (record.remMin || 0) + (record.lightMin || 0) + (record.awakeMin || 0);
              return (
                <div
                  key={s.label}
                  style={{ flex: s.mins! / total, background: s.color }}
                  title={`${s.label}: ${fmtSleep(s.mins)}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { mins: record.deepMin,  color: "#3B5BDB", label: "Deep" },
              { mins: record.remMin,   color: "#9B8FFF", label: "REM" },
              { mins: record.lightMin, color: "#4DABF7", label: "Light" },
              { mins: record.awakeMin, color: "#868E96", label: "Awake" },
            ].filter((s) => s.mins).map((s) => (
              <div key={s.label} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
                <span className="text-[10px] text-[var(--text-3)]">{s.label} {fmtSleep(s.mins)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extended metrics (VO2 max / stress / SpO2 / resp rate / skin temp) */}
      {extras.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {extras.map((m) => (
            <div key={m.label} className="rounded-xl py-2.5 text-center" style={{ background: "var(--surface-3)" }}>
              <p className="text-[13px] font-bold text-white leading-tight">{m.value}</p>
              <p className="text-[8px] font-bold tracking-[0.08em] text-[var(--text-3)] mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Strain */}
      {record.strain !== null && (
        <div>
          <div className="flex justify-between text-[11px] text-[var(--text-3)] mb-1.5">
            <span>Day Strain</span>
            <span className="font-bold text-white">{record.strain.toFixed(1)} / 21</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (record.strain / 21) * 100)}%`,
                background: "linear-gradient(90deg, #00B4D8, #FF6B6B)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ record }: { record: NonNullable<RecoveryRecord> }) {
  const color = scoreColor(record.recoveryScore);
  return (
    <div className="bg-[var(--surface-2)] rounded-2xl px-4 py-3 flex items-center gap-3">
      {/* Score pill */}
      <div
        className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-base font-black"
        style={{ background: `${color}15`, color }}
      >
        {record.recoveryScore ?? "—"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{fmtDate(record.date)}</p>
        <p className="text-xs text-[var(--text-3)] mt-0.5">
          {record.hrv !== null && `HRV ${Math.round(record.hrv)}ms`}
          {record.hrv !== null && record.restingHR !== null && "  ·  "}
          {record.restingHR !== null && `RHR ${record.restingHR}bpm`}
          {(record.hrv !== null || record.restingHR !== null) && record.totalSleepMin && "  ·  "}
          {record.totalSleepMin ? `Sleep ${fmtSleep(record.totalSleepMin)}` : ""}
        </p>
      </div>
      {record.strain !== null && (
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-bold text-white">{record.strain.toFixed(1)}</p>
          <p className="text-[9px] text-[var(--text-3)]">strain</p>
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center"
      style={{ background: `${color}10` }}
    >
      <span style={{ color }}>{icon}</span>
      <p className="text-sm font-black text-white">{value}</p>
      <p className="text-[10px] text-[var(--text-3)]">{label}</p>
    </div>
  );
}

function MetricRow({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-[var(--text-3)] flex-1">{label}</span>
      <span className="text-xs font-bold text-white">{value}</span>
    </div>
  );
}
