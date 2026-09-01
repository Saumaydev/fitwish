"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, ClipboardList, X } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, timeAgo } from "@/lib/format";
import { Avatar, Badge, Button, EmptyState, PageHeader, Skeleton } from "@/components/ui/core";
import { ConfirmDialog } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import type { TrainerRequestDTO } from "@/lib/types";

export default function TrainerRequests() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<{ requests: TrainerRequestDTO[] }>("/api/trainer?action=requests", {
    refreshInterval: 20000,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const pending = (data?.requests ?? []).filter((r) => r.status === "pending");
  const past = (data?.requests ?? []).filter((r) => r.status !== "pending");

  const accept = async (id: string) => {
    setBusyId(id);
    try {
      await api("/api/trainer", { method: "POST", body: { action: "acceptRequest", id } });
      toast("success", "Client accepted — they're in My Clients now.");
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to accept the request.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async () => {
    if (!rejectId) return;
    setBusyId(rejectId);
    try {
      await api("/api/trainer", { method: "POST", body: { action: "rejectRequest", id: rejectId } });
      toast("success", "Request declined.");
      setRejectId(null);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to reject the request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Client Requests" subtitle={pending.length ? `${pending.length} waiting for your decision` : "All caught up"} />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-[22px]" />
          <Skeleton className="h-28 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load requests."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {pending.length === 0 && (
            <EmptyState icon={<ClipboardList size={20} />} title="No pending requests" hint="When a member wants to train with you, it shows up here." />
          )}

          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="card border-brand/25 p-4">
                <div className="flex items-center gap-3.5">
                  <Avatar name={r.userName} src={r.userPhoto} size={46} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-bold text-ink">{r.userName}</p>
                    <p className="text-[12.5px] text-ink-2">
                      wants to be your client · <span className="tabular">{timeAgo(r.createdAt)}</span>
                    </p>
                  </div>
                  <Badge tone="warn">Pending</Badge>
                </div>
                <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                  <Button onClick={() => accept(r.id)} loading={busyId === r.id}>
                    <Check size={15} /> Accept
                  </Button>
                  <Button variant="outline" className="!border-err/30 !text-err" onClick={() => setRejectId(r.id)}>
                    <X size={15} /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {past.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2.5 text-[15px] font-bold tracking-tight text-ink">Past requests</h2>
              <div className="card divide-y divide-line overflow-hidden">
                {past.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3.5">
                    <Avatar name={r.userName} src={r.userPhoto} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold text-ink">{r.userName}</p>
                      <p className="tabular text-[12px] text-ink-2">{fmtDate(r.createdAt)}</p>
                    </div>
                    <Badge tone={r.status === "accepted" ? "ok" : "err"}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(rejectId)}
        onClose={() => setRejectId(null)}
        onConfirm={reject}
        loading={busyId === rejectId}
        title="Decline this request?"
        body="The member will be notified and can request another trainer."
        confirmLabel="Decline request"
        danger
      />
    </div>
  );
}
