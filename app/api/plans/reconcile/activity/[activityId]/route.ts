import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reconcileActivity } from "@/lib/planReconciler";

type Ctx = { params: Promise<{ activityId: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { activityId } = await params;
  const result = await reconcileActivity(activityId, session.user.id);
  return NextResponse.json(result);
}
