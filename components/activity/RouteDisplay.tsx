"use client";
import { useState } from "react";
import { routeToSvgPath, RoutePoint } from "@/lib/routeUtils";

interface RouteDisplayProps {
  activityId: string;
  garminId: string | null;
  initialRoutePoints: RoutePoint[] | null;
}

const ACCENT = "#c8ff00";
const BG     = "#0d1320";
const TEXT2  = "rgba(255,255,255,0.4)";

export function RouteDisplay({ activityId, garminId, initialRoutePoints }: RouteDisplayProps) {
  const [pts, setPts]         = useState<RoutePoint[] | null>(initialRoutePoints);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed]   = useState(false);

  async function loadRoute() {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/activities/${activityId}/route-sync`, { method: "POST" });
      const data = await res.json();
      if (data.routePoints) {
        setPts(data.routePoints);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const VW = 400;
  const VH = 260;
  const pathD = pts && pts.length > 1 ? routeToSvgPath(pts, VW, VH, 24) : null;

  // Start / end coords for dots
  let startXY: { x: number; y: number } | null = null;
  let endXY:   { x: number; y: number } | null = null;
  if (pts && pts.length > 1) {
    const lats = pts.map((p) => p.lat);
    const lons = pts.map((p) => p.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const latR = maxLat - minLat || 0.001;
    const lonR = maxLon - minLon || 0.001;
    const pad = 24;
    const w = VW - pad * 2, h = VH - pad * 2;
    const scale = Math.min(w / lonR, h / latR);
    const drawW = lonR * scale, drawH = latR * scale;
    const ox = pad + (w - drawW) / 2;
    const oy = pad + (h - drawH) / 2;
    const toXY = (p: RoutePoint) => ({
      x: ox + ((p.lon - minLon) / lonR) * drawW,
      y: oy + drawH - ((p.lat - minLat) / latR) * drawH,
    });
    startXY = toXY(pts[0]);
    endXY   = toXY(pts[pts.length - 1]);
  }

  return (
    <div className="mx-5 mb-6">
      <p className="text-[10px] font-bold text-[var(--text-3)] uppercase tracking-widest mb-3">
        Route
      </p>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: BG, aspectRatio: `${VW}/${VH}` }}
      >
        {pathD ? (
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            style={{ display: "block", width: "100%", height: "100%" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Glow */}
            <path d={pathD} fill="none" stroke={ACCENT} strokeWidth={8}  strokeLinecap="round" strokeLinejoin="round" opacity={0.12} />
            {/* Line */}
            <path d={pathD} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />

            {startXY && (
              <circle cx={startXY.x} cy={startXY.y} r={5} fill="white" opacity={0.9} />
            )}
            {endXY && (
              <>
                <circle cx={endXY.x} cy={endXY.y} r={11} fill={ACCENT} opacity={0.18} />
                <circle cx={endXY.x} cy={endXY.y} r={5.5}  fill={ACCENT} opacity={0.95} />
              </>
            )}
          </svg>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs" style={{ color: TEXT2 }}>Fetching GPS data…</p>
              </>
            ) : failed ? (
              <>
                <p style={{ color: TEXT2, fontSize: 12 }}>No GPS data available for this activity.</p>
              </>
            ) : garminId ? (
              <>
                <p style={{ color: TEXT2, fontSize: 11, fontWeight: 600 }}>Route not loaded yet</p>
                <button
                  onClick={loadRoute}
                  className="text-xs font-bold px-4 py-2 rounded-full"
                  style={{ background: ACCENT, color: "#000" }}
                >
                  Load Route
                </button>
              </>
            ) : (
              <p style={{ color: TEXT2, fontSize: 12 }}>No GPS data</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
