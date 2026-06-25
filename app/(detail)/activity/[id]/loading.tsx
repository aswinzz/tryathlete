export default function Loading() {
  return (
    <div className="px-5 pt-14 pb-28 space-y-5 animate-pulse">
      {/* Back bar */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-16 bg-[var(--surface-2)] rounded" />
        <div className="h-5 w-20 bg-[var(--surface-2)] rounded" />
      </div>
      {/* Hero */}
      <div className="space-y-2 pt-2">
        <div className="h-4 w-24 bg-[var(--surface-2)] rounded" />
        <div className="h-9 w-56 bg-[var(--surface-2)] rounded-lg" />
        <div className="h-3 w-36 bg-[var(--surface-2)] rounded" />
      </div>
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--surface-2)] rounded-2xl p-5 space-y-3">
            <div className="h-3 w-16 bg-[var(--surface-3)] rounded" />
            <div className="h-7 w-24 bg-[var(--surface-3)] rounded-lg" />
          </div>
        ))}
      </div>
      {/* Share button */}
      <div className="h-12 w-full bg-[var(--surface-2)] rounded-2xl" />
    </div>
  );
}
