import Link from "next/link";
import { Share2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  formatDuration,
  formatDistance,
  formatPace,
  getActivityIcon,
  getActivityTypeLabel,
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
  zone = 2,
  isPR,
}: ActivityCardProps) {
  const zoneColor = ZONE_COLORS[zone] || ZONE_COLORS[2];

  return (
    <div className="relative bg-[var(--surface-2)] rounded-2xl overflow-hidden">
      {/* Left zone bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: zoneColor }}
      />

      <div className="pl-4 pr-4 py-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
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
                <p className="font-semibold text-[var(--text)] text-sm">{name}</p>
                {isPR && <Badge variant="accent">PR</Badge>}
              </div>
              <p className="text-xs text-[var(--text-2)] mt-0.5">
                {format(new Date(startTime), "MMM d · h:mm a")}
              </p>
            </div>
          </div>
          <Link
            href={`/share/${id}`}
            className="text-[var(--text-3)] hover:text-[var(--accent)] transition-colors p-1"
            title="Share"
          >
            <Share2 size={16} />
          </Link>
        </div>

        {/* Stats row */}
        <div className="border-t border-[var(--border)] pt-3">
          <div className="grid grid-cols-4 gap-2">
            {distance && (
              <Stat label="DIST" value={`${formatDistance(distance)} km`} />
            )}
            <Stat label="TIME" value={formatDuration(duration)} />
            {avgPace && (
              <Stat label="PACE" value={formatPace(avgPace)} />
            )}
            {avgHeartRate && (
              <Stat label="HR" value={`${avgHeartRate} bpm`} />
            )}
          </div>
        </div>
      </div>

      {/* Tap to view */}
      <Link href={`/activity/${id}`} className="absolute inset-0" aria-label={`View ${name}`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[var(--text)] truncate">{value}</p>
      <p className="text-[9px] font-semibold text-[var(--text-2)] mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  );
}
