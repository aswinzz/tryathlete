"use client";

/** Time-aware greeting in the viewer's local timezone (server can't know it). */
export function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12 ? "Good morning," :
    hour >= 12 && hour < 17 ? "Good afternoon," :
    "Good evening,";

  return (
    <div>
      <p className="text-xs text-[var(--text-2)]">{greeting}</p>
      <h1 className="text-2xl font-bold text-white">{name} 👋</h1>
    </div>
  );
}
