"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { Avatar, Badge, EmptyState, Input, PageHeader, Segmented, Skeleton } from "@/components/ui/core";

interface Record {
  id: string;
  userUid: string;
  userName: string;
  date: string;
  status: "present" | "absent";
}

export default function AttendanceHistory() {
  const { data, error, isLoading, mutate } = useSWR<{ records: Record[] }>("/api/trainer?action=attendanceHistory", {
    refreshInterval: 30000,
  });
  const [filter, setFilter] = useState<"all" | "present" | "absent">("all");
  const [q, setQ] = useState("");

  const records = useMemo(() => {
    return (data?.records ?? [])
      .filter((r) => (filter === "all" ? true : r.status === filter))
      .filter((r) => r.userName.toLowerCase().includes(q.trim().toLowerCase()));
  }, [data, filter, q]);

  return (
    <div>
      <Link href="/app/trainer/attendance" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft size={15} /> Mark attendance
      </Link>
      <PageHeader title="Attendance History" subtitle="Recent records across your clients" />

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <Segmented
          options={[
            { value: "all", label: "All" },
            { value: "present", label: "Present" },
            { value: "absent", label: "Absent" },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <Input placeholder="Search client…" className="!w-40" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search history" />
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-16 w-full rounded-[22px]" />
          <Skeleton className="h-16 w-full rounded-[22px]" />
          <Skeleton className="h-16 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load history."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : records.length === 0 ? (
        <EmptyState icon={<ClipboardList size={20} />} title="No records yet" hint="Attendance you mark appears here." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {records.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3.5">
              <Avatar name={r.userName} src={null} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-ink">{r.userName}</p>
                <p className="tabular text-[12px] text-ink-2">{fmtDate(r.date)}</p>
              </div>
              <Badge tone={r.status === "present" ? "ok" : "err"}>{r.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
