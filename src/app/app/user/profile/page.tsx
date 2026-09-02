"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Bell,
  Calculator,
  CalendarClock,
  ChevronRight,
  CircleHelp,
  Dumbbell,
  HeartPulse,
  Salad,
  IdCard,
  LogOut,
  Phone,
  Settings,
  UserSearch,
} from "lucide-react";
import { api } from "@/lib/client";
import { useAuthStore } from "@/stores/app";
import { fmtDate, fmtMoney, membershipState, MEMBERSHIP_STATE_LABEL } from "@/lib/format";
import { Avatar, Badge, Button, Skeleton } from "@/components/ui/core";
import { useToast } from "@/components/ui/toast";
import type { UserBundle } from "@/lib/types";

export default function UserProfile() {
  const router = useRouter();
  const toast = useToast();
  const me = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { data, isLoading } = useSWR<UserBundle>("/api/user");
  const profileUser = data?.user ?? me;
  const signOut = async () => {
    await api("/api/auth", { method: "POST", body: { action: "logout" } }).catch(() => {});
    setUser(null);
    router.replace("/");
    router.refresh();
  };

  const membership = data?.membership ?? null;
  const state = membershipState(membership);

  const rows = [
    { href: "/app/user/settings", icon: Settings, label: "Settings", sub: "Account, theme & help" },
    { href: "/app/user/diet", icon: Salad, label: "Diet Plan", sub: "Breakfast, lunch, snacks & dinner" },
    { href: "/app/user/calculators", icon: Calculator, label: "Calculators", sub: "BMI, BMR, calories, water & protein" },
    { href: "/app/user/trainers", icon: UserSearch, label: "Find a trainer", sub: me?.assignedTrainerUid ? "Change or view your trainer" : "Request a trainer" },
    { href: "/app/user/notifications", icon: Bell, label: "Notifications", sub: data ? `${data.unreadNotifications} unread` : "View updates" },
  ];

  return (
    <div>
      {/* Identity */}
      <div className="card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-brand-soft blur-2xl" aria-hidden />
        <div className="relative flex items-center gap-4">
          <Avatar
  name={profileUser?.name ?? "?"}
  src={profileUser?.photoUrl}
  size={64}
/>

<div className="min-w-0 flex-1">
  <h1 className="truncate text-[20px] font-extrabold tracking-tight text-ink">
    {profileUser?.name ?? "Member"}
  </h1>

  <p className="truncate text-[13px] text-ink-2">
    {profileUser?.email}
  </p>

  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
    {profileUser?.phone && (
      <Badge tone="neutral">{profileUser.phone}</Badge>
    )}
              {membership && <Badge tone={state === "expired" ? "err" : state === "expiring" ? "warn" : "ok"}>{membership.plan}</Badge>}
            </div>
          </div>
        </div>
      </div>

      {/* Membership */}
      {isLoading ? (
        <Skeleton className="mt-4 h-28 w-full rounded-[22px]" />
      ) : membership ? (
        <div className="card mt-4 p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-3">
              <IdCard size={13} /> Membership
            </p>
            <Badge tone={state === "expired" ? "err" : state === "expiring" ? "warn" : "ok"}>{MEMBERSHIP_STATE_LABEL[state]}</Badge>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Plan</p>
              <p className="mt-0.5 text-[14px] font-bold text-ink">{membership.plan}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Expires</p>
              <p className="tabular mt-0.5 text-[14px] font-bold text-ink">{fmtDate(membership.expiryDate)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Due</p>
              <p className="tabular mt-0.5 text-[14px] font-bold text-ink">{membership.dueAmount > 0 ? fmtMoney(membership.dueAmount) : "—"}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card mt-4 p-4 text-center text-[13.5px] text-ink-2">No membership set up yet — the admin will configure it.</div>
      )}

      {/* Trainer + session */}
      <div className="card mt-4 flex items-center gap-4 p-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Dumbbell size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">Trainer</p>
          <p className="mt-0.5 truncate text-[14.5px] font-bold text-ink">{data?.trainer?.name ?? "Not assigned"}</p>
        </div>
        {data?.sessionTime && (
          <div className="shrink-0 rounded-2xl bg-surface-2 px-3 py-2 text-center">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Session</p>
            <p className="tabular mt-0.5 flex items-center gap-1 text-[13.5px] font-bold text-brand">
              <CalendarClock size={13} /> {data.sessionTime}
            </p>
          </div>
        )}
      </div>

      {/* Emergency contact */}
      {me?.emergencyContact?.name && (
        <div className="card mt-4 flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
            <HeartPulse size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">Emergency contact</p>
            <p className="mt-0.5 text-[13.5px] font-bold text-ink">{me.emergencyContact.name}</p>
          </div>
          {me.emergencyContact.phone && (
            <a href={`tel:${me.emergencyContact.phone}`} className="btn btn-secondary btn-sm">
              <Phone size={13} /> Call
            </a>
          )}
        </div>
      )}

      {/* Menu */}
      <nav className="card mt-4 divide-y divide-line overflow-hidden" aria-label="Profile menu">
        {rows.map((r) => (
          <Link key={r.href} href={r.href} className="flex items-center gap-3.5 p-4 transition hover:bg-surface-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
              <r.icon size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-ink">{r.label}</span>
              <span className="block truncate text-[12px] text-ink-2">{r.sub}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-ink-3" />
          </Link>
        ))}
      </nav>

      {/* About */}
      <Link href="/app/user/settings#about" className="card mt-4 flex items-center gap-3.5 p-4 transition hover:bg-surface-2">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
          <CircleHelp size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold text-ink">About FitWish</span>
          <span className="block text-[12px] text-ink-2">Version 1.0 · Premium gym experience</span>
        </span>
      </Link>

      <Button variant="outline" block className="mt-5 !border-err/25 !text-err" onClick={signOut}>
        <LogOut size={16} /> Sign out
      </Button>
      {!profileUser?.assignedTrainerUid && (
        <p className="mt-3 text-center text-[12px] text-ink-3">
          Tip: request a trainer from the menu to unlock guided training.
        </p>
      )}
    </div>
  );
}
