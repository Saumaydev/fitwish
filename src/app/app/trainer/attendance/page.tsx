"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { CalendarCheck2, Check, X } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, localDateStr } from "@/lib/format";
import { Avatar, Badge, Button, EmptyState, Field, Input, PageHeader, Segmented, Skeleton } from "@/components/ui/core";
import { useToast } from "@/components/ui/toast";
import type { ClientDTO } from "@/lib/types";

export default function TrainerAttendance() {
  const toast = useToast();
  const { data, error, isLoading } = useSWR<{ clients: ClientDTO[] }>("/api/trainer?action=clients");
  const [userUid, setUserUid] = useState("");
  const [date, setDate] = useState(localDateStr());
  const [status, setStatus] = useState<"present" | "absent">("present");
  const [busy, setBusy] = useState(false);

  const client = useMemo(() => data?.clients.find((c) => c.uid === userUid) ?? data?.clients[0] ?? null, [data, userUid]);
  const today = localDateStr();
  const isToday = date === today;
  const future = date > today;

  const save = async () => {
    if (!client || busy) return;
    setBusy(true);
    try {
      await api("/api/trainer", {
        method: "POST",
        body: { action: "markAttendance", userUid: client.uid, date, status },
      });
      toast("success", `${client.name} marked ${status} for ${fmtDate(date)}.`);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to save attendance. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark your clients for today" />

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-[22px]" />
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load your clients."}
        </div>
      ) : !client ? (
        <EmptyState icon={<CalendarCheck2 size={20} />} title="No clients to mark" hint="Assignments from the admin or accepted requests will appear here." />
      ) : (
        <div className="space-y-4">
          {/* Client picker */}
          <div className="card p-4">
            <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-3">Select client</p>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {(data?.clients ?? []).map((c) => {
                const active = client.uid === c.uid;
                return (
                  <button
                    key={c.uid}
                    onClick={() => setUserUid(c.uid)}
                    className={`flex shrink-0 items-center gap-2 rounded-2xl border p-2 pr-3.5 transition ${
                      active ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-surface-2"
                    }`}
                  >
                    <Avatar name={c.name} src={c.photoUrl} size={30} />
                    <span className={`text-[12.5px] font-bold ${active ? "text-brand" : "text-ink"}`}>{c.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <Field label="Date" hint={future ? "Future dates aren't usually needed — check the date." : undefined}>
              <Input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Attendance date" />
            </Field>

            <div className="mt-4">
              <p className="field-label">Status</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setStatus("present")}
                  aria-pressed={status === "present"}
                  className={`flex h-14 items-center justify-center gap-2 rounded-2xl border-2 text-[14px] font-bold transition ${
                    status === "present" ? "border-ok bg-ok/10 text-ok" : "border-line bg-surface-2 text-ink-2"
                  }`}
                >
                  <Check size={17} /> Present
                </button>
                <button
                  onClick={() => setStatus("absent")}
                  aria-pressed={status === "absent"}
                  className={`flex h-14 items-center justify-center gap-2 rounded-2xl border-2 text-[14px] font-bold transition ${
                    status === "absent" ? "border-err bg-err/10 text-err" : "border-line bg-surface-2 text-ink-2"
                  }`}
                >
                  <X size={17} /> Absent
                </button>
              </div>
            </div>

            <Button block size="lg" className="mt-5" onClick={save} loading={busy} disabled={future}>
              <CalendarCheck2 size={16} /> Save for {client.name.split(" ")[0]}
            </Button>
            {isToday && (
              <p className="mt-3 text-center text-[12px] text-ink-3">Saving again for the same day updates the record — no duplicates.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
