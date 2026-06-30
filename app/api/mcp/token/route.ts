import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { captureServerEvent } from "@/lib/posthog";

/** GET — return existing token (or generate one if missing) */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mcpToken: true },
  });

  if (user?.mcpToken) {
    captureServerEvent(session.user.id, "mcp_token_viewed");
    return NextResponse.json({ token: user.mcpToken });
  }

  // Generate a new token
  const token = "tk_" + randomBytes(24).toString("hex");
  await prisma.user.update({ where: { id: session.user.id }, data: { mcpToken: token } });

  captureServerEvent(session.user.id, "mcp_token_viewed", { first_time: true });
  return NextResponse.json({ token });
}

/** DELETE — revoke and regenerate token */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = "tk_" + randomBytes(24).toString("hex");
  await prisma.user.update({ where: { id: session.user.id }, data: { mcpToken: token } });

  captureServerEvent(session.user.id, "mcp_token_regenerated");
  return NextResponse.json({ token });
}
