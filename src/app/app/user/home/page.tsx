"use client";

import Link from "next/link";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  Bell,
  CalendarClock,
  CalendarCheck2,
  Calculator,
  ChevronRight,
  Dumbbell,
  FlaskConical,
  IdCard,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserSearch,
} from "lucide-react";
import { api } from "@/lib/client";
import { useAuthStore } from "@/stores/app";
import { fmtDate, fmtMoney, membershipState, MEMBERSHIP_STATE_LABEL, timeAgo } from "@/lib/format";
import { Badge, Button, Skeleton } from "@/components/ui/core";
import { BottomSheet } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import type { UserBundle } from "@/lib/types";
import { useState } from "react";

export default function UserHome() {
  const me = useAuthStore((s) => s.user);
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<UserBundle>("/api/user", { refreshInterval: 30000 });
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewBusy, setRenewBusy] = useState(false);

  const firstName = (me?.name ?? "").split(" ")[0] ?? "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const requestPayment = async () => {
    setRenewBusy(true);
    try {
      await api("/api/misc", { method: "POST", body: { action: "paymentRequest" } });
      toast("success", "Payment request sent to the gym admin.");
      setRenewOpen(false);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to send the request.");
    } finally {
      setRenewBusy(false);
    }
  };

  const membership = data?.membership ?? null;
  const state = membershipState(membership);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-extrabold leading-tight tracking-tight text-ink md:text-[28px]">
            {greeting}, {firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-0.5 text-[13.5px] text-ink-2">Here&apos;s your gym day at a glance.</p>
        </div>
        <Link
          href="/app/user/notifications"
          aria-label={`Notifications — ${data?.unreadNotifications ?? 0} unread`}
          className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-ink-2 shadow-sm transition hover:text-ink"
        >
          <Bell size={19} />
          {Boolean(data?.unreadNotifications) && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10.5px] font-bold text-white shadow">
              {data!.unreadNotifications > 9 ? "9+" : data!.unreadNotifications}
            </span>
          )}
        </Link>
      </div>

      {error && (
        <div className="card border-err/25 p-4 text-[13.5px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load your home data."}{" "}
          <button className="font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      )}

      {/* Membership card */}
      {isLoading || !data ? (
        <Skeleton className="h-56 w-full rounded-[24px]" />
      ) : membership ? (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="hero-panel relative overflow-hidden rounded-[24px] p-5 text-white shadow-2xl md:p-6"
          aria-label="Membership"
        >
          <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-brand/25 blur-3xl" aria-hidden />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white/60">
                <IdCard size={13} /> Membership
              </p>
              <h2 className="mt-1.5 text-[22px] font-extrabold tracking-tight md:text-[24px]">{membership.plan} Membership</h2>
            </div>
            <Badge
              tone={state === "expired" ? "err" : state === "expiring" ? "warn" : "ok"}
              className={state === "active" ? "!bg-white/15 !text-white" : ""}
            >
              {MEMBERSHIP_STATE_LABEL[state]}
            </Badge>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Start</p>
              <p className="tabular mt-1 text-[13.5px] font-bold">{fmtDate(membership.startDate)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Renewal at</p>
              <p className="tabular mt-1 text-[13.5px] font-bold">{fmtDate(membership.expiryDate)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Payment due</p>
              <p className="tabular mt-1 text-[13.5px] font-bold">
                {membership.dueAmount > 0 ? fmtMoney(membership.dueAmount) : "—"}
              </p>
            </div>
          </div>

          <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-[13.5px] font-medium text-white/80">
              {membership.dueAmount > 0 ? (
                <>
                  Payment due: <span className="font-bold text-white">{fmtMoney(membership.dueAmount)}</span>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-white/85">
                  <ShieldCheck size={15} className="text-ok" /> No payment due
                </span>
              )}
            </p>
            {membership.dueAmount > 0 &&
              (data.openPaymentRequest ? (
                <Badge className="!bg-white/12 !text-white/90">Request sent to admin</Badge>
              ) : (
                <Button size="sm" className="!bg-white !text-[#0b0c10] hover:!brightness-95" onClick={() => setRenewOpen(true)}>
                  Renew payment
                </Button>
              ))}
          </div>
        </motion.section>
      ) : (
        <div className="card p-5 text-center">
          <p className="text-[14px] font-semibold text-ink">No membership yet</p>
          <p className="mt-1 text-[13px] text-ink-2">The gym admin will set up your membership plan.</p>
        </div>
      )}

      {/* Quick actions */}
      {!isLoading && (
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { href: "/app/user/workout", label: "Workout", icon: Dumbbell },
            { href: "/app/user/progress", label: "Progress", icon: TrendingUp },
            { href: "/app/user/calculators", label: "Calculators", icon: Calculator },
            { href: "/app/user/attendance", label: "Attendance", icon: CalendarCheck2 },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="card card-press flex flex-col items-center gap-1.5 px-2 py-3.5 text-center"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <a.icon size={18} />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-ink">{a.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Trainer card */}
      {isLoading || !data ? (
        <Skeleton className="h-32 w-full rounded-[22px]" />
      ) : (
        <section className="card p-5" aria-label="Your trainer">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
                <Dumbbell size={21} />
              </span>
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">Your trainer</p>
                {data.trainer ? (
                  <>
                    <p className="mt-0.5 truncate text-[16px] font-bold text-ink">{data.trainer.name}</p>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-2">
                      {data.trainer.availability ? `Available ${data.trainer.availability}` : "Availability not set"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-0.5 text-[15px] font-bold text-ink-2">Trainer not assigned</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">Request one from the trainer directory</p>
                  </>
                )}
              </div>
            </div>
            {data.sessionTime && (
              <div className="shrink-0 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-center">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Your time</p>
                <p className="tabular mt-0.5 text-[15px] font-bold text-brand">{data.sessionTime}</p>
              </div>
            )}
          </div>
          {!data.trainer && (
            <Link href="/app/user/trainers" className="btn btn-secondary btn-sm mt-4 w-full">
              <UserSearch size={15} /> Find a trainer
            </Link>
          )}
        </section>
      )}

      {/* Today's session */}
      {isLoading || !data ? (
        <Skeleton className="h-24 w-full rounded-[22px]" />
      ) : (
        <section className="card flex items-center gap-4 p-5" aria-label="Today's session">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <CalendarClock size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">Today&apos;s session</p>
            {data.todayHoliday ? (
              <p className="mt-0.5 text-[15px] font-bold text-warn">
                {data.todayHoliday.name} — gym closed
              </p>
            ) : data.sessionTime ? (
              <p className="mt-0.5 text-[16px] font-bold text-ink">
                {data.sessionTime}
                {data.trainer && <span className="font-semibold text-ink-2"> · Trainer: {data.trainer.name.split(" ")[0]}</span>}
              </p>
            ) : (
              <p className="mt-0.5 text-[14.5px] font-semibold text-ink-2">No session scheduled</p>
            )}
          </div>
          {!data.sessionTime && !data.todayHoliday && data.trainer && (
            <Badge tone="neutral">Ask your trainer</Badge>
          )}
        </section>
      )}

      {/* Notifications preview */}
      {!isLoading && data && (
        <section aria-label="Notifications">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-[15px] font-bold tracking-tight text-ink">Notifications</h2>
            <Link href="/app/user/notifications" className="flex items-center gap-0.5 text-[12.5px] font-semibold text-brand">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          {data.latestNotifications.length === 0 ? (
            <div className="card flex items-center gap-3 p-4 text-ink-2">
              <FlaskConical size={17} className="text-ink-3" />
              <p className="text-[13.5px]">Nothing here yet — updates from your gym will appear here.</p>
            </div>
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {data.latestNotifications.map((n) => (
                <Link key={n.id} href="/app/user/notifications" className="flex items-start gap-3 p-4 transition hover:bg-surface-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-ink-3/40" : "bg-brand"}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink-2">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-ink-3">{timeAgo(n.createdAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Renew payment sheet */}
      <BottomSheet open={renewOpen} onClose={() => setRenewOpen(false)} title="Renew membership">
        {membership && (
          <>
            <div className="rounded-2xl bg-surface-2 p-4">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[13px] text-ink-2">Plan</span>
                <span className="text-[13.5px] font-bold text-ink">{membership.plan}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[13px] text-ink-2">Renewal date</span>
                <span className="tabular text-[13.5px] font-bold text-ink">{fmtDate(membership.expiryDate)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line py-1.5 pt-2.5">
                <span className="text-[13px] text-ink-2">Amount due</span>
                <span className="tabular text-[18px] font-extrabold text-brand">{fmtMoney(membership.dueAmount)}</span>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
              Requesting a payment lets the gym admin verify and record your payment. You&apos;ll get a confirmation
              notification once it&apos;s received.
            </p>
            <Button block className="mt-5" onClick={requestPayment} loading={renewBusy}>
              <Sparkles size={15} /> Request payment
            </Button>
          </>
        )}
      </BottomSheet>

      {/* Holiday celebration ribbon */}
      {data?.todayHoliday && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-warn/25 bg-warn/10 px-4 py-3 text-[13px] font-semibold text-warn">
          <PartyPopper size={16} className="shrink-0" />
          {data.todayHoliday.name} — {data.todayHoliday.reason ?? "the gym is closed today"}.
        </div>
      )}
    </div>
  );
}
