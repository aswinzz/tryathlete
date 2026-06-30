import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signMobileToken } from "@/lib/mobileAuth";
import { withApiHandler } from "@/lib/apiError";
import { captureServerEvent } from "@/lib/posthog";

export const POST = withApiHandler(async (req: NextRequest) => {
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const token = await signMobileToken(user.id);

  captureServerEvent(user.id, "user_signed_in", { platform: "ios" });

  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, slug: null },
  });
}, "auth.signin");
