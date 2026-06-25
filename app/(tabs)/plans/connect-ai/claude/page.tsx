import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CopyButton } from "@/components/plans/CopyButton";

export const dynamic = "force-dynamic";

export default async function ClaudeSetupPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  // Get or create MCP token
  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mcpToken: true, name: true },
  });

  if (!user?.mcpToken) {
    const token = "tk_" + randomBytes(24).toString("hex");
    user = await prisma.user.update({
      where: { id: userId },
      data: { mcpToken: token },
      select: { mcpToken: true, name: true },
    });
  }

  const slug = user!.name?.toLowerCase().replace(/\s+/g, "") || userId.slice(0, 8);
  // In production this hits the app's own domain; swap host for a custom subdomain later
  const host = process.env.NEXTAUTH_URL || "https://tryathlete.com";
  const mcpUrl = `${host}/api/mcp/u/${slug}?token=${user!.mcpToken}`;
  const configJson = JSON.stringify(
    { mcpServers: { tryathlete: { url: mcpUrl } } },
    null,
    2
  );

  const STEPS = [
    {
      n: 1,
      title: "Open Claude Desktop",
      body: "Go to Claude Desktop → Settings → Developer → Edit Config",
    },
    {
      n: 2,
      title: "Add TryAthlete MCP",
      body: "Paste into claude_desktop_config.json:",
      code: configJson,
    },
    {
      n: 3,
      title: "Restart Claude Desktop",
      body: "Quit and reopen Claude Desktop. You'll see TryAthlete in the tools list.",
    },
    {
      n: 4,
      title: "Test it",
      body: 'Ask Claude: "Show me my workout plan for this week"',
    },
  ];

  return (
    <div className="px-5 pt-14 pb-28 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link href="/plans/connect-ai" className="flex items-center gap-2 text-[var(--text-2)]">
          <ArrowLeft size={18} />
          <span className="text-sm">AI Assistant</span>
        </Link>
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-3)" }}
        >
          ● Not connected
        </span>
      </div>

      {/* Claude hero */}
      <div
        className="p-4 rounded-2xl flex items-center gap-3"
        style={{
          background: "rgba(232,122,62,0.08)",
          border: "1px solid rgba(232,122,62,0.3)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: "rgba(232,122,62,0.15)" }}
        >
          ✦
        </div>
        <div>
          <p className="font-bold text-white">Claude by Anthropic</p>
          <p className="text-xs text-[var(--text-3)]">MCP server connection</p>
        </div>
      </div>

      {/* MCP Endpoint */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">
          Your MCP Endpoint
        </p>
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "var(--surface-1)",
            border: "1px solid rgba(232,122,62,0.3)",
          }}
        >
          <p
            className="text-sm font-mono truncate"
            style={{ color: "#e87a3e" }}
          >
            {mcpUrl}
          </p>
          <CopyButton text={mcpUrl} />
        </div>
      </div>

      {/* Setup steps */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">
          Setup Steps
        </p>
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="p-4 rounded-2xl space-y-1.5"
            style={{ background: "var(--surface-1)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
              >
                {step.n}
              </span>
              <p className="font-bold text-white text-sm">{step.title}</p>
            </div>
            <p className="text-xs text-[var(--text-3)] leading-relaxed pl-9">{step.body}</p>
            {step.code && (
              <div
                className="ml-9 mt-2 p-3 rounded-xl overflow-x-auto"
                style={{ background: "#0a0a0a" }}
              >
                <pre className="text-[10px] leading-relaxed whitespace-pre-wrap break-all"
                  style={{ color: "#e87a3e" }}>
                  {`{ "mcpServers": { "tryathlete": { "url": "${mcpUrl}" } } }`}
                </pre>
                <CopyButton text={configJson} label="Copy JSON" className="mt-2" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Example prompts */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">
          Try These Prompts
        </p>
        {[
          '"Create a 16-week marathon plan starting Sept 1"',
          '"Add a rest day on Thursday"',
        ].map((prompt) => (
          <div
            key={prompt}
            className="px-4 py-3 rounded-xl text-sm text-[var(--text-2)]"
            style={{ background: "var(--surface-1)", borderLeft: "3px solid #e87a3e" }}
          >
            {prompt}
          </div>
        ))}
      </div>

      {/* Verify button — disabled until MCP is live */}
      <button
        disabled
        className="w-full py-3 rounded-2xl font-bold text-sm opacity-30"
        style={{ background: "var(--surface-2)", color: "var(--text-2)" }}
      >
        Verify Connection →
      </button>
    </div>
  );
}
