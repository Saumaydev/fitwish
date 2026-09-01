"use client";

import { useState } from "react";
import useSWR from "swr";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, localDateStr } from "@/lib/format";
import { Badge, Button, EmptyState, Field, Input, PageHeader, Skeleton } from "@/components/ui/core";
import { BottomSheet, ConfirmDialog } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import type { HolidayDTO } from "@/lib/types";

export default function AdminHolidays() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<{ holidays: HolidayDTO[] }>("/api/admin?action=holidays");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HolidayDTO | null>(null);
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(localDateStr());
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setReason("");
    setDate(localDateStr());
    setOpen(true);
  };

  const openEdit = (h: HolidayDTO) => {
    setEditing(h);
    setName(h.name);
    setReason(h.reason ?? "");
    setDate(h.date);
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await api("/api/admin", {
        method: "POST",
        body: {
          action: editing ? "updateHoliday" : "createHoliday",
          id: editing?.id,
          name,
          reason,
          date,
        },
      });
      toast("success", editing ? "Holiday updated." : "Holiday added.");
      setOpen(false);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to save the holiday.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    setBusy(true);
    try {
      await api("/api/admin", { method: "POST", body: { action: "deleteHoliday", id: deleteId } });
      toast("success", "Holiday removed.");
      setDeleteId(null);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to remove the holiday.");
    } finally {
      setBusy(false);
    }
  };

  const today = localDateStr();
  const upcoming = (data?.holidays ?? []).filter((h) => h.date >= today);
  const past = (data?.holidays ?? []).filter((h) => h.date < today);

  return (
    <div>
      <PageHeader
        title="Gym Holidays"
        subtitle="Members see upcoming closures on their attendance screen"
        right={
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} /> Add holiday
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-16 w-full rounded-[22px]" />
          <Skeleton className="h-16 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load holidays."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-2.5 text-[15px] font-bold tracking-tight text-ink">Upcoming</h2>
            {upcoming.length === 0 ? (
              <EmptyState icon={<CalendarDays size={20} />} title="No upcoming holidays" hint="The gym stays open. Add a closure day when needed." />
            ) : (
              <div className="space-y-2.5">
                {upcoming.map((h) => (
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
                        Closed
                      </Badge>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button onClick={() => openEdit(h)} aria-label="Edit holiday" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteId(h.id)} aria-label="Delete holiday" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-err">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2.5 text-[15px] font-bold tracking-tight text-ink">Past</h2>
              <div className="card divide-y divide-line overflow-hidden">
                {past.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-bold text-ink">{h.name}</p>
                      <p className="tabular text-[12px] text-ink-2">{fmtDate(h.date)}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => openEdit(h)} aria-label="Edit" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteId(h.id)} aria-label="Delete" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-err">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Create / edit sheet */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title={editing ? "Edit holiday" : "Add holiday"}>
        <div className="space-y-4">
          <Field label="Holiday name">
            <Input placeholder="Annual Gym Maintenance" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Reason" hint="Optional — shown to members.">
            <Input placeholder="Equipment service day" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Button block size="lg" onClick={save} loading={busy}>
            {editing ? "Save changes" : "Add holiday"}
          </Button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete this holiday?"
        body="Members will no longer see this closure date."
        confirmLabel="Delete holiday"
        danger
      />
    </div>
  );
}
