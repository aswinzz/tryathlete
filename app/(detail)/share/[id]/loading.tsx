export default function Loading() {
  return (
    <div className="flex flex-col min-h-dvh animate-pulse">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-5">
        <div className="h-5 w-14 bg-[var(--surface-2)] rounded" />
        <div className="h-5 w-12 bg-[var(--surface-2)] rounded" />
        <div className="w-16" />
      </div>
      {/* Format picker */}
      <div className="px-5 mb-4 space-y-4">
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-xl bg-[var(--surface-2)]" />
              <div className="h-2.5 w-10 bg-[var(--surface-2)] rounded" />
            </div>
          ))}
        </div>
      </div>
      {/* Card preview */}
      <div className="flex-1 px-5">
        <div className="w-full bg-[var(--surface-2)] rounded-2xl" style={{ aspectRatio: "9/16" }} />
      </div>
    </div>
  );
}
