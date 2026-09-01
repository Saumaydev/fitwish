"use client";

import { useState } from "react";
import useSWR from "swr";
import { CircleHelp, LifeBuoy, Monitor, Moon, Pencil, ShieldCheck, Sun, Wallet } from "lucide-react";
import { api } from "@/lib/client";
import { useAuthStore } from "@/stores/app";
import { useTheme } from "@/components/providers";
import { Button, Field, Input, PageHeader, Segmented, Select } from "@/components/ui/core";
import { PhotoPicker } from "@/components/PhotoPicker";
import { BottomSheet } from "@/components/ui/overlays";
import { HelpBot } from "@/components/HelpBot";
import { useToast } from "@/components/ui/toast";
import { fmtMoney, membershipState, MEMBERSHIP_STATE_LABEL } from "@/lib/format";
import { REPORT_TYPES, REPORT_TYPE_LABELS } from "@/lib/constants";
import type { UserBundle } from "@/lib/types";

export default function UserSettings() {
  const toast = useToast();
  const me = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { theme, setTheme } = useTheme();
  const { data, mutate } = useSWR<UserBundle>("/api/user");

  /* Account editing */
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");

  /* Report */
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState("other");
  const [reportDesc, setReportDesc] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  const openEdit = () => {
    setName(me?.name ?? "");
    setPhone(me?.phone ?? "");
    setPhotoUrl(me?.photoUrl ?? null);
    setEditOpen(true);
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      await api("/api/user", {
        method: "PATCH",
        body: { action: "profile", name, phone, photoUrl, heightCm: null },
      });
      const meData = await api<{ user: NonNullable<typeof me> }>("/api/auth");
      setUser(meData.user);
      toast("success", "Profile updated.");
      setEditOpen(false);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to save changes.");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    if (!pwCurrent || pwNext.length < 8) {
      toast("error", "Enter your current password and a new one (8+ characters).");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth", {
        method: "POST",
        body: { action: "change-password", current: pwCurrent, next: pwNext },
      });
      toast("success", "Password changed.");
      setPwCurrent("");
      setPwNext("");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to change password.");
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async () => {
    setReportBusy(true);
    try {
      await api("/api/misc", { method: "POST", body: { action: "report", type: reportType, description: reportDesc } });
      toast("success", "Report sent. The admin team will review it.");
      setReportDesc("");
      setReportOpen(false);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to send your report. Your text is kept — try again.");
    } finally {
      setReportBusy(false);
    }
  };

  const membership = data?.membership ?? null;
  const state = membershipState(membership);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Make FitWish yours" />

      {/* Account */}
      <section className="card overflow-hidden">
        <h2 className="border-b border-line px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-3">
          Account settings
        </h2>
        <button onClick={openEdit} className="flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-surface-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
            <Pencil size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-ink">Name, phone & photo</span>
            <span className="block truncate text-[12.5px] text-ink-2">
              {me?.name} · {me?.phone || "no phone"}
            </span>
          </span>
        </button>
        <div className="border-t border-line px-5 py-4">
          <p className="mb-2.5 text-[13px] font-semibold text-ink">Change password</p>
          <div className="grid gap-2.5">
            <Input type="password" placeholder="Current password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} aria-label="Current password" />
            <Input type="password" placeholder="New password (8+ characters)" value={pwNext} onChange={(e) => setPwNext(e.target.value)} aria-label="New password" />
            <Button size="sm" variant="secondary" className="w-fit" onClick={changePassword} loading={busy}>
              Update password
            </Button>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="card mt-4 overflow-hidden">
        <h2 className="border-b border-line px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-3">
          Appearance
        </h2>
        <div className="p-5">
          <Segmented
            className="w-full [&>button]:flex-1"
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            value={theme}
            onChange={(t) => {
              setTheme(t);
              toast("success", `Theme set to ${t}.`);
            }}
          />
          <div className="mt-4 flex gap-2.5">
            <span className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-surface-2 py-3 text-[12.5px] font-semibold text-ink-2">
              <Sun size={14} /> White & red
            </span>
            <span className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-black py-3 text-[12.5px] font-semibold text-white">
              <Moon size={14} /> AMOLED black
            </span>
          </div>
        </div>
      </section>

      {/* Payment due (read-only) */}
      <section className="card mt-4 overflow-hidden">
        <h2 className="border-b border-line px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-3">
          Payments
        </h2>
        <div className="flex items-center justify-between p-5">
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Wallet size={17} />
            </span>
            <span>
              <span className="block text-[14px] font-bold text-ink">
                {membership ? (membership.dueAmount > 0 ? fmtMoney(membership.dueAmount) : "No payment due") : "No membership yet"}
              </span>
              <span className="block text-[12px] text-ink-2">
                {membership ? `${membership.plan} · ${MEMBERSHIP_STATE_LABEL[state]}` : "Managed by the gym admin"}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-3">
            <ShieldCheck size={14} className="text-ok" /> Admin controlled
          </span>
        </div>
      </section>

      {/* Help & support */}
      <section className="card mt-4 overflow-hidden">
        <h2 className="border-b border-line px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink-3">
          Help & support
        </h2>
        <HelpBot role="user" />
        <div className="border-t border-line" />
        <button onClick={() => setReportOpen(true)} className="flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-surface-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
            <LifeBuoy size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-ink">Report a problem</span>
            <span className="block text-[12.5px] text-ink-2">Billing, app issues or feedback — we reply fast</span>
          </span>
        </button>
        <div className="border-t border-line px-5 py-4">
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-ink-2">
              <CircleHelp size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-ink">About FitWish</span>
              <span className="block text-[12.5px] leading-relaxed text-ink-2">
                FitWish is a premium gym platform: memberships, trainers, guided workouts, progress tracking and attendance — in one calm app.
              </span>
            </span>
          </span>
        </div>
      </section>

      {/* Edit profile sheet */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <div className="space-y-4">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Profile photo">
            <PhotoPicker scope="profile" value={photoUrl} onUploaded={(res) => setPhotoUrl(res.url)} onClear={() => setPhotoUrl(null)} />
          </Field>
          <Button block size="lg" onClick={saveProfile} loading={busy}>
            Save changes
          </Button>
        </div>
      </BottomSheet>

      {/* Report sheet */}
      <BottomSheet open={reportOpen} onClose={() => !reportBusy && setReportOpen(false)} title="Report a problem">
        <div className="space-y-4">
          <Field label="Problem type">
            <Select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {REPORT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Describe the problem" hint="Include as much detail as you can.">
            <textarea
              className="input"
              rows={5}
              placeholder="What happened? When? What did you expect?"
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
            />
          </Field>
          <Button block size="lg" onClick={submitReport} loading={reportBusy} disabled={reportDesc.trim().length < 10}>
            Send report
          </Button>
          <p className="text-center text-[12px] text-ink-3">We only confirm “Report sent” after it&apos;s safely stored.</p>
        </div>
      </BottomSheet>
    </div>
  );
}
