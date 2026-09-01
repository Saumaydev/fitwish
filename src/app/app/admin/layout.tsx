import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { AdminNav } from "@/components/nav/AdminNav";
import { OnlineBanner } from "@/components/OnlineBanner";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole(["admin"]);

  return (
    <div className="min-h-dvh bg-bg-soft">
      <OnlineBanner />

      <AdminNav adminName={user.name} />

      <main className="min-h-dvh pt-[72px] md:pl-[248px] md:pt-0">
        <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-4 md:px-8 md:pb-12 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}