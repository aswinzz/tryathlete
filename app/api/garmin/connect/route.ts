import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GarminConnect } from "garmin-connect";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  // Verify credentials by actually logging in
  try {
    const client = new GarminConnect({ username, password });
    await client.login(username, password);
  } catch {
    return NextResponse.json({ error: "Invalid Garmin credentials — check your email and password" }, { status: 401 });
  }

  // TODO: encrypt password at rest with AES-256-GCM before production
  // For now, store plaintext (Garmin has no OAuth for personal API access)
  await prisma.trackerConnection.upsert({
    where: { userId_provider: { userId: session.user.id, provider: "garmin" } },
    update: {
      garminUsername: username,
      garminPassword: password,
      connectedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      provider: "garmin",
      garminUsername: username,
      garminPassword: password,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.trackerConnection.deleteMany({
    where: { userId: session.user.id, provider: "garmin" },
  });

  return NextResponse.json({ success: true });
}
