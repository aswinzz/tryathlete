import {
  formatPace,
  formatDuration,
  formatDistance,
  formatSpeed,
  formatPace100m,
  getActivityCategory,
} from "@/lib/utils";

export type HeroStat = "distance" | "time" | "pace";

export interface CardConfig {
  hero: HeroStat;
  show: {
    pace: boolean;
    time: boolean;
    heartRate: boolean;
    calories: boolean;
    elevation: boolean;
    laps: boolean;
    steps: boolean;
  };
}

export const DEFAULT_CONFIG: CardConfig = {
  hero: "distance",
  show: {
    pace: true,
    time: true,
    heartRate: true,
    calories: false,
    elevation: false,
    laps: true,
    steps: false,
  },
};

interface ActivityData {
  type: string;
  duration: number;
  distance?: number | null;
  avgPace?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  calories?: number | null;
  elevGain?: number | null;
  steps?: number | null;
}

/** Resolve the hero (big number) value + unit based on config */
export function resolveHero(
  config: CardConfig,
  data: ActivityData
): { value: string; unit: string } {
  const t = data.type.toLowerCase();
  const isSwim = t.includes("swim");
  const isCycle = t.includes("cycl") || t.includes("bike") || t.includes("ride");
  const isEndurance = getActivityCategory(data.type) === "endurance";

  if (config.hero === "pace" && data.avgPace) {
    if (isSwim) return { value: formatPace100m(data.avgPace), unit: "/100M" };
    if (isCycle) return { value: `${formatSpeed(1 / data.avgPace)}`, unit: "KM/H" };
    return { value: formatPace(data.avgPace), unit: "/KM" };
  }

  if (config.hero === "distance" && isEndurance && data.distance) {
    if (isSwim) return { value: `${Math.round(data.distance)}`, unit: "M" };
    return { value: formatDistance(data.distance), unit: "KM" };
  }

  // Fallback: duration
  return { value: formatDuration(data.duration), unit: "" };
}

/** Resolve secondary stats list based on config (capped at maxStats) */
export function resolveStats(
  config: CardConfig,
  data: ActivityData,
  maxStats = 3
): { label: string; value: string }[] {
  const t = data.type.toLowerCase();
  const isSwim = t.includes("swim");
  const isCycle = t.includes("cycl") || t.includes("bike") || t.includes("ride");

  const candidates: { label: string; value: string }[] = [];

  // Pace / Speed
  if (config.show.pace && data.avgPace) {
    if (isSwim)
      candidates.push({ label: "PACE/100M", value: formatPace100m(data.avgPace) });
    else if (isCycle)
      candidates.push({ label: "AVG SPEED", value: `${formatSpeed(1 / data.avgPace)} km/h` });
    else
      candidates.push({ label: "AVG PACE", value: formatPace(data.avgPace) });
  }

  // Duration (only as secondary if hero is not time)
  if (config.show.time && config.hero !== "time") {
    candidates.push({ label: "DURATION", value: formatDuration(data.duration) });
  }

  // Heart rate
  if (config.show.heartRate && data.avgHeartRate) {
    candidates.push({ label: "AVG HR", value: `${data.avgHeartRate} bpm` });
  }

  // Calories
  if (config.show.calories && data.calories) {
    candidates.push({ label: "KCAL", value: data.calories.toLocaleString() });
  }

  // Elevation
  if (config.show.elevation && data.elevGain) {
    candidates.push({ label: "ELEV GAIN", value: `+${Math.round(data.elevGain)}m` });
  }

  // Steps
  if (config.show.steps && data.steps) {
    candidates.push({ label: "STEPS", value: data.steps.toLocaleString() });
  }

  return candidates.slice(0, maxStats);
}

/** Determine which hero options are available for an activity */
export function availableHeroOptions(data: ActivityData): HeroStat[] {
  const isEndurance = getActivityCategory(data.type) === "endurance";
  const opts: HeroStat[] = ["time"];
  if (isEndurance && data.distance) opts.unshift("distance");
  if (data.avgPace) opts.push("pace");
  return opts;
}

/** Determine which show toggles make sense for an activity */
export function availableShowToggles(data: ActivityData): (keyof CardConfig["show"])[] {
  const isEndurance = getActivityCategory(data.type) === "endurance";
  const toggles: (keyof CardConfig["show"])[] = [];
  if (data.avgPace && isEndurance) toggles.push("pace");
  toggles.push("time");
  if (data.avgHeartRate) toggles.push("heartRate");
  if (data.calories) toggles.push("calories");
  if (data.elevGain) toggles.push("elevation");
  if (isEndurance) toggles.push("laps");
  if (data.steps) toggles.push("steps");
  return toggles;
}

export const TOGGLE_LABELS: Record<keyof CardConfig["show"], string> = {
  pace: "Pace",
  time: "Time",
  heartRate: "Heart Rate",
  calories: "Calories",
  elevation: "Elevation",
  laps: "Laps",
  steps: "Steps",
};

export const HERO_LABELS: Record<HeroStat, string> = {
  distance: "Distance",
  time: "Time",
  pace: "Pace",
};
