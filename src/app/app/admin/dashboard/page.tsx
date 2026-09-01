"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import useSWR from "swr";
import {
  Activity,
  CalendarCheck2,
  CircleAlert,
  Dumbbell,
  Inbox,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { fmtMoney, timeAgo } from "@/lib/format";
import { Badge, PageHeader, Skeleton, StatCard } from "@/components/ui/core";
import { HelpBot } from "@/components/HelpBot";
import type { AdminDashboardDTO } from "@/lib/types";

const SignupsChart = dynamic(() => import("@/components/Charts").then((m) => m.SignupsChart), {
  ssr: false,
  loading: () => <Skeleton className="h-52 w-full rounded-2xl" />,
});

const ACTION_LABELS: Record<string, string> = {
  approve_trainer: "Approved trainer",
  reject_trainer: "Rejected trainer",
  deactivate_trainer: "Deactivated trainer",
  activate_trainer: "Activated trainer",
  approve_member: "Approved member",
  reject_member: "Rejected member",
  assign_trainer: "Assigned trainer",
  update_membership: "Updated membership",
  payment_received: "Recorded payment",
  report_resolved: "Resolved report",
  create_holiday: "Added holiday",
  delete_holiday: "Removed holiday",
  send_notification: "Sent announcement",
};

export default function AdminDashboard() {
  const { data, error, isLoading, mutate } = useSWR<AdminDashboardDTO>("/api/admin?action=dashboard", {
    refreshInterval: 30000,
  });

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your gym at a glance" />

      {error && (
        <div className="card mb-4 border-err/25 p-4 text-[13.5px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load the dashboard."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      )}

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[22px]" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <StatCard icon={<Users size={18} />} label="Total members" value={data.totalUsers} sub={`${data.pendingMemberApprovals} awaiting approval`} />
            <StatCard icon={<Dumbbell size={18} />} label="Trainers" value={data.totalTrainers} sub={`${data.activeTrainers} active · ${data.inactiveTrainers} inactive`} tone="neutral" />
            <StatCard icon={<TrendingUp size={18} />} label="Active memberships" value={data.activeMemberships} sub={`${data.expiringMemberships} expiring soon`} tone="ok" />
            <StatCard icon={<Wallet size={18} />} label="Payments due" value={fmtMoney(data.totalDue)} sub={`${data.pendingPayments} payment requests`} tone="warn" />
          </div>

          {/* Attention row */}
          {(data.pendingMemberApprovals > 0 || data.pendingTrainerApprovals > 0 || data.pendingReports > 0) && (
            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {data.pendingMemberApprovals > 0 && (
                <Link href="/app/admin/requests" className="card card-press flex items-center gap-3 border-brand/30 bg-brand-soft p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white">
                    <Users size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="tabular block text-[16px] font-extrabold text-ink">{data.pendingMemberApprovals}</span>
                    <span className="block truncate text-[12px] font-semibold text-ink-2">member approvals waiting</span>
                  </span>
                </Link>
              )}
              {data.pendingTrainerApprovals > 0 && (
                <Link href="/app/admin/requests" className="card card-press flex items-center gap-3 border-warn/30 bg-warn/10 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warn text-white">
                    <Dumbbell size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="tabular block text-[16px] font-extrabold text-ink">{data.pendingTrainerApprovals}</span>
                    <span className="block truncate text-[12px] font-semibold text-ink-2">trainer applications waiting</span>
                  </span>
                </Link>
              )}
              {data.pendingReports > 0 && (
                <Link href="/app/admin/reports" className="card card-press flex items-center gap-3 border-err/30 bg-err/5 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-err text-white">
                    <CircleAlert size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="tabular block text-[16px] font-extrabold text-ink">{data.pendingReports}</span>
                    <span className="block truncate text-[12px] font-semibold text-ink-2">open reports</span>
                  </span>
                </Link>
              )}
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            {/* Signups chart */}
            <section className="card p-5 lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[15px] font-bold tracking-tight text-ink">Member sign-ups</h2>
                <Badge tone="neutral">Last 14 days</Badge>
              </div>
              <SignupsChart data={data.signups} />
            </section>

            {/* Attendance snapshot */}
            <section className="card p-5 lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <CalendarCheck2 size={15} className="text-ink-3" />
                <h2 className="text-[15px] font-bold tracking-tight text-ink">Attendance snapshot</h2>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-surface-2 p-4 text-center">
                  <p className="tabular text-[24px] font-extrabold text-ok">{data.attendanceToday}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Present today</p>
                </div>
                <div className="rounded-2xl bg-surface-2 p-4 text-center">
                  <p className="tabular text-[24px] font-extrabold text-ink">{data.totalUsers}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Members</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-ink-2">Expiring memberships</span>
                  <span className="tabular font-bold text-warn">{data.expiringMemberships}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-ink-2">Expired memberships</span>
                  <span className="tabular font-bold text-err">{data.expiredMemberships}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-ink-2">Payment requests</span>
                  <span className="tabular font-bold text-ink">{data.pendingPayments}</span>
                </div>
              </div>
              <Link href="/app/admin/members" className="btn btn-secondary btn-sm mt-4 w-full">
                Manage members
              </Link>
            </section>
          </div>

          {/* Recent activity */}
          <section className="card mt-4 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-ink-3" />
                <h2 className="text-[15px] font-bold tracking-tight text-ink">Recent admin activity</h2>
              </div>
              <Link href="/app/admin/audit" className="text-[12.5px] font-semibold text-brand">
                View all
              </Link>
            </div>
            {data.recentAudit.length === 0 ? (
              <p className="text-[13px] text-ink-2">No admin actions yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {data.recentAudit.slice(0, 6).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">{ACTION_LABELS[a.action] ?? a.action}</p>
                      <p className="text-[11.5px] text-ink-3">
                        {a.adminName ?? "Admin"} · {timeAgo(a.createdAt)}
                      </p>
                    </div>
                    <Badge tone="neutral">{a.targetType}</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick links */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { href: "/app/admin/members", label: "Members", icon: Users },
              { href: "/app/admin/trainers", label: "Trainers", icon: Dumbbell },
              { href: "/app/admin/requests", label: "Requests", icon: Inbox },
              { href: "/app/admin/holidays", label: "Holidays", icon: CalendarCheck2 },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="card card-press flex items-center gap-2.5 p-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <l.icon size={16} />
                </span>
                <span className="text-[13px] font-bold text-ink">{l.label}</span>
              </Link>
            ))}
          </div>

          {/* Help & support */}
          <section className="card mt-4 overflow-hidden">
            <h2 className="border-b border-line px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-3">
              Help &amp; support
            </h2>
            <HelpBot role="admin" />
          </section>
        </>
      )}
    </div>
  );
}
