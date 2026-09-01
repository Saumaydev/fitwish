"use client";

import Link from "next/link";
import useSWR from "swr";
import { CalendarClock, Pencil } from "lucide-react";
import { Avatar, Badge, EmptyState, PageHeader, Skeleton } from "@/components/ui/core";
import type { TrainerOverviewDTO } from "@/lib/types";

export default function TrainerSessions() {
  const { data, error, isLoading, mutate } = useSWR<TrainerOverviewDTO>("/api/trainer?action=overview", { refreshInterval: 30000 });

  return (
    <div>
      <PageHeader title="Sessions" subtitle="Your client schedule" />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-[22px]" />
          <Skeleton className="h-20 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load sessions."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : !data?.schedule.length ? (
        <EmptyState
          icon={<CalendarClock size={20} />}
          title="No sessions scheduled"
          hint="Open a client and set their session time — they'll see it on their Home instantly."
        />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {data.schedule.map((s) => (
            <div key={s.userUid} className="flex items-center gap-3.5 p-4">
              <span className="tabular grid h-11 shrink-0 place-items-center rounded-xl bg-brand-soft px-3 text-[14px] font-extrabold text-brand">
                {s.sessionTime}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-ink">{s.name}</p>
                <p className="text-[12px] text-ink-2">{s.membershipPlan ?? "No plan"} membership</p>
              </div>
              <Link href={`/app/trainer/clients/${s.userUid}`} aria-label={`Edit session time for ${s.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-3 transition hover:bg-surface-2 hover:text-ink">
                <Pencil size={15} />
              </Link>
            </div>
          ))}
        </div>
      )}

      {data && data.schedule.length > 0 && (
        <div className="card mt-4 p-5">
          <div className="flex items-center gap-3">
            <Avatar name={data.schedule[0]!.name} src={data.schedule[0]!.photoUrl} size={40} />
            <p className="text-[13px] leading-relaxed text-ink-2">
              Tip: tap the pencil to adjust a session time. Your client&apos;s Home updates automatically — they can&apos;t edit it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
