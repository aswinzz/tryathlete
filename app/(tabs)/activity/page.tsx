import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityList } from "./ActivityList";
import { LogWorkoutButton } from "./LogWorkoutButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function ActivityPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [activities, totalCount] = await Promise.all([
    prisma.activity.findMany({
      where: { userId },
      orderBy: { startTime: "desc" },
      take: PAGE_SIZE + 1,
      select: {
        id: true, name: true, type: true, startTime: true,
        duration: true, distance: true, avgHeartRate: true,
        avgPace: true, elevGain: true, calories: true,
      },
    }),
    prisma.activity.count({ where: { userId } }),
  ]);

  const hasMore     = activities.length > PAGE_SIZE;
  const page        = hasMore ? activities.slice(0, PAGE_SIZE) : activities;
  const nextCursor  = hasMore ? page[page.length - 1].id : null;

  return (
    <div className="px-5 pt-14 pb-28 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">All Activities</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-3)] bg-[var(--surface-2)] px-3 py-1.5 rounded-full">
            {totalCount} workouts
          </span>
          <LogWorkoutButton />
        </div>
      </div>

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-5xl">🏃</p>
          <p className="font-semibold text-[var(--text-2)]">No activities yet</p>
          <p className="text-sm text-[var(--text-3)] max-w-[220px]">
            Connect your tracker to start importing workouts
          </p>
        </div>
      )}

      {/* Infinite-loading list */}
      {totalCount > 0 && (
        <ActivityList
          initial={page}
          initialCursor={nextCursor}
          totalCount={totalCount}
        />
      )}
    </div>
  );
}
