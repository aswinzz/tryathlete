import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  return (
    <div className="app-container">
      <div className="flex flex-col min-h-dvh">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
