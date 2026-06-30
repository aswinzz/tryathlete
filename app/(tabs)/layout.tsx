import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  return (
    <div className="app-container">
      <div className="flex flex-col min-h-dvh">
        <main className="flex-1 pb-20">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
