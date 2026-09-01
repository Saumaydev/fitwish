"use client";

import useSWR from "swr";
import { ShieldCheck } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { Badge, EmptyState, PageHeader, Skeleton } from "@/components/ui/core";
import type { AuditDTO } from "@/lib/types";

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
  report_open: "Opened report",
  report_resolved: "Resolved report",
  report_pending: "Set report pending",
  mark_trainer_attendance: "Marked trainer attendance",
  create_holiday: "Added holiday",
  update_holiday: "Updated holiday",
  delete_holiday: "Removed holiday",
  send_notification: "Sent announcement",
};

export default function AdminAudit() {
  const { data, error, isLoading, mutate } = useSWR<{ logs: AuditDTO[] }>("/api/admin?action=audit", { refreshInterval: 30000 });

  return (
    <div>
      <PageHeader title="Activity Log" subtitle="Auditable record of important admin actions" />

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-14 w-full rounded-[22px]" />
          <Skeleton className="h-14 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load the log."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : !data?.logs.length ? (
        <EmptyState icon={<ShieldCheck size={20} />} title="No activity yet" hint="Trainer approvals, assignments, membership updates and report resolutions are logged here." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {data.logs.map((l) => (
            <div key={l.id} className="flex items-center gap-3 p-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
                <ShieldCheck size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-ink">{ACTION_LABELS[l.action] ?? l.action}</p>
                <p className="text-[12px] text-ink-2">
                  {l.adminName ?? "Admin"} · target: {l.targetType}
                  {l.targetId ? ` #${l.targetId.slice(0, 8)}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular text-[11.5px] font-semibold text-ink-2">{fmtDateTime(l.createdAt)}</p>
                <Badge tone="neutral" className="mt-1">
                  {l.targetType}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
