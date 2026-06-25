import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ConnectAIPage() {
  return (
    <div className="px-5 pt-14 pb-28 space-y-8">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Link href="/plans" className="text-[var(--text-2)]">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-white">AI Assistant</h1>
      </div>

      {/* Hero */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-white leading-tight">
          Let AI manage<br />your plan.
        </h2>
        <p className="text-sm text-[var(--text-2)] leading-relaxed">
          Connect Claude or ChatGPT to create, edit and update your
          workout plan using natural language.
        </p>
      </div>

      {/* How it works */}
      <div
        className="flex items-center justify-between gap-2 p-4 rounded-2xl"
        style={{ background: "var(--surface-1)" }}
      >
        {[
          { icon: "💬", title: "You chat", sub: "naturally" },
          { icon: "⚡", title: "AI calls", sub: "TryAthlete" },
          { icon: "✓",  title: "Plan",     sub: "updates" },
        ].map((step, i) => (
          <>
            <div key={step.title} className="flex flex-col items-center gap-1 text-center">
              <span className="text-2xl">{step.icon}</span>
              <p className="text-xs font-bold text-white">{step.title}</p>
              <p className="text-[10px] text-[var(--text-3)]">{step.sub}</p>
            </div>
            {i < 2 && (
              <span key={`arrow-${i}`} className="text-[var(--text-3)] text-lg">→</span>
            )}
          </>
        ))}
      </div>

      {/* Connect AI section */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">
          Connect an AI
        </p>

        {/* Claude */}
        <Link href="/plans/connect-ai/claude">
          <div
            className="p-4 rounded-2xl space-y-3"
            style={{
              background: "var(--surface-1)",
              borderTop: "2px solid #e87a3e",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: "rgba(232,122,62,0.15)" }}
                >
                  ✦
                </div>
                <div>
                  <p className="font-bold text-white">Claude</p>
                  <p className="text-xs text-[var(--text-3)]">Anthropic · Recommended</p>
                </div>
              </div>
              <button
                className="px-4 py-2 rounded-full text-sm font-bold"
                style={{ background: "#e87a3e", color: "#000" }}
              >
                Connect →
              </button>
            </div>
            <p className="text-xs text-[var(--text-3)]">
              MCP · Works in Claude Desktop &amp; Claude.ai
            </p>
          </div>
        </Link>

        {/* ChatGPT */}
        <div
          className="p-4 rounded-2xl space-y-3 opacity-50"
          style={{ background: "var(--surface-1)", borderTop: "2px solid var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                ⊕
              </div>
              <div>
                <p className="font-bold text-white">ChatGPT</p>
                <p className="text-xs text-[var(--text-3)]">OpenAI · Custom GPT</p>
              </div>
            </div>
            <button
              className="px-4 py-2 rounded-full text-sm font-bold"
              style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
              disabled
            >
              Connect →
            </button>
          </div>
          <p className="text-xs text-[var(--text-3)]">
            Custom GPT · Works in ChatGPT Plus &amp; Team
          </p>
        </div>
      </div>

      {/* Example prompts */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">
          Example Prompts
        </p>
        {[
          '"Create a 12-week marathon plan starting June 1"',
          '"Make week 8 a taper week"',
          '"Add a rest day on Thursday next week"',
        ].map((prompt) => (
          <div
            key={prompt}
            className="px-4 py-3 rounded-xl text-sm text-[var(--text-2)]"
            style={{
              background: "var(--surface-1)",
              borderLeft: "3px solid #e87a3e",
            }}
          >
            {prompt}
          </div>
        ))}
      </div>
    </div>
  );
}
