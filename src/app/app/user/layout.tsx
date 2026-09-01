import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";
import { BottomNav, type NavItem } from "@/components/nav/BottomNav";
import { OnlineBanner } from "@/components/OnlineBanner";

export const dynamic = "force-dynamic";

const NAV: NavItem[] = [
  { href: "/app/user/home", label: "Home", icon: "home" },
  { href: "/app/user/workout", label: "Workout", icon: "workout" },
  { href: "/app/user/progress", label: "Progress", icon: "progress" },
  { href: "/app/user/attendance", label: "Attendance", icon: "attendance" },
  { href: "/app/user/profile", label: "Profile", icon: "profile" },
];

export default async function UserLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(["user"]);

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