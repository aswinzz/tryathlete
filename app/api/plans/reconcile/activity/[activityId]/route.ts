import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUser";
import { reconcileActivity } from "@/lib/planReconciler";

type Ctx = { params: Promise<{ activityId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { activityId } = await params;
  const result = await reconcileActivity(activityId, userId);
  return NextResponse.json(result);
}
