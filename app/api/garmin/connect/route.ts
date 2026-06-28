import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";
import { GarminConnect } from "garmin-connect";

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    where: { userId_provider: { userId, provider: "garmin" } },
    update: {
      garminUsername: username,
      garminPassword: password,
      connectedAt: new Date(),
    },
    create: {
      userId,
      provider: "garmin",
      garminUsername: username,
      garminPassword: password,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.trackerConnection.deleteMany({
    where: { userId, provider: "garmin" },
  });

  return NextResponse.json({ success: true });
}
