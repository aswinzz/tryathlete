import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPace(secondsPerMeter: number): string {
  const secsPerKm = secondsPerMeter * 1000;
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}'${secs.toString().padStart(2, "0")}"`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2);
}

export function formatDistanceKm(meters: number): string {
  const km = meters / 1000;
  return km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`;
}

export function formatDurationShort(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function getHRZone(bpm: number, maxHR = 190): number {
  const pct = bpm / maxHR;
  if (pct < 0.6) return 1;
  if (pct < 0.7) return 2;
  if (pct < 0.8) return 3;
  if (pct < 0.9) return 4;
  return 5;
}

export const ZONE_COLORS: Record<number, string> = {
  1: "#4ECDC4",
  2: "#45B7D1",
  3: "#9B59B6",
  4: "#FF6B9D",
  5: "#FF4757",
};

export type ActivityCategory = "endurance" | "strength" | "hiit";

export function getActivityCategory(type: string): ActivityCategory {
  const t = type.toLowerCase();
  if (t.includes("strength") || t.includes("gym") || t.includes("weight") || t.includes("functional_strength")) return "strength";
  if (t.includes("hiit") || t.includes("crossfit") || t.includes("circuit")) return "hiit";
  return "endurance";
}

export function formatSpeed(metersPerSecond: number): string {
  return (metersPerSecond * 3.6).toFixed(1);
}

export function formatPace100m(secondsPerMeter: number): string {
  const secsPerHundred = secondsPerMeter * 100;
  const mins = Math.floor(secsPerHundred / 60);
  const secs = Math.round(secsPerHundred % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function getActivityIcon(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("run")) return "🏃";
  if (t.includes("cycl") || t.includes("bike") || t.includes("ride")) return "🚴";
  if (t.includes("swim")) return "🏊";
  if (t.includes("strength") || t.includes("gym") || t.includes("weight")) return "🏋️";
  if (t.includes("hike") || t.includes("walk")) return "🥾";
  if (t.includes("hiit") || t.includes("crossfit")) return "⚡";
  if (t.includes("yoga")) return "🧘";
  if (t.includes("row")) return "🚣";
  return "⚡";
}

export function getActivityTypeLabel(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("run")) return "Run";
  if (t.includes("cycl") || t.includes("bike") || t.includes("ride")) return "Cycling";
  if (t.includes("swim")) return "Swim";
  if (t.includes("strength") || t.includes("gym") || t.includes("weight")) return "Strength";
  if (t.includes("hiit") || t.includes("crossfit")) return "HIIT";
  if (t.includes("hike")) return "Hike";
  if (t.includes("walk")) return "Walk";
  if (t.includes("yoga")) return "Yoga";
  if (t.includes("row")) return "Rowing";
  return "Workout";
}

export function lapDistanceLabel(distanceM: number): string {
  const km = distanceM / 1000;
  return km % 1 === 0 ? `${km} KM` : `${km.toFixed(2)} KM`;
}
