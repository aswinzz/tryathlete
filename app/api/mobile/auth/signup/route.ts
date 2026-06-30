import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signMobileToken } from "@/lib/mobileAuth";
import { withApiHandler } from "@/lib/apiError";
import { captureServerEvent, getPostHogClient } from "@/lib/posthog";

export const POST = withApiHandler(async (req: NextRequest) => {
  const { name, email, password } = await req.json();
  if (!name || !email || !password)
    return NextResponse.json({ error: "Name, email and password required" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, email, password: hashed } });

  const token = await signMobileToken(user.id);

  // Identify + track sign up
  const ph = getPostHogClient();
  if (ph) {
    ph.identify({ distinctId: user.id, properties: { email: user.email, name: user.name, platform: "ios" } });
    ph.capture({ distinctId: user.id, event: "user_signed_up", properties: { platform: "ios" } });
  }

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, slug: null },
  });
}, "auth.signup");
