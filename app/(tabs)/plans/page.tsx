import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PlanCard } from "@/components/plans/PlanCard";
import { CreatePlanButton } from "@/components/plans/CreatePlanButton";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const plans = await prisma.workoutPlan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      weeks: {
        include: { days: { include: { entries: true } } },
      },
    },
  });

  const activePlan = plans.find((p) => p.isActive);
  const otherPlans = plans.filter((p) => !p.isActive);

  return (
    <div className="px-5 pt-14 pb-28 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--text-2)]">Training</p>
          <h1 className="text-2xl font-bold text-white">Plans</h1>
        </div>
        <CreatePlanButton />
      </div>

      {plans.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-4xl">📋</p>
          <p className="font-semibold text-[var(--text-2)]">No plans yet</p>
          <p className="text-sm text-[var(--text-3)]">
            Create a training plan or ask AI to build one for you
          </p>
          <CreatePlanButton label="Create New Plan" />
        </div>
      )}

      {/* Active plan */}
      {activePlan && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">
            Active Plan
          </p>
          <PlanCard plan={activePlan} variant="active" />
        </div>
      )}

      {/* Other plans */}
      {otherPlans.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[var(--text-3)] uppercase tracking-widest">
            {activePlan ? "Other Plans" : "All Plans"}
          </p>
          {otherPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} variant={plan.isDraft ? "draft" : "archived"} />
          ))}
        </div>
      )}

      {/* Connect AI CTA */}
      <Link
        href="/plans/connect-ai"
        className="flex items-center justify-between p-4 rounded-2xl"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <p className="text-sm font-semibold text-white">Let AI manage your plan</p>
            <p className="text-xs text-[var(--text-3)]">Connect Claude or ChatGPT</p>
          </div>
        </div>
        <span className="text-[var(--text-3)] text-lg">›</span>
      </Link>
    </div>
  );
}
