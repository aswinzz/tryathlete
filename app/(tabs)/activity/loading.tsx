export default function Loading() {
  return (
    <div className="px-5 pt-14 pb-28 space-y-5">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-[var(--surface-2)] rounded-lg animate-pulse" />
        <div className="h-6 w-20 bg-[var(--surface-2)] rounded-full animate-pulse" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-[var(--surface-2)] rounded-2xl p-5 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-3)]" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-2/3 bg-[var(--surface-3)] rounded" />
              <div className="h-3 w-1/3 bg-[var(--surface-3)] rounded" />
            </div>
          </div>
          <div className="border-t border-[var(--border)] pt-4 grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="space-y-1.5">
                <div className="h-4 w-full bg-[var(--surface-3)] rounded" />
                <div className="h-2.5 w-2/3 bg-[var(--surface-3)] rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
