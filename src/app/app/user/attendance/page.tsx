"use client";

import useSWR from "swr";
import { CalendarCheck2, CalendarDays, CheckCircle2, CircleX } from "lucide-react";
import { fmtDate, daysUntil } from "@/lib/format";
import { Badge, EmptyState, PageHeader, ProgressRing, Skeleton, StatCard } from "@/components/ui/core";

interface AttendanceBundle {
  summary: { total: number; present: number; absent: number; percent: number };
  records: { id: string; date: string; status: "present" | "absent" }[];
  holidays: { id: string; name: string; reason: string | null; date: string }[];
}

export default function UserAttendance() {
  const { data, error, isLoading, mutate } = useSWR<AttendanceBundle>("/api/misc?action=attendance", { refreshInterval: 60000 });

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Your gym presence at a glance" />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-[22px]" />
          <Skeleton className="h-24 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load attendance."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="card flex items-center gap-5 p-5">
            <ProgressRing percent={data?.summary.percent ?? 0} size={92} label="Attendance percentage" />
            <div className="grid flex-1 grid-cols-3 gap-2 text-center">
              <div>
                <p className="tabular text-[20px] font-extrabold text-ink">{data?.summary.total ?? 0}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Total days</p>
              </div>
              <div>
                <p className="tabular text-[20px] font-extrabold text-ok">{data?.summary.present ?? 0}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Present</p>
              </div>
              <div>
                <p className="tabular text-[20px] font-extrabold text-err">{data?.summary.absent ?? 0}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Absent</p>
              </div>
            </div>
          </div>

          {/* Holidays */}
          <section className="mt-6">
            <div className="mb-2.5 flex items-center gap-2">
              <CalendarDays size={15} className="text-ink-3" />
              <h2 className="text-[15px] font-bold tracking-tight text-ink">Upcoming gym holidays</h2>
            </div>
            {!data?.holidays.length ? (
              <div className="card p-4 text-[13.5px] text-ink-2">No upcoming holidays — the gym stays open.</div>
            ) : (
              <div className="space-y-2.5">
                {data.holidays.map((h) => {
                  const days = daysUntil(h.date);
                  return (
                    <div key={h.id} className="card flex items-center gap-3.5 p-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-warn/10 text-warn">
                        <CalendarDays size={19} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-ink">{h.name}</p>
                        <p className="truncate text-[12.5px] text-ink-2">{h.reason || "Gym closed"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular text-[13.5px] font-bold text-ink">{fmtDate(h.date)}</p>
                        <Badge tone="warn" className="mt-1">
                          {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* History */}
          <section className="mt-6">
            <div className="mb-2.5 flex items-center gap-2">
              <CalendarCheck2 size={15} className="text-ink-3" />
              <h2 className="text-[15px] font-bold tracking-tight text-ink">History</h2>
            </div>
            {!data?.records.length ? (
              <EmptyState
                icon={<CalendarCheck2 size={20} />}
                title="No attendance records yet"
                hint="Your trainer marks attendance during sessions and it shows up here."
              />
            ) : (
              <div className="card divide-y divide-line overflow-hidden">
                {data.records.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 p-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-xl ${
                          r.status === "present" ? "bg-ok/10 text-ok" : "bg-err/10 text-err"
                        }`}
                      >
                        {r.status === "present" ? <CheckCircle2 size={17} /> : <CircleX size={17} />}
                      </span>
                      <div>
                        <p className="text-[13.5px] font-semibold text-ink">{r.status === "present" ? "Present" : "Absent"}</p>
                        <p className="tabular text-[12px] text-ink-2">{fmtDate(r.date)}</p>
                      </div>
                    </div>
                    <Badge tone={r.status === "present" ? "ok" : "err"}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
