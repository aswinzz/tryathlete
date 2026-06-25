"use client";
import { routeToSvgPath, RoutePoint } from "@/lib/routeUtils";

interface RouteMapSvgProps {
  routePoints: RoutePoint[];
  viewW?: number;
  viewH?: number;
  padding?: number;
  /** Stroke color for the route line */
  strokeColor?: string;
  /** Width of the main route stroke (px in SVG space) */
  strokeWidth?: number;
  /** Opacity of the glow layer (0 = no glow) */
  glowOpacity?: number;
  /** Width of the glow stroke */
  glowWidth?: number;
  /** Show start / end dots */
  showDots?: boolean;
  /** Style of the stroke: "solid" | "dashed" | "dotted" */
  strokeStyle?: "solid" | "dashed" | "dotted";
  style?: React.CSSProperties;
  className?: string;
}

/** Pre-compute start/end dot coords from the same projection used by routeToSvgPath */
function getEndpoints(
  pts: RoutePoint[],
  viewW: number,
  viewH: number,
  padding: number
): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
  if (pts.length < 2) return null;
  const lats = pts.map((p) => p.lat);
  const lons = pts.map((p) => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const latRange = maxLat - minLat || 0.001;
  const lonRange = maxLon - minLon || 0.001;
  const w = viewW - padding * 2;
  const h = viewH - padding * 2;
  const scale = Math.min(w / lonRange, h / latRange);
  const drawW = lonRange * scale;
  const drawH = latRange * scale;
  const ox = padding + (w - drawW) / 2;
  const oy = padding + (h - drawH) / 2;
  const toXY = (p: RoutePoint) => ({
    x: ox + ((p.lon - minLon) / lonRange) * drawW,
    y: oy + drawH - ((p.lat - minLat) / latRange) * drawH,
  });
  return { start: toXY(pts[0]), end: toXY(pts[pts.length - 1]) };
}

export function RouteMapSvg({
  routePoints,
  viewW = 400,
  viewH = 240,
  padding = 22,
  strokeColor = "#c8ff00",
  strokeWidth = 2.5,
  glowOpacity = 0.14,
  glowWidth = 10,
  showDots = true,
  strokeStyle = "solid",
  style,
  className,
}: RouteMapSvgProps) {
  if (!routePoints || routePoints.length < 2) return null;

  const pathD = routeToSvgPath(routePoints, viewW, viewH, padding);
  const dots = showDots ? getEndpoints(routePoints, viewW, viewH, padding) : null;

  const dashArray =
    strokeStyle === "dashed" ? "8 5" : strokeStyle === "dotted" ? "2 4" : undefined;

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", width: "100%", ...style }}
      className={className}
    >
      {/* Glow layer */}
      {glowOpacity > 0 && (
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={glowWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={glowOpacity}
        />
      )}
      {/* Main line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashArray}
        opacity={0.9}
      />
      {/* Start dot — white */}
      {dots && (
        <circle cx={dots.start.x} cy={dots.start.y} r={4} fill="white" opacity={0.85} />
      )}
      {/* End dot — accent with halo */}
      {dots && (
        <>
          <circle cx={dots.end.x} cy={dots.end.y} r={10} fill={strokeColor} opacity={0.18} />
          <circle cx={dots.end.x} cy={dots.end.y} r={5}  fill={strokeColor} opacity={0.95} />
        </>
      )}
    </svg>
  );
}
