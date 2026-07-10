import { prisma } from "./prisma";

/**
 * Merge manual workout logs into a freshly synced device activity.
 *
 * The gym flow: the athlete logs exercises DURING the workout (manual
 * activity created from the app), and the watch session syncs AFTER the
 * workout ends. Without merging, they'd end up with two activities — the
 * manual log (sets/reps) and the synced one (HR/calories) — unlinked.
 *
 * This finds manual activities with exercises whose time window overlaps
 * the synced session, moves their exercises (and logged sets, which follow
 * their exercise) onto the synced activity, and deletes the manual shell.
 *
 * Only non-endurance synced activities absorb logs — a morning run should
 * never swallow a gym log from the same window.
 */
const ENDURANCE = ["run", "cycl", "bike", "ride", "swim", "walk", "hik"];

function isEndurance(type: string): boolean {
  const t = type.toLowerCase();
  return ENDURANCE.some((k) => t.includes(k));
}

export async function absorbManualLog(syncedActivityId: string, userId: string): Promise<void> {
  const synced = await prisma.activity.findFirst({
    where: { id: syncedActivityId, userId },
    select: { id: true, source: true, type: true, startTime: true, duration: true, name: true },
  });
  if (!synced || synced.source === "manual") return;
  if (isEndurance(synced.type)) return;

  const sessionStart = synced.startTime;
  const sessionEnd = new Date(sessionStart.getTime() + (synced.duration || 0) * 1000);
  // Generous ±45min window: people start their log a bit before/after the watch
  const windowStart = new Date(sessionStart.getTime() - 45 * 60 * 1000);
  const windowEnd   = new Date(sessionEnd.getTime()   + 45 * 60 * 1000);

  const manualLogs = await prisma.activity.findMany({
    where: {
      userId,
      source: "manual",
      startTime: { gte: windowStart, lte: windowEnd },
      exercises: { some: {} },
    },
    select: { id: true, name: true },
    orderBy: { startTime: "asc" },
  });

  for (const manual of manualLogs) {
    // Move exercises (sets ride along via their exercise FK)
    await prisma.exerciseEntry.updateMany({
      where: { activityId: manual.id },
      data: { activityId: synced.id },
    });

    // Preserve the user's custom name when the synced one is a generic default
    const genericNames = ["workout", "activity", "strength", "strength_training"];
    if (
      manual.name &&
      !genericNames.includes(manual.name.toLowerCase()) &&
      genericNames.some((g) => synced.name.toLowerCase().includes(g))
    ) {
      await prisma.activity.update({
        where: { id: synced.id },
        data: { name: manual.name },
      });
    }

    // Delete the manual shell (its plan links cascade; the synced activity's
    // own reconcile pass will re-link against the plan)
    await prisma.activity.delete({ where: { id: manual.id } });
    console.log(`[merge] absorbed manual log ${manual.id} into synced activity ${synced.id}`);
  }
}
