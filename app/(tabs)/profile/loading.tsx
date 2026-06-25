export default function Loading() {
  return (
    <div className="px-5 pt-14 pb-28 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 bg-[var(--surface-2)] rounded-lg" />
        <div className="w-8 h-8 bg-[var(--surface-2)] rounded-full" />
      </div>
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-20 h-20 rounded-full bg-[var(--surface-2)]" />
        <div className="h-5 w-32 bg-[var(--surface-2)] rounded-lg" />
        <div className="h-3 w-24 bg-[var(--surface-2)] rounded" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-[var(--surface-2)] rounded-2xl p-4 space-y-2">
            <div className="h-6 w-12 bg-[var(--surface-3)] rounded mx-auto" />
            <div className="h-3 w-16 bg-[var(--surface-3)] rounded mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
