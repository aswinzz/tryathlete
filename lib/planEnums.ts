// String literal enums for WorkoutPlan models.
// These mirror the Prisma schema enums but don't require the generated client,
// so they work before `prisma migrate dev` / `prisma generate` has been run.

export const WeekType = {
  REGULAR:  "REGULAR",
  PEAK:     "PEAK",
  TAPER:    "TAPER",
  RECOVERY: "RECOVERY",
  DELOAD:   "DELOAD",
} as const;
export type WeekType = typeof WeekType[keyof typeof WeekType];

export const DayType = {
  REGULAR:  "REGULAR",
  RACE:     "RACE",
  REST:     "REST",
  RECOVERY: "RECOVERY",
} as const;
export type DayType = typeof DayType[keyof typeof DayType];

export const DayStatus = {
  PLANNED:   "PLANNED",
  COMPLETED: "COMPLETED",
  SKIPPED:   "SKIPPED",
  PARTIAL:   "PARTIAL",
} as const;
export type DayStatus = typeof DayStatus[keyof typeof DayStatus];

export const EntryType = {
  RUN:      "RUN",
  CYCLING:  "CYCLING",
  SWIMMING: "SWIMMING",
  STRENGTH: "STRENGTH",
  HIIT:     "HIIT",
  OTHER:    "OTHER",
} as const;
export type EntryType = typeof EntryType[keyof typeof EntryType];
