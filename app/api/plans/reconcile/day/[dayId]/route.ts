import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/getUser";
import { reconcileDay } from "@/lib/planReconciler";

type Ctx = { params: Promise<{ dayId: string }> };

/** POST — check all activities on this day against all entries and link/suggest */
export async function POST(req: NextRequest, { params }: Ctx) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { dayId } = await params;
  const result = await reconcileDay(dayId, userId);
  return NextResponse.json(result);
}
