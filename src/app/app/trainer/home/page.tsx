"use client";

import Link from "next/link";
import useSWR from "swr";
import { CalendarCheck2, CalendarClock, ChevronRight, ClipboardList, UserCheck, Users } from "lucide-react";
import { api } from "@/lib/client";
import { useAuthStore } from "@/stores/app";
import { Avatar, Badge, Button, PageHeader, Skeleton, StatCard } from "@/components/ui/core";
import type { TrainerOverviewDTO } from "@/lib/types";

export default function TrainerHome() {
  const me = useAuthStore((s) => s.user);
  const { data, error, isLoading, mutate } = useSWR<TrainerOverviewDTO>("/api/trainer?action=overview", {
    refreshInterval: 30000,
  });

  const firstName = (me?.name ?? "").split(" ")[0] ?? "";

  return (
    <div>
      <PageHeader
        title={`Hi ${firstName} 👋`}
        subtitle="Your gym day at a glance"
        right={
          data && data.pendingRequests.length > 0 ? (
            <Link href="/app/trainer/requests" className="relative grid h-11 w-11 place-items-center rounded-2xl border border-line bg-surface text-ink-2 shadow-sm">
              <ClipboardList size={18} />
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10.5px] font-bold text-white">
                {data.pendingRequests.length}
              </span>
            </Link>
          ) : undefined
        }
      />

      {error && (
        <div className="card border-err/25 p-4 text-[13.5px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load your dashboard."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[22px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard icon={<Users size={18} />} label="My clients" value={data?.clientCount ?? 0} sub="assigned members" />
          <StatCard icon={<CalendarClock size={18} />} label="Today's sessions" value={data?.todaySessionCount ?? 0} sub="scheduled times" tone="neutral" />
          <StatCard icon={<UserCheck size={18} />} label="Active clients" value={data?.activeClientCount ?? 0} sub="with active plans" tone="ok" />
          <StatCard icon={<ClipboardList size={18} />} label="Pending tasks" value={data?.pendingTasks ?? 0} sub="requests & attendance" tone="warn" />
        </div>
      )}

      {/* Pending requests */}
      {data && data.pendingRequests.length > 0 && (
        <section className="mt-6">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-[15px] font-bold tracking-tight text-ink">New client requests</h2>
            <Link href="/app/trainer/requests" className="flex items-center gap-0.5 text-[12.5px] font-semibold text-brand">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {data.pendingRequests.slice(0, 3).map((r) => (
              <div key={r.id} className="card flex items-center gap-3.5 p-4">
                <Avatar name={r.userName} src={r.userPhoto} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-ink">{r.userName}</p>
                  <p className="text-[12.5px] text-ink-2">wants to be your client</p>
                </div>
                <Badge tone="warn">Pending</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Today's schedule */}
      {data && data.schedule.length > 0 && (
        <section className="mt-6">
          <div className="mb-2.5 flex items-center gap-2">
            <CalendarClock size={15} className="text-ink-3" />
            <h2 className="text-[15px] font-bold tracking-tight text-ink">Today&apos;s schedule</h2>
          </div>
          <div className="card divide-y divide-line overflow-hidden">
            {data.schedule.map((s) => (
              <Link key={s.userUid} href={`/app/trainer/clients/${s.userUid}`} className="flex items-center gap-3.5 p-4 transition hover:bg-surface-2">
                <Avatar name={s.name} src={s.photoUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-ink">{s.name}</p>
                  <p className="text-[12px] text-ink-2">{s.membershipPlan ?? "No plan"} membership</p>
                </div>
                <span className="tabular rounded-xl bg-brand-soft px-3 py-1.5 text-[13.5px] font-bold text-brand">{s.sessionTime}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {data && data.schedule.length === 0 && !isLoading && (
        <div className="card mt-6 p-5 text-center">
          <p className="text-[14px] font-semibold text-ink">No sessions scheduled yet</p>
          <p className="mt-1 text-[13px] text-ink-2">Set session times from each client&apos;s page.</p>
          {data.clientCount > 0 && (
            <Link href="/app/trainer/clients" className="btn btn-primary btn-sm mt-4">
              Open my clients
            </Link>
          )}
        </div>
      )}

      {/* Quick actions */}
      {data && data.clientCount > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <Link href="/app/trainer/attendance" className="card card-press flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <CalendarCheck2 size={17} />
            </span>
            <span>
              <span className="block text-[13.5px] font-bold text-ink">Mark attendance</span>
              <span className="block text-[11.5px] text-ink-2">Today&apos;s roll call</span>
            </span>
          </Link>
          <Link href="/app/trainer/attendance/history" className="card card-press flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
              <ClipboardList size={17} />
            </span>
            <span>
              <span className="block text-[13.5px] font-bold text-ink">Attendance history</span>
              <span className="block text-[11.5px] text-ink-2">Past records</span>
            </span>
          </Link>
        </div>
      )}

      {data && data.clientCount === 0 && !isLoading && (
        <div className="card mt-6 border-dashed p-6 text-center">
          <p className="text-[14.5px] font-bold text-ink">No clients assigned yet</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-2">
            Members will appear here when the admin assigns them to you, or when you accept their trainer requests.
          </p>
          <Link href="/app/trainer/requests" className="btn btn-secondary btn-sm mt-4">
            Check requests
          </Link>
        </div>
      )}
    </div>
  );
}
