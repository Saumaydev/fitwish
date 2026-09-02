"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  Dumbbell,
  Inbox,
  LayoutDashboard,
  LogOut,
  Monitor,
  MoonStar,
  MoreHorizontal,
  Sun,
  ShieldCheck,
  Settings,
  Users,
  UserCheck,
} from "lucide-react";
import { api } from "@/lib/client";
import { useTheme } from "@/components/providers";
import { BottomSheet } from "@/components/ui/overlays";
import type { ThemePref } from "@/lib/types";
import { APP_NAME } from "@/lib/constants";

const NAV = [
  { href: "/app/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/admin/members", label: "Members", icon: Users },
  { href: "/app/admin/trainers", label: "Trainers", icon: Dumbbell },
  { href: "/app/admin/requests", label: "Requests", icon: Inbox },
  { href: "/app/admin/trainer-attendance", label: "Trainer Attendance", icon: CalendarCheck2 },
  { href: "/app/admin/holidays", label: "Holidays", icon: CalendarDays },
  { href: "/app/admin/reports", label: "Reports", icon: ShieldCheck },
  { href: "/app/admin/notifications", label: "Notifications", icon: BarChart3 },
  { href: "/app/admin/audit", label: "Activity", icon: UserCheck },
  { href: "/app/admin/settings", label: "Settings", icon: Settings },
];

const MOBILE_MAIN = NAV.slice(0, 4);

const THEME_OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: MoonStar },
];

function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-3">Appearance</p>
      <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1">
        {THEME_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              aria-pressed={active}
              aria-label={`${opt.label} theme`}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11.5px] font-semibold transition ${
                active ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
              }`}
            >
              <Icon size={13} />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdminNav({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const signOut = async () => {
    await api("/api/auth", { method: "POST", body: { action: "logout" } }).catch(() => {});
    router.replace("/");
    router.refresh();
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="liquid-glass fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r md:flex safe-top">
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-strong text-[15px] font-extrabold text-white shadow-md">
            F
          </span>
          <span className="text-[17px] font-extrabold tracking-tight text-ink">
            FIT<span className="text-brand">WISH</span>
          </span>
          <span className="ml-auto badge badge-brand">ADMIN</span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Admin">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] font-semibold transition-colors ${
                  active ? "text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="admin-nav"
                    className="absolute inset-0 rounded-xl bg-brand-soft ring-1 ring-brand/20"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon size={17} className={`relative z-10 ${active ? "text-brand" : ""}`} />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="space-y-3.5 border-t border-line px-4 py-4">
          <ThemeSwitch />
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-[12px] font-bold text-ink">
              {adminName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">{adminName}</p>
              <p className="text-[11px] text-ink-3">Gym Administrator</p>
            </div>
            <button onClick={signOut} aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-xl text-ink-3 transition hover:bg-surface-2 hover:text-err">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="liquid-glass fixed inset-x-0 top-0 z-40 flex h-[56px] items-center justify-between border-b px-4 md:hidden">
        <span className="text-[16px] font-extrabold tracking-tight text-ink">
          FIT<span className="text-brand">WISH</span> <span className="ml-2 badge badge-brand">ADMIN</span>
        </span>
        <button onClick={signOut} aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-xl text-ink-2">
          <LogOut size={17} />
        </button>
      </header>

      {/* Mobile bottom nav */}
      <nav aria-label="Admin" className="liquid-glass fixed inset-x-0 bottom-0 z-50 border-t safe-bottom md:hidden">
        <div className="mx-auto flex h-[64px] max-w-md items-stretch justify-around px-1">
          {MOBILE_MAIN.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5"
              >
                {active && (
                  <motion.span
                    layoutId="admin-mobile-nav"
                    className="absolute top-1 h-8 w-12 rounded-full bg-brand-soft"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <Icon size={20} strokeWidth={active ? 2.4 : 2} className={`relative z-10 ${active ? "text-brand" : "text-ink-3"}`} />
                <span className={`relative z-10 text-[9.5px] font-semibold leading-none ${active ? "text-brand" : "text-ink-3"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More admin sections"
            className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 text-ink-3"
          >
            <MoreHorizontal size={20} />
            <span className="text-[9.5px] font-semibold leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* More sheet (mobile) */}
      <AnimatePresence>
        {moreOpen && (
          <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Admin sections">
            <div className="grid gap-1.5">
              {NAV.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex h-12 items-center gap-3 rounded-xl px-3.5 text-[14px] font-semibold ${
                      active ? "bg-brand-soft text-brand" : "text-ink hover:bg-surface-2"
                    }`}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="mt-2 border-t border-line pt-3">
                <ThemeSwitch />
              </div>
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>
    </>
  );
}
