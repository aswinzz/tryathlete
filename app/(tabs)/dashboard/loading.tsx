export default function Loading() {
  return (
    <div className="px-5 pt-14 pb-28 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="h-4 w-28 bg-[var(--surface-2)] rounded animate-pulse" />
        <div className="h-7 w-44 bg-[var(--surface-2)] rounded-lg animate-pulse" />
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[var(--surface-2)] rounded-2xl p-4 animate-pulse space-y-2">
            <div className="h-3 w-12 bg-[var(--surface-3)] rounded" />
            <div className="h-6 w-16 bg-[var(--surface-3)] rounded" />
          </div>
        ))}
      </div>
      {/* Recent activities */}
      <div className="space-y-3">
        <div className="h-4 w-32 bg-[var(--surface-2)] rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[var(--surface-2)] rounded-2xl p-5 space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-3)]" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-2/3 bg-[var(--surface-3)] rounded" />
                <div className="h-3 w-1/3 bg-[var(--surface-3)] rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
