"use client";

import { useState } from "react";
import useSWR from "swr";
import { Award, Briefcase, Check, Clock3, Dumbbell, Power, Trash2, X } from "lucide-react";
import { api } from "@/lib/client";
import { Avatar, Badge, Button, EmptyState, PageHeader, Skeleton } from "@/components/ui/core";
import { ConfirmDialog } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import type { AdminTrainerDTO } from "@/lib/types";

export default function AdminTrainers() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<{ trainers: AdminTrainerDTO[] }>("/api/admin?action=trainers", {
    refreshInterval: 30000,
  });
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [rejectUid, setRejectUid] = useState<string | null>(null);
  const [deactivateUid, setDeactivateUid] = useState<string | null>(null);
  const [deleteUid, setDeleteUid] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteTrainer = async () => {
    if (!deleteUid) return;
    setDeleting(true);
    try {
      await api("/api/admin", { method: "POST", body: { action: "deleteTrainer", uid: deleteUid } });
      toast("success", "Trainer deleted permanently.");
      setDeleteUid(null);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to delete this trainer.");
    } finally {
      setDeleting(false);
    }
  };

  const act = async (action: string, uid: string, successMsg: string) => {
    setBusyUid(uid);
    try {
      await api("/api/admin", { method: "POST", body: { action, uid } });
      toast("success", successMsg);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to complete the action.");
    } finally {
      setBusyUid(null);
    }
  };

  const pending = (data?.trainers ?? []).filter((t) => t.trainer.approvalStatus === "pending");
  const others = (data?.trainers ?? []).filter((t) => t.trainer.approvalStatus !== "pending");

  return (
    <div>
      <PageHeader
        title="Trainers"
        subtitle={
          data
            ? `${data.trainers.length} total · ${data.trainers.filter((t) => t.trainer.isActive).length} active · ${pending.length} pending`
            : "Trainer management"
        }
      />

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-24 w-full rounded-[22px]" />
          <Skeleton className="h-24 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load trainers."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Pending approvals */}
          {pending.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2.5 text-[15px] font-bold tracking-tight text-ink">Awaiting approval</h2>
              <div className="space-y-2.5">
                {pending.map((t) => (
                  <div key={t.trainer.uid} className="card border-warn/30 p-4">
                    <div className="flex items-center gap-3.5">
                      <Avatar name={t.trainer.name} src={t.trainer.photoUrl} size={46} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14.5px] font-bold text-ink">{t.trainer.name}</p>
                        <p className="truncate text-[12.5px] text-ink-2">
                          {t.trainer.qualification || "—"} · {t.trainer.experience || "—"} experience
                        </p>
                        {t.email && <p className="truncate text-[12px] text-ink-3">{t.email}</p>}
                      </div>
                    </div>
                    <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                      <Button onClick={() => act("approveTrainer", t.trainer.uid, "Trainer approved and activated.")} loading={busyUid === t.trainer.uid}>
                        <Check size={15} /> Accept
                      </Button>
                      <Button variant="outline" className="!border-err/30 !text-err" onClick={() => setRejectUid(t.trainer.uid)}>
                        <X size={15} /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All trainers */}
          <section>
            <h2 className="mb-2.5 text-[15px] font-bold tracking-tight text-ink">All trainers</h2>
            {others.length === 0 ? (
              <EmptyState icon={<Dumbbell size={20} />} title="No trainers yet" hint="Trainer applications will appear here for review." />
            ) : (
              <div className="space-y-2.5">
                {others.map((t) => (
                  <div key={t.trainer.uid} className="card p-4">
                    <div className="flex items-start gap-3.5">
                      <Avatar name={t.trainer.name} src={t.trainer.photoUrl} size={46} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[14.5px] font-bold text-ink">{t.trainer.name}</p>
                          {t.trainer.isActive ? <Badge tone="ok">Active</Badge> : <Badge tone="err">Inactive</Badge>}
                          {t.trainer.approvalStatus === "rejected" && <Badge tone="err">Rejected</Badge>}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-2">
                          <Award size={12} /> {t.trainer.qualification || "—"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-2">
                          <Briefcase size={12} /> {t.trainer.experience || "—"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-2">
                          <Clock3 size={12} /> {t.trainer.availability || "—"} · {t.clientCount} clients
                        </p>
                      </div>
                    </div>
                    {t.trainer.isActive ? (
                      <Button variant="outline" size="sm" className="mt-3 w-full !border-err/30 !text-err" onClick={() => setDeactivateUid(t.trainer.uid)}>
                        <Power size={13} /> Deactivate
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => act("activateTrainer", t.trainer.uid, "Trainer reactivated.")} loading={busyUid === t.trainer.uid}>
                        <Power size={13} /> Reactivate
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="mt-2 w-full !border-err/40 !text-err" onClick={() => setDeleteUid(t.trainer.uid)}>
                      <Trash2 size={13} /> Delete permanently
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={Boolean(rejectUid)}
        onClose={() => setRejectUid(null)}
        onConfirm={() => rejectUid && act("rejectTrainer", rejectUid, "Trainer application rejected.").then(() => setRejectUid(null))}
        title="Reject this trainer?"
        body="The trainer's access will be revoked and they'll be notified."
        confirmLabel="Reject application"
        danger
      />

      <ConfirmDialog
        open={Boolean(deactivateUid)}
        onClose={() => setDeactivateUid(null)}
        onConfirm={() => deactivateUid && act("deactivateTrainer", deactivateUid, "Trainer deactivated — they lose access immediately.").then(() => setDeactivateUid(null))}
        title="Deactivate this trainer?"
        body="They will immediately lose access to the trainer panel. Their profile and history are kept."
        confirmLabel="Deactivate trainer"
        danger
      />

      <ConfirmDialog
        open={Boolean(deleteUid)}
        onClose={() => setDeleteUid(null)}
        onConfirm={deleteTrainer}
        loading={deleting}
        title="Delete this trainer permanently?"
        body="The trainer account and all their records are erased, and assigned members are unlinked. This action cannot be undone."
        confirmLabel="Delete permanently"
        danger
      />
    </div>
  );
}
