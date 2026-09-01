"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, Dumbbell, Inbox, UserRound, Wallet, X } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, fmtMoney, timeAgo } from "@/lib/format";
import { Avatar, Badge, Button, EmptyState, PageHeader, Segmented, Skeleton } from "@/components/ui/core";
import { ConfirmDialog } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import type { PaymentDTO } from "@/lib/types";

interface RequestsBundle {
  members: { uid: string; name: string; email: string; phone: string | null; photoUrl: string | null; createdAt: string }[];
  trainers: {
    uid: string;
    name: string;
    qualification: string | null;
    experience: string | null;
    email: string | null;
    photoUrl: string | null;
    availability: string | null;
    createdAt: string;
  }[];
  payments: PaymentDTO[];
  trainerRequests: { id: string; userUid: string; trainerUid: string; userName: string; trainerName: string; createdAt: string }[];
}

type Tab = "members" | "trainers" | "payments" | "pairings";

export default function AdminRequests() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<RequestsBundle>("/api/admin?action=requests", { refreshInterval: 20000 });
  const [tab, setTab] = useState<Tab>("members");
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [rejectMember, setRejectMember] = useState<string | null>(null);

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

  const receivePayment = async (id: string) => {
    setBusyUid(id);
    try {
      await api("/api/admin", { method: "POST", body: { action: "markPaymentReceived", id } });
      toast("success", "Payment recorded — the member's due amount was updated.");
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to record the payment.");
    } finally {
      setBusyUid(null);
    }
  };

  const counts = {
    members: data?.members.length ?? 0,
    trainers: data?.trainers.length ?? 0,
    payments: data?.payments.length ?? 0,
    pairings: data?.trainerRequests.length ?? 0,
  };

  return (
    <div>
      <PageHeader title="Requests" subtitle="Approvals and payment confirmations" />

      <Segmented
        className="mb-4 max-w-full overflow-x-auto hide-scrollbar [&>button]:shrink-0"
        options={[
          { value: "members", label: `Members (${counts.members})` },
          { value: "trainers", label: `Trainers (${counts.trainers})` },
          { value: "payments", label: `Payments (${counts.payments})` },
          { value: "pairings", label: `Trainer requests (${counts.pairings})` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-24 w-full rounded-[22px]" />
          <Skeleton className="h-24 w-full rounded-[22px]" />
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
          {/* Member approvals */}
          {tab === "members" &&
            (data!.members.length === 0 ? (
              <EmptyState icon={<UserRound size={20} />} title="No member requests" hint="New member sign-ups appear here for your approval before they can sign in." />
            ) : (
              <div className="space-y-2.5">
                {data!.members.map((m) => (
                  <div key={m.uid} className="card p-4">
                    <div className="flex items-center gap-3.5">
                      <Avatar name={m.name} src={m.photoUrl} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-ink">{m.name}</p>
                        <p className="truncate text-[12.5px] text-ink-2">
                          {m.email}
                          {m.phone ? ` · ${m.phone}` : ""}
                        </p>
                        <p className="tabular text-[11.5px] text-ink-3">Requested {timeAgo(m.createdAt)}</p>
                      </div>
                      <Badge tone="warn">Pending</Badge>
                    </div>
                    <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                      <Button onClick={() => act("approveMember", m.uid, `${m.name} approved — they can now sign in.`)} loading={busyUid === m.uid}>
                        <Check size={15} /> Approve
                      </Button>
                      <Button variant="outline" className="!border-err/30 !text-err" onClick={() => setRejectMember(m.uid)}>
                        <X size={15} /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {/* Trainer approvals */}
          {tab === "trainers" &&
            (data!.trainers.length === 0 ? (
              <EmptyState icon={<Dumbbell size={20} />} title="No trainer applications" hint="New trainer registrations appear here for review." />
            ) : (
              <div className="space-y-2.5">
                {data!.trainers.map((t) => (
                  <div key={t.uid} className="card p-4">
                    <div className="flex items-center gap-3.5">
                      <Avatar name={t.name} src={t.photoUrl} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-ink">{t.name}</p>
                        <p className="truncate text-[12.5px] text-ink-2">
                          {t.qualification || "—"} · {t.experience || "—"} exp
                        </p>
                        {t.email && <p className="truncate text-[12px] text-ink-3">{t.email}</p>}
                      </div>
                    </div>
                    <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                      <Button onClick={() => act("approveTrainer", t.uid, `${t.name} approved and activated.`)} loading={busyUid === t.uid}>
                        <Check size={15} /> Approve
                      </Button>
                      <Button variant="outline" className="!border-err/30 !text-err" onClick={() => act("rejectTrainer", t.uid, "Trainer application rejected.")}>
                        <X size={15} /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {/* Payments */}
          {tab === "payments" &&
            (data!.payments.length === 0 ? (
              <EmptyState icon={<Wallet size={20} />} title="No payment requests" hint="When members request a renewal payment, it appears here." />
            ) : (
              <div className="space-y-2.5">
                {data!.payments.map((p) => (
                  <div key={p.id} className="card p-4">
                    <div className="flex items-center gap-3.5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-warn/10 text-warn">
                        <Wallet size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-ink">{p.userName}</p>
                        <p className="tabular text-[12.5px] text-ink-2">
                          {fmtMoney(p.amount)} · requested {timeAgo(p.createdAt)}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => receivePayment(p.id)} loading={busyUid === p.id}>
                        <Check size={14} /> Received
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {/* Trainer pairings */}
          {tab === "pairings" &&
            (data!.trainerRequests.length === 0 ? (
              <EmptyState icon={<Inbox size={20} />} title="No open trainer requests" hint="Member → trainer requests are visible here. Trainers accept them from their own app." />
            ) : (
              <div className="card divide-y divide-line overflow-hidden">
                {data!.trainerRequests.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-bold text-ink">
                        {r.userName} <span className="font-medium text-ink-2">→</span> {r.trainerName}
                      </p>
                      <p className="tabular text-[11.5px] text-ink-3">Requested {timeAgo(r.createdAt)}</p>
                    </div>
                    <Badge tone="warn">Pending with trainer</Badge>
                  </div>
                ))}
              </div>
            ))}
        </>
      )}

      <ConfirmDialog
        open={Boolean(rejectMember)}
        onClose={() => setRejectMember(null)}
        onConfirm={() => rejectMember && act("rejectMember", rejectMember, "Member registration rejected.").then(() => setRejectMember(null))}
        title="Reject this member?"
        body="They won't be able to sign in to the app."
        confirmLabel="Reject registration"
        danger
      />
    </div>
  );
}
