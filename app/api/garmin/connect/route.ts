import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/getUser";
import { GarminConnect } from "garmin-connect";
import { encrypt } from "@/lib/encryption";

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

  const encryptedPassword = encrypt(password);
  await prisma.trackerConnection.upsert({
    where: { userId_provider: { userId, provider: "garmin" } },
    update: {
      garminUsername: username,
      garminPassword: encryptedPassword,
      connectedAt: new Date(),
    },
    create: {
      userId,
      provider: "garmin",
      garminUsername: username,
      garminPassword: encryptedPassword,
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
