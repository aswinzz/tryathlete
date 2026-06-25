import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { WeekView } from "@/components/plans/WeekView";

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const { id } = await params;
  const { week: weekParam } = await searchParams;

  const plan = await prisma.workoutPlan.findFirst({
    where: { id, userId },
    include: {
      weeks: {
        orderBy: { weekNumber: "asc" },
        include: {
          days: {
            orderBy: { dayOfWeek: "asc" },
            include: { entries: { orderBy: { orderIndex: "asc" } } },
          },
        },
      },
    },
  });

  if (!plan) notFound();

  const currentWeekNumber = weekParam ? parseInt(weekParam) : (plan.weeks[0]?.weekNumber ?? 1);

  return <WeekView plan={plan} currentWeekNumber={currentWeekNumber} />;
}
