"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarCheck2, Dumbbell, IdCard, Power, Save, Trash2, UserRound, Wallet } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, fmtMoney, localDateStr, addMonths, membershipState, MEMBERSHIP_STATE_LABEL } from "@/lib/format";
import { MEMBERSHIP_PLANS } from "@/lib/constants";
import { Avatar, Badge, Button, Field, Input, PageHeader, Segmented, Select, Skeleton } from "@/components/ui/core";
import { ConfirmDialog } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import type { AdminMemberDTO, TrainerDTO } from "@/lib/types";

type Tab = "overview" | "membership" | "trainer" | "attendance";

export default function AdminMemberDetail() {
  const { uid } = useParams<{ uid: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<AdminMemberDTO>(`/api/admin?action=member&uid=${uid}`, { refreshInterval: 30000 });
  const { data: trainersData } = useSWR<{ trainers: TrainerDTO[] }>("/api/admin?action=approvedTrainers");

  const [tab, setTab] = useState<Tab>("overview");

  /* Membership form */
  const [plan, setPlan] = useState("Gold");
  const [startDate, setStartDate] = useState(localDateStr());
  const [duration, setDuration] = useState("3");
  const [total, setTotal] = useState("");
  const [paid, setPaid] = useState("");
  const [mBusy, setMBusy] = useState(false);

  /* Trainer assignment */
  const [trainerUid, setTrainerUid] = useState("");
  const [tBusy, setTBusy] = useState(false);

  /* Deactivate / reactivate */
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [aBusy, setABusy] = useState(false);

  /* Permanent delete */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dBusy, setDBusy] = useState(false);

  const deleteMember = async () => {
    setDBusy(true);
    try {
      await api("/api/admin", { method: "POST", body: { action: "deleteMember", uid } });
      toast("success", "Member deleted permanently.");
      setDeleteOpen(false);
      router.push("/app/admin/members");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to delete this member.");
    } finally {
      setDBusy(false);
    }
  };

  const toggleActive = async (action: "deactivateMember" | "activateMember", successMsg: string) => {
    setABusy(true);
    try {
      await api("/api/admin", { method: "POST", body: { action, uid } });
      toast("success", successMsg);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to complete the action.");
    } finally {
      setABusy(false);
    }
  };

  useMemo(() => {
    if (data) {
      setPlan(data.membership?.plan ?? "Gold");
      setStartDate(data.membership?.startDate ?? localDateStr());
      setDuration(String(data.membership?.durationMonths ?? 3));
      setTotal(String(data.membership?.totalAmount ?? ""));
      setPaid(String(data.membership?.paidAmount ?? ""));
      setTrainerUid(data.assignedTrainer?.uid ?? "");
    }
  }, [data]);

  const previewExpiry = addMonths(startDate, Math.max(1, parseInt(duration) || 1));
  const previewDue = Math.max(0, (parseInt(total) || 0) - (parseInt(paid) || 0));

  const saveMembership = async () => {
    setMBusy(true);
    try {
      await api("/api/admin", {
        method: "POST",
        body: {
          action: "updateMembership",
          userUid: uid,
          membership: {
            plan,
            startDate,
            durationMonths: parseInt(duration) || 1,
            totalAmount: parseInt(total) || 0,
            paidAmount: parseInt(paid) || 0,
          },
        },
      });
      toast("success", "Membership updated — the member sees it immediately.");
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to update the membership.");
    } finally {
      setMBusy(false);
    }
  };

  const saveTrainer = async () => {
    setTBusy(true);
    try {
      await api("/api/admin", { method: "POST", body: { action: "assignTrainer", userUid: uid, trainerUid } });
      toast("success", "Trainer assigned — visible in the member's app and the trainer's clients.");
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to assign the trainer.");
    } finally {
      setTBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-44 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-[22px]" />
        <Skeleton className="h-64 w-full rounded-[22px]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <Link href="/app/admin/members" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink">
          <ArrowLeft size={15} /> Back to members
        </Link>
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Member not found."}
        </div>
      </div>
    );
  }

  const m = data.membership;
  const mState = membershipState(m);

  return (
    <div>
      <Link href="/app/admin/members" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft size={15} /> Back to members
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={data.user.name} src={data.user.photoUrl} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-extrabold tracking-tight text-ink">{data.user.name}</h1>
          <p className="truncate text-[12.5px] text-ink-2">
            {data.user.email}
            {data.user.phone ? ` · ${data.user.phone}` : ""}
          </p>
        </div>
        <Badge tone={data.user.approvalStatus === "approved" ? "ok" : data.user.approvalStatus === "pending" ? "warn" : "err"}>
          {data.user.approvalStatus}
        </Badge>
      </div>

      {data.user.approvalStatus !== "pending" &&
        (data.user.approvalStatus === "approved" ? (
          <Button variant="outline" size="sm" className="mt-3 w-full !border-err/30 !text-err" onClick={() => setDeactivateOpen(true)}>
            <Power size={13} /> Deactivate member
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="mt-3 w-full"
            onClick={() => toggleActive("activateMember", "Member reactivated — they can sign in again.")}
            loading={aBusy}
          >
            <Power size={13} /> Reactivate member
          </Button>
        ))}

      <Segmented
        className="mt-5 w-full [&>button]:flex-1"
        options={[
          { value: "overview", label: "Overview" },
          { value: "membership", label: "Membership" },
          { value: "trainer", label: "Trainer" },
          { value: "attendance", label: "Stats" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-4 space-y-4">
        {tab === "overview" && (
          <>
            <div className="card p-5">
              <div className="flex items-center gap-2">
                <IdCard size={16} className="text-brand" />
                <h2 className="text-[15px] font-bold tracking-tight text-ink">Current membership</h2>
              </div>
              {m ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Plan</p>
                    <p className="mt-0.5 text-[14px] font-bold text-ink">{m.plan}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Status</p>
                    <p className="mt-0.5 text-[14px] font-bold text-ink">{MEMBERSHIP_STATE_LABEL[mState]}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Start</p>
                    <p className="tabular mt-0.5 text-[14px] font-bold text-ink">{fmtDate(m.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Expiry</p>
                    <p className="tabular mt-0.5 text-[14px] font-bold text-ink">{fmtDate(m.expiryDate)}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[13.5px] text-ink-2">No membership yet — set one up from the Membership tab.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="card p-4 text-center">
                <p className="tabular text-[18px] font-extrabold text-ink">{data.assignedTrainer?.name ?? "—"}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Trainer</p>
              </div>
              <div className="card p-4 text-center">
                <p className="tabular text-[18px] font-extrabold text-ink">{data.user.sessionTime ?? "—"}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Session time</p>
              </div>
            </div>
            {data.user.emergencyContact?.name && (
              <div className="card p-4 text-[13.5px] text-ink-2">
                <span className="font-bold text-ink">Emergency contact:</span> {data.user.emergencyContact.name}
                {data.user.emergencyContact.phone ? ` · ${data.user.emergencyContact.phone}` : ""}
              </div>
            )}
            <div className="card border-err/25 p-5">
              <div className="flex items-center gap-2">
                <Trash2 size={16} className="text-err" />
                <h2 className="text-[15px] font-bold tracking-tight text-ink">Delete member</h2>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                Permanently removes this member and everything linked to them — membership, payments, attendance, workout and diet plans,
                progress and notifications. This cannot be undone.
              </p>
              <Button variant="outline" size="sm" className="mt-3.5 w-full !border-err/40 !text-err" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={13} /> Delete permanently
              </Button>
            </div>
          </>
        )}

        {tab === "membership" && (
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Wallet size={16} className="text-brand" />
              <h2 className="text-[15px] font-bold tracking-tight text-ink">Membership & payments</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plan">
                  <Select value={plan} onChange={(e) => setPlan(e.target.value)}>
                    {MEMBERSHIP_PLANS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Duration (months)">
                  <Input type="number" inputMode="numeric" min={1} max={60} value={duration} onChange={(e) => setDuration(e.target.value)} />
                </Field>
                <Field label="Start date">
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </Field>
                <Field label="Expiry (auto)">
                  <Input value={fmtDate(previewExpiry)} disabled />
                </Field>
                <Field label="Total amount (₹)">
                  <Input type="number" inputMode="numeric" min={0} placeholder="6000" value={total} onChange={(e) => setTotal(e.target.value)} />
                </Field>
                <Field label="Paid amount (₹)">
                  <Input type="number" inputMode="numeric" min={0} placeholder="4000" value={paid} onChange={(e) => setPaid(e.target.value)} />
                </Field>
              </div>

              <div className="rounded-2xl bg-surface-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-ink-2">Payment due (auto-calculated)</span>
                  <span className="tabular text-[17px] font-extrabold text-brand">{fmtMoney(previewDue)}</span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
                  The member sees this on their Home. {previewDue === 0 ? "Their renew button disappears while due is zero." : "They can request a payment from the admin panel."}
                </p>
              </div>

              <Button block size="lg" onClick={saveMembership} loading={mBusy}>
                <Save size={16} /> Save membership
              </Button>
            </div>
          </div>
        )}

        {tab === "trainer" && (
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserRound size={16} className="text-brand" />
              <h2 className="text-[15px] font-bold tracking-tight text-ink">Trainer assignment</h2>
            </div>
            <p className="mb-4 text-[13px] leading-relaxed text-ink-2">
              This drives the member&apos;s <span className="font-semibold text-ink">Your Trainer</span> card and the trainer&apos;s{" "}
              <span className="font-semibold text-ink">My Clients</span> — a single source of truth.
            </p>
            <Field label="Assigned trainer">
              <Select value={trainerUid} onChange={(e) => setTrainerUid(e.target.value)}>
                <option value="">— Not assigned —</option>
                {(trainersData?.trainers ?? []).map((t) => (
                  <option key={t.uid} value={t.uid}>
                    {t.name} · {t.qualification ?? "Trainer"}
                  </option>
                ))}
              </Select>
            </Field>
            <Button block size="lg" className="mt-4" onClick={saveTrainer} loading={tBusy}>
              <Save size={16} /> Save assignment
            </Button>
          </div>
        )}

        {tab === "attendance" && (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="card p-4 text-center">
                <p className="tabular text-[20px] font-extrabold text-ink">{data.attendance.percent}%</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Attendance</p>
              </div>
              <div className="card p-4 text-center">
                <p className="tabular text-[20px] font-extrabold text-ink">{data.workoutCount}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Workouts</p>
              </div>
              <div className="card p-4 text-center">
                <p className="tabular text-[20px] font-extrabold text-ink">{data.entries[0]?.weight ?? "—"}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Latest weight</p>
              </div>
            </div>
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Dumbbell size={15} className="text-ink-3" />
                <h2 className="text-[15px] font-bold tracking-tight text-ink">Weight log</h2>
              </div>
              {data.entries.length === 0 ? (
                <p className="text-[13px] text-ink-2">No weight entries yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {data.entries.slice(0, 10).map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-2.5">
                      <span className="tabular text-[13.5px] font-semibold text-ink">{e.weight} kg</span>
                      <span className="tabular text-[12px] text-ink-2">{fmtDate(e.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card p-4 text-center text-[13px] text-ink-2">
              <CalendarCheck2 size={15} className="mx-auto mb-1 text-ink-3" />
              {data.attendance.present} present · {data.attendance.absent} absent · {data.attendance.total} total days
            </div>
          </>
        )}
      </motion.div>

      <ConfirmDialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={() =>
          toggleActive("deactivateMember", "Member deactivated — they lose access immediately.").then(() => setDeactivateOpen(false))
        }
        title="Deactivate this member?"
        body="They will immediately lose access to the member panel. Their profile, membership and history are kept."
        confirmLabel="Deactivate member"
        danger
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteMember}
        loading={dBusy}
        title="Delete this member permanently?"
        body="This erases the account and all related records — membership, payments, attendance, plans and progress. This action cannot be undone."
        confirmLabel="Delete permanently"
        danger
      />
    </div>
  );
}
