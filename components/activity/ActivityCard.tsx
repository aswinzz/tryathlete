import Link from "next/link";
import { Share2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatSpeed,
  formatPace100m,
  getActivityIcon,
  getActivityCategory,
  ZONE_COLORS,
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ActivityCardProps {
  id: string;
  name: string;
  type: string;
  startTime: Date;
  duration: number;
  distance?: number | null;
  avgHeartRate?: number | null;
  avgPace?: number | null;
  elevGain?: number | null;
  calories?: number | null;
  zone?: number;
  isPR?: boolean;
}

export function ActivityCard({
  id,
  name,
  type,
  startTime,
  duration,
  distance,
  avgHeartRate,
  avgPace,
  elevGain,
  calories,
  zone = 2,
  isPR,
}: ActivityCardProps) {
  const zoneColor = ZONE_COLORS[zone] || ZONE_COLORS[2];
  const category = getActivityCategory(type);
  const t = type.toLowerCase();
  const isSwim = t.includes("swim");
  const isCycle = t.includes("cycl") || t.includes("bike") || t.includes("ride");

  // Build stat cells based on activity type
  const stats: { label: string; value: string }[] = [];

  if (category === "endurance") {
    if (distance) {
      const distLabel = isSwim ? `${Math.round(distance)}m` : `${formatDistance(distance)} km`;
      stats.push({ label: "DIST", value: distLabel });
    }
    if (isCycle && avgPace) {
      // avgPace is seconds/meter; speed = 1/avgPace * 3.6
      stats.push({ label: "SPEED", value: `${formatSpeed(1 / avgPace)} km/h` });
    } else if (isSwim && avgPace) {
      stats.push({ label: "PACE", value: `${formatPace100m(avgPace)}/100m` });
    } else if (avgPace) {
      stats.push({ label: "PACE", value: formatPace(avgPace) });
    }
    stats.push({ label: "TIME", value: formatDuration(duration) });
    if (avgHeartRate) stats.push({ label: "HR", value: `${avgHeartRate} bpm` });
    else if (isCycle && elevGain) stats.push({ label: "ELEV", value: `+${Math.round(elevGain)}m` });
  } else {
    // strength / hiit
    stats.push({ label: "TIME", value: formatDuration(duration) });
    if (avgHeartRate) stats.push({ label: "AVG HR", value: `${avgHeartRate} bpm` });
    if (calories) stats.push({ label: "KCAL", value: calories.toLocaleString() });
    if (elevGain) stats.push({ label: "ELEV", value: `+${Math.round(elevGain)}m` });
  }

  return (
    <div className="relative bg-[var(--surface-2)] rounded-2xl overflow-hidden transition-transform active:scale-[0.985]">
      {/* Left zone bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: zoneColor }}
      />

      <div className="pl-5 pr-5 pt-5 pb-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${zoneColor}20` }}
            >
              {getActivityIcon(type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[var(--text)] text-[15px]">{name}</p>
                {isPR && <Badge variant="accent">PR</Badge>}
              </div>
              <p className="text-xs text-[var(--text-2)] mt-1">
                {format(new Date(startTime), "MMM d · h:mm a")}
              </p>
            </div>
          </div>
          <Link
            href={`/share/${id}`}
            className="text-[var(--text-3)] hover:text-[var(--accent)] transition-colors p-1.5 active:scale-90"
            title="Share"
          >
            <Share2 size={16} />
          </Link>
        </div>

        {/* Stats row */}
        {stats.length > 0 && (
          <div className="border-t border-[var(--border)] pt-4">
            <div className={cn(
              "grid gap-4",
              stats.length === 1 && "grid-cols-1",
              stats.length === 2 && "grid-cols-2",
              stats.length === 3 && "grid-cols-3",
              stats.length >= 4 && "grid-cols-4",
            )}>
              {stats.slice(0, 4).map(({ label, value }, i) => (
                <Stat key={i} label={label} value={value} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tap to view — active state gives instant press feedback */}
      <Link
        href={`/activity/${id}`}
        className="absolute inset-0 rounded-2xl transition-opacity active:opacity-60"
        aria-label={`View ${name}`}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] font-bold text-[var(--text)] truncate leading-tight">{value}</p>
      <p className="text-[10px] text-[var(--text-3)] mt-1 uppercase tracking-wider">{label}</p>
    </div>
  );
}
