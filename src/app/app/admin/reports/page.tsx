"use client";

import { useState } from "react";
import useSWR from "swr";
import { CircleAlert, FolderOpen } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, timeAgo } from "@/lib/format";
import { REPORT_TYPE_LABELS } from "@/lib/constants";
import { Badge, Button, EmptyState, PageHeader, Segmented, Skeleton } from "@/components/ui/core";
import { BottomSheet } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import type { ReportDTO } from "@/lib/types";

type Filter = "all" | "open" | "pending" | "resolved";

export default function AdminReports() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("open");
  const { data, error, isLoading, mutate } = useSWR<{ reports: ReportDTO[] }>(`/api/admin?action=reports&filter=${filter}`, {
    refreshInterval: 30000,
  });
  const [active, setActive] = useState<ReportDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const setStatus = async (id: string, status: "open" | "resolved") => {
    setBusy(true);
    try {
      await api("/api/admin", { method: "POST", body: { action: "updateReport", id, status } });
      toast("success", status === "resolved" ? "Report resolved — the user was notified." : "Report opened.");
      setActive(null);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to update the report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Problems reported by members and trainers" />

      <Segmented
        className="mb-4 max-w-full overflow-x-auto hide-scrollbar [&>button]:shrink-0"
        options={[
          { value: "open", label: "Open" },
          { value: "pending", label: "Pending" },
          { value: "resolved", label: "Resolved" },
          { value: "all", label: "All" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-24 w-full rounded-[22px]" />
          <Skeleton className="h-24 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load reports."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : !data?.reports.length ? (
        <EmptyState icon={<CircleAlert size={20} />} title="No reports here" hint="Member reports will appear in this list." />
      ) : (
        <div className="space-y-2.5">
          {data.reports.map((r) => (
            <button key={r.id} onClick={() => setActive(r)} className="card card-press block w-full p-4 text-left">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    r.status === "resolved" ? "bg-ok/10 text-ok" : r.status === "open" ? "bg-brand-soft text-brand" : "bg-warn/10 text-warn"
                  }`}
                >
                  <CircleAlert size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14px] font-bold text-ink">{r.userName}</p>
                    <Badge tone={r.status === "resolved" ? "ok" : r.status === "open" ? "brand" : "warn"}>{r.status}</Badge>
                  </div>
                  <p className="text-[12px] text-ink-2">
                    {REPORT_TYPE_LABELS[r.type] ?? r.type} · {r.userEmail}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-2">{r.description}</p>
                  <p className="tabular mt-1.5 text-[11.5px] text-ink-3">
                    {fmtDate(r.createdAt)} · {timeAgo(r.createdAt)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail sheet */}
      <BottomSheet open={Boolean(active)} onClose={() => !busy && setActive(null)} title="Report details">
        {active && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-bold text-ink">{active.userName}</p>
                <Badge tone={active.status === "resolved" ? "ok" : active.status === "open" ? "brand" : "warn"}>{active.status}</Badge>
              </div>
              <p className="mt-1 text-[12.5px] text-ink-2">
                {active.userEmail} · {REPORT_TYPE_LABELS[active.type] ?? active.type}
              </p>
              <p className="tabular mt-1 text-[11.5px] text-ink-3">{fmtDate(active.createdAt)}</p>
              <p className="mt-3 border-t border-line pt-3 text-[13.5px] leading-relaxed text-ink">{active.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {active.status !== "resolved" && (
                <Button variant="secondary" onClick={() => setStatus(active.id, "open")} loading={busy}>
                  <FolderOpen size={15} /> Mark open
                </Button>
              )}
              <Button onClick={() => setStatus(active.id, "resolved")} loading={busy} className={active.status === "resolved" ? "col-span-2" : ""}>
                Resolve
              </Button>
            </div>
            <p className="text-center text-[12px] text-ink-3">The member gets a notification when the status changes.</p>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
