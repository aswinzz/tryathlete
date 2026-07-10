"use client";

import Image from "next/image";
import {
  motion, useScroll, useTransform, useMotionValue, useSpring, type Variants,
} from "framer-motion";
import { useEffect, useRef } from "react";

const TESTFLIGHT_URL = "https://testflight.apple.com/join/Svqehhxc";

// ── Animation helpers ─────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.21, 0.65, 0.36, 1] },
  }),
};

function Reveal({
  children,
  i = 0,
  className,
}: {
  children: React.ReactNode;
  i?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      custom={i}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

// Deterministic particle field (no Math.random → no hydration mismatch)
const PARTICLES = [
  { x: "8%",  y: "22%", s: 3, d: 9  },
  { x: "18%", y: "68%", s: 2, d: 11 },
  { x: "31%", y: "12%", s: 2, d: 8  },
  { x: "44%", y: "80%", s: 3, d: 12 },
  { x: "58%", y: "18%", s: 2, d: 10 },
  { x: "71%", y: "62%", s: 3, d: 9  },
  { x: "84%", y: "30%", s: 2, d: 13 },
  { x: "92%", y: "74%", s: 2, d: 8  },
];

const TICKER_ITEMS = [
  "HRV 62 MS", "RECOVERY 82%", "SLEEP 7H 42M", "LOAD 412 TSS",
  "ZONE 2 · 58%", "TEMPO RUN · SAT", "RHR 46 BPM", "STRAIN 14.2",
  "WEEK 3 OF 12", "LONG RIDE · SUN",
];

// ── Page ──────────────────────────────────────────────────

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  // Opacity-only parallax — translating the hero down on scroll made its
  // content slide underneath the ticker strip and get covered.
  const heroOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.15]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden">
      <CursorGlow />
      {/* ── NAV ──────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="border-b border-white/6 sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Image src="/logo.png" alt="TryAthlete" width={100} height={32} className="h-7 w-auto object-contain" />
          <div className="hidden md:flex items-center gap-8 text-sm text-[#888]">
            <a href="#problem" className="hover:text-[#c8ff00] transition-colors">Why TryAthlete</a>
            <a href="#how" className="hover:text-[#c8ff00] transition-colors">How it works</a>
            <a href="#features" className="hover:text-[#c8ff00] transition-colors">Features</a>
          </div>
          <a
            href={TESTFLIGHT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#c8ff00]/10 text-[#c8ff00] text-xs font-bold px-4 py-2 rounded-lg border border-[#c8ff00]/20 hover:bg-[#c8ff00]/20 transition-colors"
          >
            Join the Beta
          </a>
        </div>
      </motion.nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section ref={heroRef} className="relative">
        {/* Animated grid + glows */}
        <div className="absolute inset-0 lp-grid-bg pointer-events-none" />
        <motion.div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(200,255,0,0.10) 0%, transparent 60%)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* GPS route tracing itself behind the hero */}
        <svg
          className="absolute inset-x-0 top-16 mx-auto w-[900px] max-w-full opacity-[0.13] pointer-events-none"
          viewBox="0 0 900 420"
          fill="none"
        >
          <motion.path
            d="M40 340 C 120 190, 205 360, 290 250 S 430 70, 525 150 S 640 330, 730 250 S 830 120, 868 90"
            stroke="#c8ff00"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0.4, 1, 0] }}
            transition={{ duration: 9, times: [0, 0.75, 1], repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          />
        </svg>

        {/* Particles */}
        {PARTICLES.map((p, idx) => (
          <motion.span
            key={idx}
            className="absolute rounded-full bg-[#c8ff00] pointer-events-none"
            style={{ left: p.x, top: p.y, width: p.s, height: p.s, opacity: 0.35 }}
            animate={{ y: [0, -22, 0], opacity: [0.15, 0.5, 0.15] }}
            transition={{ duration: p.d, repeat: Infinity, ease: "easeInOut", delay: idx * 0.7 }}
          />
        ))}

        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative max-w-6xl mx-auto px-6 pt-24 pb-16 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.55, ease: "easeOut" }}
            className="inline-flex items-center gap-2 bg-[#c8ff00]/10 border border-[#c8ff00]/20 text-[#c8ff00] text-xs font-bold px-4 py-2 rounded-full mb-10 tracking-widest uppercase"
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ✦
            </motion.span>
            Not another AI app
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            >
              ✦
            </motion.span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            {"You already have AI.".split(" ").map((w, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.22em]"
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.25 + i * 0.08, duration: 0.6, ease: "easeOut" }}
              >
                {w}
              </motion.span>
            ))}
            <br />
            {"Now give it real data.".split(" ").map((w, i) => (
              <motion.span
                key={i}
                className="inline-block mr-[0.22em] text-[#c8ff00]"
                style={{ textShadow: "0 0 40px rgba(200,255,0,0.35)" }}
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.6 + i * 0.08, duration: 0.6, ease: "easeOut" }}
              >
                {w}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.7 }}
            className="text-lg md:text-xl text-[#888] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            TryAthlete is not another AI training app. It is the data layer that
            connects Strava, WHOOP, and Garmin to ChatGPT or Claude so it can actually coach you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            <a
              href={TESTFLIGHT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#c8ff00] text-[#0a0a0a] font-bold px-8 py-4 rounded-xl text-base hover:bg-[#d9ff4d] transition-colors shadow-[0_0_30px_rgba(200,255,0,0.25)] w-full sm:w-auto"
            >
              Join the Beta on TestFlight →
            </a>
            <a
              href="#how"
              className="bg-white/6 text-white font-medium px-8 py-4 rounded-xl text-base hover:bg-white/10 hover:border-[#c8ff00]/30 transition-colors w-full sm:w-auto border border-white/10"
            >
              See how it works
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.35 }}
            className="text-sm text-[#555]"
          >
            iOS · Free Beta via TestFlight
          </motion.p>

          {/* Mock AI chat */}
          <ChatDemo />
        </motion.div>

        {/* Live data ticker */}
        <div className="relative border-y border-white/6 bg-[#0d0d0d] overflow-hidden py-3">
          <div
            className="flex whitespace-nowrap w-max"
            style={{ animation: "lp-ticker 28s linear infinite" }}
          >
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
              <span key={i} className="mx-6 text-[11px] font-bold tracking-[0.2em] text-[#c8ff00]/50 font-mono">
                {t} <span className="text-white/15 ml-6">◆</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────── */}
      <section id="problem" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-xs font-bold text-[#c8ff00] tracking-[0.2em] uppercase text-center mb-4">The Problem</p>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-4">Your AI is flying blind.</h2>
            <p className="text-[#888] text-center max-w-2xl mx-auto mb-16 text-lg">
              Without real training data, even the best AI gives generic advice.
              Your HRV, sleep quality, training load, and workouts are completely invisible to it.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: "🫀", tag: "RECOVERY", title: "No recovery context", desc: "It has no idea you slept 5 hours or that your HRV tanked. You get the same generic advice every day." },
              { icon: "📊", tag: "LOAD", title: "No training load data", desc: "Without your zone data or weekly TSS, intensity recommendations are pure guesswork." },
              { icon: "📅", tag: "PLAN", title: "No plan awareness", desc: "Your structured training plan is completely invisible. AI just sees the text you type." },
            ].map((c, i) => (
              <Reveal key={c.title} i={i}>
                <TiltCard className="lp-glow-card relative bg-[#111] border border-white/6 rounded-2xl p-6 h-full">
                  <Corners />
                  <span className="text-3xl mb-4 block">{c.icon}</span>
                  <h3 className="font-bold text-white text-lg mb-2">{c.title}</h3>
                  <p className="text-[#888] text-sm leading-relaxed">{c.desc}</p>
                  <div className="flex items-center gap-2 mt-5 font-mono text-[10px] tracking-[0.2em] text-[#ff5f57]">
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-[#ff5f57]"
                      animate={{ opacity: [1, 0.15, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                    />
                    SIGNAL LOST // {c.tag}
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section id="how" className="border-t border-white/6 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-xs font-bold text-[#c8ff00] tracking-[0.2em] uppercase text-center mb-4">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-12">Three steps. Real answers.</h2>
          </Reveal>

          {/* Progress beam that draws across as it scrolls into view */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            className="hidden md:block h-px mb-10 origin-left bg-gradient-to-r from-transparent via-[#c8ff00]/60 to-transparent"
          />

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { num: "01", title: "Connect your devices", desc: "Link Strava, WHOOP, and Garmin. TryAthlete automatically syncs your workouts, recovery scores, and training plans." },
              { num: "02", title: "TryAthlete organizes it", desc: "Your HRV, sleep, training load, and planned sessions are structured into context any AI can understand immediately." },
              { num: "03", title: "Ask your AI anything", desc: "Open ChatGPT or Claude. Your AI can now see your full training plan, how sessions are going, recovery trends, and what is coming up next." },
            ].map((s, i) => (
              <Reveal key={s.num} i={i}>
                <TiltCard className="lp-glow-card lp-scanline bg-[#111] border border-white/6 rounded-2xl p-6 h-full relative">
                  <div className="flex items-baseline justify-between mb-4">
                    <motion.p
                      className="text-5xl font-black text-[#c8ff00]/25 leading-none"
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                    >
                      {s.num}
                    </motion.p>
                    <span className="font-mono text-[9px] tracking-[0.25em] text-[#555]">STEP {s.num} // 03</span>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                  <p className="text-[#888] text-sm leading-relaxed">{s.desc}</p>
                  <motion.div
                    className="h-0.5 mt-5 rounded bg-[#c8ff00]/40 origin-left"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: (i + 1) / 3 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.2, duration: 0.8, ease: "easeOut" }}
                  />
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKS WITH (animated pipeline) ───────────────── */}
      <section className="border-t border-white/6 py-24 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-xs font-bold text-[#c8ff00] tracking-[0.2em] uppercase text-center mb-4">Works With</p>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16">Your wearables. Your AI. One layer.</h2>
          </Reveal>

          <Reveal>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0">
              <div className="flex gap-3">
                {["Strava", "WHOOP", "Garmin"].map((w, i) => (
                  <motion.div
                    key={w}
                    whileHover={{ y: -4 }}
                    animate={{ boxShadow: ["0 0 0px rgba(200,255,0,0)", "0 0 18px rgba(200,255,0,0.08)", "0 0 0px rgba(200,255,0,0)"] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}
                    className="bg-[#111] border border-white/6 rounded-xl px-5 py-4 text-center min-w-[100px]"
                  >
                    <p className="font-bold text-white text-sm">{w}</p>
                  </motion.div>
                ))}
              </div>

              <PipelineBeam />

              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(200,255,0,0.12)",
                    "0 0 44px rgba(200,255,0,0.3)",
                    "0 0 20px rgba(200,255,0,0.12)",
                  ],
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="bg-[#c8ff00]/10 border border-[#c8ff00]/30 rounded-xl px-6 py-4 text-center relative z-10"
              >
                <p className="font-black text-[#c8ff00] text-sm">TryAthlete</p>
                <p className="text-[#888] text-xs mt-0.5">data layer</p>
              </motion.div>

              <PipelineBeam />

              <div className="flex gap-3">
                {["ChatGPT", "Claude"].map((a, i) => (
                  <motion.div
                    key={a}
                    whileHover={{ y: -4 }}
                    animate={{ boxShadow: ["0 0 0px rgba(200,255,0,0)", "0 0 18px rgba(200,255,0,0.1)", "0 0 0px rgba(200,255,0,0)"] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 1 + i * 0.8 }}
                    className="bg-[#c8ff00]/10 border border-[#c8ff00]/20 rounded-xl px-5 py-4 text-center min-w-[100px]"
                  >
                    <p className="font-bold text-[#c8ff00] text-sm">{a}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <p className="text-center text-[#555] text-sm mt-10">
              Connect once. Your AI gets real training context every session.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section id="features" className="border-t border-white/6 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <p className="text-xs font-bold text-[#c8ff00] tracking-[0.2em] uppercase text-center mb-4">Features</p>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16">Everything your AI needs.</h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: "📋", title: "Training plan management", desc: "Build multi-week structured plans with workouts, targets, zones, and notes. Your AI can see the full plan and how each session went.", visual: <PlanMini /> },
              { icon: "⚡", title: "Automatic workout sync", desc: "Every Strava, WHOOP, and Garmin activity lands in your timeline. Zero manual entry.", visual: <SyncMini /> },
              { icon: "💤", title: "Daily recovery tracking", desc: "HRV, sleep score, and strain data so you always know how recovered you truly are.", visual: <RecoveryMini /> },
              { icon: "🤖", title: "Full plan visibility for your AI", desc: "Your AI gets access to your entire training plan, session history, recovery scores, and upcoming workouts. Not a summary. The whole picture.", visual: <AIMini /> },
            ].map((f, i) => (
              <Reveal key={f.title} i={i % 2}>
                <TiltCard className="lp-glow-card bg-[#111] border border-white/6 rounded-2xl p-6 flex gap-4 h-full items-start">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-white mb-1">{f.title}</h3>
                    <p className="text-[#888] text-sm leading-relaxed">{f.desc}</p>
                  </div>
                  <div className="hidden sm:flex flex-shrink-0 items-center justify-center w-20 h-16">
                    {f.visual}
                  </div>
                </TiltCard>
              </Reveal>
            ))}

            {/* Strength tracking — featured full-width card */}
            <Reveal className="md:col-span-2">
              <TiltCard className="lp-glow-card bg-[#111] border border-[#c8ff00]/15 rounded-2xl p-6 flex flex-col sm:flex-row gap-5 items-start">
                <span className="text-2xl flex-shrink-0 mt-0.5">🏋️</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-white">Strength session tracking</h3>
                    <span className="text-[9px] font-bold tracking-widest uppercase text-[#c8ff00] bg-[#c8ff00]/10 border border-[#c8ff00]/20 px-2 py-0.5 rounded-full">New</span>
                  </div>
                  <p className="text-[#888] text-sm leading-relaxed">
                    Plan exercises with target sets, reps, and weight — or let your AI program them from your
                    past lifts. Log during the workout, and when your watch session syncs it all merges into
                    one activity: your sets next to your heart rate. Your AI reviews planned vs. actual and
                    progresses the load.
                  </p>
                </div>
                <div className="hidden sm:flex flex-shrink-0 items-center justify-center w-32 h-20">
                  <StrengthMini />
                </div>
              </TiltCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CLOSING ──────────────────────────────────────── */}
      <section className="border-t border-white/6 py-24 relative overflow-hidden">
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(200,255,0,0.07) 0%, transparent 65%)" }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="max-w-2xl mx-auto px-6 text-center relative">
          <Reveal>
            <div className="lp-glow-card lp-scanline relative bg-[#111] border border-white/6 rounded-3xl p-10 md:p-16">
              <Corners />
              <p className="text-xs font-bold text-[#c8ff00] tracking-[0.2em] uppercase mb-6">iOS · Free Beta</p>
              <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
                Stop asking your AI to guess.
                <br />
                Give it real training data.
              </h2>
              <p className="text-[#888] leading-relaxed mb-8">
                Free beta, open now. If you train with data and use AI,
                this is built for you.
              </p>
              <a
                href={TESTFLIGHT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#c8ff00] text-[#0a0a0a] font-bold px-8 py-4 rounded-xl text-base hover:bg-[#d9ff4d] transition-colors shadow-[0_0_30px_rgba(200,255,0,0.2)]"
              >
                Join the Beta on TestFlight →
              </a>
              <p className="text-[#555] text-xs mt-4 font-mono">
                questions? <a href="mailto:aswinvb.dev@gmail.com" className="hover:text-[#c8ff00] transition-colors">aswinvb.dev@gmail.com</a>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="border-t border-white/6 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="TryAthlete" width={80} height={26} className="h-6 w-auto object-contain" />
            <span className="text-[#555] text-sm">The training data layer for your AI.</span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
            <a
              href="mailto:aswinvb.dev@gmail.com"
              className="text-[#888] text-sm hover:text-[#c8ff00] transition-colors"
            >
              aswinvb.dev@gmail.com
            </a>
            <p className="text-[#555] text-sm">© 2026 TryAthlete · iOS Free Beta</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Mock AI chat card ─────────────────────────────────────

function ChatDemo() {
  const messages = [
    { from: "user", text: "Should I do my tempo run today?" },
    {
      from: "ai",
      text: "Your HRV is down 18% and you slept 5h 40m — recovery is at 44%. I'd swap today's tempo for Zone 2, and move the tempo to Thursday when your plan has an easy day.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.8, ease: "easeOut" }}
      className="max-w-lg mx-auto mt-16 text-left"
    >
      <div className="lp-scanline bg-[#111]/90 backdrop-blur border border-white/8 rounded-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[10px] font-bold tracking-[0.15em] text-[#555] uppercase font-mono">
            Your AI · with TryAthlete context
          </span>
        </div>

        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2 + i * 1.1, duration: 0.5 }}
            className={`mb-3 flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.from === "user"
                  ? "bg-[#c8ff00] text-[#0a0a0a] font-medium rounded-br-sm"
                  : "bg-white/6 text-[#ddd] border border-white/8 rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.4 }}
          className="flex items-center gap-2 text-[10px] text-[#555] font-mono mt-4"
        >
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-[#c8ff00]"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          LIVE CONTEXT · HRV · SLEEP · LOAD · PLAN
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── 3D tilt card (follows the cursor) ─────────────────────

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 220, damping: 18 });
  const sry = useSpring(ry, { stiffness: 220, damping: 18 });

  function onMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 8);
    rx.set(-py * 6);
  }
  function onLeave() { rx.set(0); ry.set(0); }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Cursor-following ambient glow ─────────────────────────

function CursorGlow() {
  const mx = useMotionValue(-600);
  const my = useMotionValue(-600);
  const sx = useSpring(mx, { stiffness: 50, damping: 18 });
  const sy = useSpring(my, { stiffness: 50, damping: 18 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX - 300);
      my.set(e.clientY - 300);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  return (
    <motion.div
      aria-hidden
      className="fixed top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none z-[1] hidden md:block"
      style={{
        x: sx, y: sy,
        background: "radial-gradient(circle, rgba(200,255,0,0.045) 0%, transparent 60%)",
      }}
    />
  );
}

// ── HUD corner brackets ───────────────────────────────────

function Corners() {
  const base = "absolute w-3 h-3 border-[#c8ff00]/40 pointer-events-none";
  return (
    <>
      <span className={`${base} top-2 left-2 border-t border-l rounded-tl-sm`} />
      <span className={`${base} top-2 right-2 border-t border-r rounded-tr-sm`} />
      <span className={`${base} bottom-2 left-2 border-b border-l rounded-bl-sm`} />
      <span className={`${base} bottom-2 right-2 border-b border-r rounded-br-sm`} />
    </>
  );
}

// ── Feature mini-visuals ──────────────────────────────────

/** Mini week grid — cells light up in sequence like a plan filling in. */
function PlanMini() {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-[2px] bg-[#c8ff00]"
          animate={{ opacity: [0.12, 0.9, 0.12] }}
          transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/** Rotating sync ring with a pulsing core. */
function SyncMini() {
  return (
    <div className="relative w-10 h-10">
      <motion.span
        className="absolute inset-0 rounded-full border border-[#c8ff00]/15 border-t-[#c8ff00]/80"
        animate={{ rotate: 360 }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
      />
      <motion.span
        className="absolute inset-[13px] rounded-full bg-[#c8ff00]"
        animate={{ scale: [1, 1.5, 1], opacity: [0.9, 0.35, 0.9] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/** HRV sparkline that draws itself on repeat. */
function RecoveryMini() {
  return (
    <svg viewBox="0 0 80 40" className="w-20 h-10" fill="none">
      <motion.path
        d="M2 28 L14 24 L22 30 L32 12 L42 22 L52 8 L62 18 L78 6"
        stroke="#c8ff00"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: [0, 1, 1], opacity: [0.5, 1, 0.2] }}
        transition={{ duration: 3.6, times: [0, 0.7, 1], repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

/** Sets checking off one by one — strength logging. */
function StrengthMini() {
  const sets = ["8 × 60kg", "8 × 62.5kg", "7 × 65kg"];
  return (
    <div className="flex flex-col gap-1.5 w-28 font-mono">
      {sets.map((s, i) => (
        <motion.div
          key={i}
          className="flex items-center gap-1.5 text-[9px] text-[#888]"
          animate={{ opacity: [0.25, 1, 1, 0.25] }}
          transition={{ duration: 4.5, times: [0, 0.15, 0.85, 1], repeat: Infinity, delay: i * 0.9 }}
        >
          <motion.span
            className="w-2.5 h-2.5 rounded-full border border-[#c8ff00] flex-shrink-0"
            animate={{ backgroundColor: ["rgba(200,255,0,0)", "rgba(200,255,0,1)", "rgba(200,255,0,1)", "rgba(200,255,0,0)"] }}
            transition={{ duration: 4.5, times: [0, 0.2, 0.85, 1], repeat: Infinity, delay: i * 0.9 }}
          />
          SET {i + 1} · {s}
        </motion.div>
      ))}
    </div>
  );
}

/** Context lines streaming into the AI. */
function AIMini() {
  const widths = ["100%", "72%", "88%"];
  return (
    <div className="flex flex-col gap-1.5 w-16">
      {widths.map((w, i) => (
        <motion.span
          key={i}
          className="h-1.5 rounded bg-[#c8ff00]/60 origin-left"
          style={{ width: w }}
          animate={{ scaleX: [0, 1], opacity: [0.2, 0.85, 0.2] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── Animated pipeline connector ───────────────────────────

function PipelineBeam() {
  return (
    <div className="relative w-px h-10 md:w-20 md:h-px mx-auto md:mx-3 bg-gradient-to-b md:bg-gradient-to-r from-[#c8ff00]/10 via-[#c8ff00]/40 to-[#c8ff00]/10">
      {/* Traveling pulse — vertical on mobile, horizontal on desktop */}
      <motion.span
        className="md:hidden absolute w-1.5 h-1.5 rounded-full bg-[#c8ff00] shadow-[0_0_8px_rgba(200,255,0,0.9)] left-1/2 -translate-x-1/2"
        animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="hidden md:block absolute w-1.5 h-1.5 rounded-full bg-[#c8ff00] shadow-[0_0_8px_rgba(200,255,0,0.9)] top-1/2 -translate-y-1/2"
        animate={{ left: ["0%", "92%"], opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
