import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className="border-b border-white/6 sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="TryAthlete"
            width={100}
            height={32}
            className="object-contain"
          />
          <div className="hidden md:flex items-center gap-8 text-sm text-[#888]">
            <a href="#problem" className="hover:text-white transition-colors">Why TryAthlete</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
          </div>
          <span className="bg-[#c8ff00]/10 text-[#c8ff00] text-xs font-bold px-4 py-2 rounded-lg border border-[#c8ff00]/20">
            Invite Only
          </span>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[#c8ff00]/10 border border-[#c8ff00]/20 text-[#c8ff00] text-xs font-bold px-4 py-2 rounded-full mb-10 tracking-widest uppercase">
          ✦ Not another AI app ✦
        </div>

        <h1 className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
          You already have AI.
          <br />
          <span className="text-[#c8ff00]">Now give it real data.</span>
        </h1>

        <p className="text-lg md:text-xl text-[#888] max-w-2xl mx-auto mb-10 leading-relaxed">
          TryAthlete is not another AI training app. It is the data layer that
          connects Strava, WHOOP, and Garmin to ChatGPT or Claude so it can actually coach you.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <span className="bg-[#c8ff00] text-[#0a0a0a] font-bold px-8 py-4 rounded-xl text-base opacity-40 cursor-not-allowed select-none w-full sm:w-auto">
            Invite Only
          </span>
          <a
            href="#how"
            className="bg-white/6 text-white font-medium px-8 py-4 rounded-xl text-base hover:bg-white/10 transition-colors w-full sm:w-auto border border-white/10"
          >
            See how it works
          </a>
        </div>

        <p className="text-sm text-[#555]">iOS · Invite Only · Free Beta</p>
      </section>

      {/* ── PROBLEM ──────────────────────────────────────── */}
      <section id="problem" className="border-t border-white/6 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-bold text-[#c8ff00] tracking-[0.2em] uppercase text-center mb-4">The Problem</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-4">
            Your AI is flying blind.
          </h2>
          <p className="text-[#888] text-center max-w-2xl mx-auto mb-16 text-lg">
            Without real training data, even the best AI gives generic advice.
            Your HRV, sleep quality, training load, and workouts are completely invisible to it.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: "🫀",
                title: "No recovery context",
                desc: "It has no idea you slept 5 hours or that your HRV tanked. You get the same generic advice every day.",
              },
              {
                icon: "📊",
                title: "No training load data",
                desc: "Without your zone data or weekly TSS, intensity recommendations are pure guesswork.",
              },
              {
                icon: "📅",
                title: "No plan awareness",
                desc: "Your structured training plan is completely invisible. AI just sees the text you type.",
              },
            ].map((c) => (
              <div key={c.title} className="bg-[#111] border border-white/6 rounded-2xl p-6">
                <span className="text-3xl mb-4 block">{c.icon}</span>
                <h3 className="font-bold text-white text-lg mb-2">{c.title}</h3>
                <p className="text-[#888] text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section id="how" className="border-t border-white/6 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-bold text-[#c8ff00] tracking-[0.2em] uppercase text-center mb-4">How It Works</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
            Three steps. Real answers.
          </h2>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                num: "01",
                title: "Connect your devices",
                desc: "Link Strava, WHOOP, and Garmin. TryAthlete automatically syncs your workouts, recovery scores, and training plans.",
              },
              {
                num: "02",
                title: "TryAthlete organizes it",
                desc: "Your HRV, sleep, training load, and planned sessions are structured into context any AI can understand immediately.",
              },
              {
                num: "03",
                title: "Ask your AI anything",
                desc: "Open ChatGPT or Claude. Your AI can now see your full training plan, how sessions are going, recovery trends, and what is coming up next.",
              },
            ].map((s) => (
              <div key={s.num} className="bg-[#111] border border-white/6 rounded-2xl p-6">
                <p className="text-5xl font-black text-[#c8ff00]/20 mb-4 leading-none">{s.num}</p>
                <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-[#888] text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WORKS WITH ───────────────────────────────────── */}
      <section className="border-t border-white/6 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-bold text-[#c8ff00] tracking-[0.2em] uppercase text-center mb-4">Works With</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
            Your wearables. Your AI. One layer.
          </h2>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
            <div className="flex gap-3">
              {["Strava", "WHOOP", "Garmin"].map((w) => (
                <div key={w} className="bg-[#111] border border-white/6 rounded-xl px-5 py-4 text-center min-w-[100px]">
                  <p className="font-bold text-white text-sm">{w}</p>
                </div>
              ))}
            </div>

            <div className="text-[#c8ff00] text-3xl font-black rotate-90 md:rotate-0">→</div>

            <div className="bg-[#c8ff00]/10 border border-[#c8ff00]/30 rounded-xl px-6 py-4 text-center">
              <p className="font-black text-[#c8ff00] text-sm">TryAthlete</p>
              <p className="text-[#888] text-xs mt-0.5">data layer</p>
            </div>

            <div className="text-[#c8ff00] text-3xl font-black rotate-90 md:rotate-0">→</div>

            <div className="flex gap-3">
              {["ChatGPT", "Claude"].map((a) => (
                <div key={a} className="bg-[#c8ff00]/10 border border-[#c8ff00]/20 rounded-xl px-5 py-4 text-center min-w-[100px]">
                  <p className="font-bold text-[#c8ff00] text-sm">{a}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-[#555] text-sm mt-10">
            Connect once. Your AI gets real training context every session.
          </p>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────── */}
      <section id="features" className="border-t border-white/6 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-bold text-[#c8ff00] tracking-[0.2em] uppercase text-center mb-4">Features</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
            Everything your AI needs.
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: "📋",
                title: "Training plan management",
                desc: "Build multi-week structured plans with workouts, targets, zones, and notes. Your AI can see the full plan and how each session went.",
              },
              {
                icon: "⚡",
                title: "Automatic workout sync",
                desc: "Every Strava, WHOOP, and Garmin activity lands in your timeline. Zero manual entry.",
              },
              {
                icon: "💤",
                title: "Daily recovery tracking",
                desc: "HRV, sleep score, and strain data so you always know how recovered you truly are.",
              },
              {
                icon: "🤖",
                title: "Full plan visibility for your AI",
                desc: "Your AI gets access to your entire training plan, session history, recovery scores, and upcoming workouts. Not a summary. The whole picture.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-[#111] border border-white/6 rounded-2xl p-6 flex gap-4">
                <span className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-white mb-1">{f.title}</h3>
                  <p className="text-[#888] text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLOSING ──────────────────────────────────────── */}
      <section className="border-t border-white/6 py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="bg-[#111] border border-white/6 rounded-3xl p-10 md:p-16">
            <p className="text-xs font-bold text-[#c8ff00] tracking-[0.2em] uppercase mb-6">iOS · Invite Only Beta</p>
            <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
              Stop asking your AI to guess.
              <br />
              Give it real training data.
            </h2>
            <p className="text-[#888] leading-relaxed">
              Currently available by invite only. If you train with data and use AI,
              this is built for you.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="border-t border-white/6 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="TryAthlete"
              width={80}
              height={26}
              className="object-contain"
            />
            <span className="text-[#555] text-sm">The training data layer for your AI.</span>
          </div>
          <p className="text-[#555] text-sm">© 2026 TryAthlete · iOS Invite Only Beta</p>
        </div>
      </footer>
    </div>
  );
}
