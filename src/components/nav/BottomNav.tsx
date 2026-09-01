"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarCheck2,
  CalendarClock,
  Dumbbell,
  Home,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  workout: Dumbbell,
  progress: TrendingUp,
  attendance: CalendarCheck2,
  profile: User,
  clients: Users,
  sessions: CalendarClock,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="liquid-glass fixed inset-x-0 bottom-0 z-50 border-t safe-bottom"
    >
      <div className="mx-auto flex h-[68px] max-w-2xl items-stretch justify-around px-2">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          const Icon = ICONS[item.icon];

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="group relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1"
            >
              <span className="relative grid h-7 w-12 place-items-center">
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute -top-1.5 h-8 w-12 rounded-full bg-brand-soft"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                    }}
                  />
                )}

                <Icon
                  size={21}
                  strokeWidth={active ? 2.4 : 2}
                  className={`relative z-10 transition-colors duration-150 ${
                    active
                      ? "text-brand"
                      : "text-ink-3 group-hover:text-ink-2"
                  }`}
                />
              </span>

              <span
                className={`text-[10.5px] font-semibold leading-none tracking-wide transition-colors duration-150 ${
                  active ? "text-brand" : "text-ink-3"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}