import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reconcileDay } from "@/lib/planReconciler";

type Ctx = { params: Promise<{ dayId: string }> };

/** POST — check all activities on this day against all entries and link/suggest */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { dayId } = await params;
  const result = await reconcileDay(dayId, session.user.id);
  return NextResponse.json(result);
}
