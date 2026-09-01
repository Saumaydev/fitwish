"use client";

import { useState } from "react";
import useSWR from "swr";
import { CalendarCheck2, CheckCircle2, CircleX, History, Users } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, localDateStr } from "@/lib/format";
import { Avatar, Badge, EmptyState, Field, Input, PageHeader, Skeleton, StatCard } from "@/components/ui/core";
import { useToast } from "@/components/ui/toast";
import type { TrainerAttendanceDayDTO, TrainerAttendanceHistoryDTO } from "@/lib/types";

export default function AdminTrainerAttendance() {
  const toast = useToast();
  const [date, setDate] = useState(localDateStr());
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<TrainerAttendanceDayDTO>(
    `/api/admin?action=trainerAttendance&date=${date}`
  );
  const history = useSWR<{ records: TrainerAttendanceHistoryDTO[] }>("/api/admin?action=trainerAttendanceHistory");

  const mark = async (trainerUid: string, status: "present" | "absent") => {
    setBusyUid(trainerUid);
    try {
      await api("/api/admin", { method: "POST", body: { action: "markTrainerAttendance", trainerUid, date, status } });
      toast("success", `Marked ${status}.`);
      mutate();
      history.mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to mark attendance.");
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div>
      <PageHeader title="Trainer attendance" subtitle="Mark your trainers present or absent for any day" />

      <div className="card p-4">
        <Field label="Attendance date" htmlFor="ta-date">
          <Input id="ta-date" type="date" value={date} max={localDateStr()} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <StatCard icon={<CheckCircle2 size={18} />} label="Present" value={data?.present ?? 0} sub={fmtDate(date)} tone="ok" />
        <StatCard icon={<CircleX size={18} />} label="Absent" value={data?.absent ?? 0} sub={fmtDate(date)} tone="warn" />
        <StatCard icon={<Users size={18} />} label="Unmarked" value={data?.unmarked ?? 0} sub="pending" tone="neutral" />
      </div>

      {error && (
        <div className="card mt-4 border-err/25 p-4 text-[13.5px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load trainer attendance."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      )}

      <section className="mt-6">
        <div className="mb-2.5 flex items-center gap-2">
          <CalendarCheck2 size={15} className="text-ink-3" />
          <h2 className="text-[15px] font-bold tracking-tight text-ink">Roll call — {fmtDate(date)}</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-[22px]" />
            <Skeleton className="h-20 w-full rounded-[22px]" />
          </div>
        ) : !data?.rows.length ? (
          <EmptyState icon={<Users size={20} />} title="No approved trainers" hint="Approve a trainer first — they'll show up here for attendance." />
        ) : (
          <div className="space-y-2.5">
            {data.rows.map((t) => (
              <div key={t.trainerUid} className="card flex items-center gap-3.5 p-4">
                <Avatar name={t.name} src={t.photoUrl} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-ink">{t.name}</p>
                  <p className="text-[12.5px] text-ink-2">
                    {t.status ? (t.status === "present" ? "Marked present" : "Marked absent") : "Not marked yet"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => mark(t.trainerUid, "present")}
                    disabled={busyUid === t.trainerUid}
                    aria-label={`Mark ${t.name} present`}
                    aria-pressed={t.status === "present"}
                    className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                      t.status === "present" ? "bg-ok/15 text-ok" : "bg-surface-2 text-ink-3 hover:text-ok"
                    }`}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                  <button
                    onClick={() => mark(t.trainerUid, "absent")}
                    disabled={busyUid === t.trainerUid}
                    aria-label={`Mark ${t.name} absent`}
                    aria-pressed={t.status === "absent"}
                    className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                      t.status === "absent" ? "bg-err/15 text-err" : "bg-surface-2 text-ink-3 hover:text-err"
                    }`}
                  >
                    <CircleX size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="mb-2.5 flex items-center gap-2">
          <History size={15} className="text-ink-3" />
          <h2 className="text-[15px] font-bold tracking-tight text-ink">Recent records</h2>
        </div>
        {!history.data?.records.length ? (
          <div className="card p-4 text-[13.5px] text-ink-2">No trainer attendance recorded yet.</div>
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {history.data.records.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3.5">
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">{r.trainerName}</p>
                  <p className="tabular text-[12px] text-ink-2">{fmtDate(r.date)}</p>
                </div>
                <Badge tone={r.status === "present" ? "ok" : "err"}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
