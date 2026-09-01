import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { BottomNav, type NavItem } from "@/components/nav/BottomNav";
import { OnlineBanner } from "@/components/OnlineBanner";

export const dynamic = "force-dynamic";

const NAV: NavItem[] = [
  { href: "/app/trainer/home", label: "Home", icon: "home" },
  { href: "/app/trainer/clients", label: "My Clients", icon: "clients" },
  { href: "/app/trainer/sessions", label: "Sessions", icon: "sessions" },
  {
    href: "/app/trainer/attendance",
    label: "Attendance",
    icon: "attendance",
  },
  { href: "/app/trainer/profile", label: "Profile", icon: "profile" },
];

export default async function TrainerLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(["trainer"]);

  return (
    <div className="min-h-dvh bg-bg-soft">
      <OnlineBanner />

      <main className="mx-auto w-full max-w-2xl px-4 pb-36 pt-6 md:px-6 md:pb-24">
        {children}
      </main>

      <BottomNav items={NAV} />
    </div>
  );
}