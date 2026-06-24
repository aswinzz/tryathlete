import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { getHRZone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const activities = await prisma.activity.findMany({
    where: { userId },
    orderBy: { startTime: "desc" },
    include: { laps: { orderBy: { lapIndex: "asc" }, take: 1 } },
  });

  return (
    <div className="px-5 pt-14 pb-28 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">All Activities</h1>
        <span className="text-xs text-[var(--text-3)] bg-[var(--surface-2)] px-3 py-1.5 rounded-full">
          {activities.length} workouts
        </span>
      </div>

      {/* Empty state */}
      {activities.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-5xl">🏃</p>
          <p className="font-semibold text-[var(--text-2)]">No activities yet</p>
          <p className="text-sm text-[var(--text-3)] max-w-[220px]">
            Connect your tracker to start importing workouts
          </p>
        </div>
      )}

      {/* Activity list */}
      {activities.length > 0 && (
        <div className="space-y-3">
          {activities.map((act) => {
            const zone = act.avgHeartRate ? getHRZone(act.avgHeartRate) : 2;
            return (
              <ActivityCard
                key={act.id}
                id={act.id}
                name={act.name}
                type={act.type}
                startTime={act.startTime}
                duration={act.duration}
                distance={act.distance}
                avgHeartRate={act.avgHeartRate}
                avgPace={act.avgPace}
                elevGain={act.elevGain}
                calories={act.calories}
                zone={zone}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
