import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DayDetail } from "@/components/plans/DayDetail";

export const dynamic = "force-dynamic";

export default async function DayDetailPage({
  params,
}: {
  params: Promise<{ id: string; weekNumber: string; dayOfWeek: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const { id, weekNumber, dayOfWeek } = await params;

  const plan = await prisma.workoutPlan.findFirst({
    where: { id, userId },
    select: { id: true, title: true, startDate: true },
  });
  if (!plan) notFound();

  const week = await prisma.workoutWeek.findFirst({
    where: { planId: id, weekNumber: parseInt(weekNumber) },
  });
  if (!week) notFound();

  const day = await prisma.workoutDay.findFirst({
    where: { weekId: week.id, dayOfWeek: parseInt(dayOfWeek) },
    include: {
      entries: {
        orderBy: { orderIndex: "asc" },
        include: {
          links: {
            where: { status: { not: "REJECTED" } },
            include: {
              activity: {
                select: {
                  id: true, name: true, type: true, startTime: true,
                  distance: true, duration: true, avgPace: true,
                  avgHeartRate: true, calories: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!day) notFound();

  return (
    <DayDetail
      planId={id}
      planTitle={plan.title}
      week={week}
      day={day}
    />
  );
}
