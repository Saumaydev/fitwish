"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { CalendarCheck2, ChevronRight, Dumbbell, Search, Users } from "lucide-react";
import { Avatar, Badge, EmptyState, Input, PageHeader, Skeleton } from "@/components/ui/core";
import type { ClientDTO } from "@/lib/types";

export default function TrainerClients() {
  const [q, setQ] = useState("");
  const { data, error, isLoading, mutate } = useSWR<{ clients: ClientDTO[] }>("/api/trainer?action=clients", {
    refreshInterval: 30000,
  });

  const filtered = (data?.clients ?? []).filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <PageHeader title="My Clients" subtitle={`${data?.clients.length ?? 0} assigned members`} />

      <div className="relative mb-4">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input placeholder="       Search clients…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clients" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-[22px]" />
          <Skeleton className="h-24 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load clients."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title={q ? "No matching clients" : "No clients yet"}
          hint={q ? "Try a different search." : "Members assigned to you will appear here."}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <Link key={c.uid} href={`/app/trainer/clients/${c.uid}`} className="card card-press block p-4">
              <div className="flex items-center gap-3.5">
                <Avatar name={c.name} src={c.photoUrl} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[14.5px] font-bold text-ink">{c.name}</p>
                    <Badge tone={c.membershipStatus === "active" ? "ok" : c.membershipStatus === "expiring" ? "warn" : c.membershipStatus === "expired" ? "err" : "neutral"}>
                      {c.plan ?? "No plan"}
                    </Badge>
                  </div>
                  <p className="tabular mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-2">
                    {c.sessionTime && <span className="font-semibold text-brand">{c.sessionTime}</span>}
                    <span className="flex items-center gap-1">
                      <Dumbbell size={11} /> {c.workoutCount} workouts
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarCheck2 size={11} /> {c.attendancePercent}% att.
                    </span>
                    {c.latestWeight && <span>{c.latestWeight} kg</span>}
                  </p>
                </div>
                <ChevronRight size={17} className="shrink-0 text-ink-3" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
