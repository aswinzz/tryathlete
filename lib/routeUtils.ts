export interface RoutePoint {
  lat: number;
  lon: number;
}

/**
 * Downsample a GPS track to at most `maxPts` points.
 * Always keeps first and last; takes every Nth in between.
 */
export function downsample(pts: RoutePoint[], maxPts = 200): RoutePoint[] {
  if (pts.length <= maxPts) return pts;
  const step = Math.ceil(pts.length / maxPts);
  const result: RoutePoint[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i === 0 || i === pts.length - 1 || i % step === 0) result.push(pts[i]);
  }
  return result;
}

/**
 * Convert an array of lat/lon points to an SVG path `d` string.
 * The path is fitted inside (viewW × viewH) with `padding` on each side,
 * aspect-ratio-preserved.
 */
export function routeToSvgPath(
  pts: RoutePoint[],
  viewW = 400,
  viewH = 400,
  padding = 20
): string {
  if (pts.length < 2) return "";

  const lats = pts.map((p) => p.lat);
  const lons = pts.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const latRange = maxLat - minLat || 0.001;
  const lonRange = maxLon - minLon || 0.001;

  const w = viewW - padding * 2;
  const h = viewH - padding * 2;

  // Preserve aspect ratio — scale to fit without stretching
  const scale = Math.min(w / lonRange, h / latRange);
  const drawW = lonRange * scale;
  const drawH = latRange * scale;
  const offsetX = padding + (w - drawW) / 2;
  const offsetY = padding + (h - drawH) / 2;

  const coords = pts.map((p) => {
    const x = offsetX + ((p.lon - minLon) / lonRange) * drawW;
    const y = offsetY + drawH - ((p.lat - minLat) / latRange) * drawH; // flip Y axis
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return "M " + coords.join(" L ");
}

/**
 * Compute the total path length of an SVG path element (for stroke-dasharray animation).
 * Call this in the browser with the actual SVGPathElement.
 */
export function getSvgPathLength(pathEl: SVGPathElement): number {
  return pathEl.getTotalLength();
}

/**
 * Project lat/lon points into canvas pixel coords.
 * Fits the track inside (canvasW × canvasH) with `pad` on each side, aspect-ratio-preserved.
 */
export function projectRouteToCanvas(
  pts: RoutePoint[],
  canvasW: number,
  canvasH: number,
  pad = 40
): { x: number; y: number }[] {
  if (pts.length < 2) return [];
  const lats = pts.map((p) => p.lat);
  const lons = pts.map((p) => p.lon);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const latR = maxLat - minLat || 0.001;
  const lonR = maxLon - minLon || 0.001;
  const w = canvasW - pad * 2;
  const h = canvasH - pad * 2;
  const scale = Math.min(w / lonR, h / latR);
  const drawW = lonR * scale;
  const drawH = latR * scale;
  const ox = pad + (w - drawW) / 2;
  const oy = pad + (h - drawH) / 2;
  return pts.map((p) => ({
    x: ox + ((p.lon - minLon) / lonR) * drawW,
    y: oy + drawH - ((p.lat - minLat) / latR) * drawH,
  }));
}
