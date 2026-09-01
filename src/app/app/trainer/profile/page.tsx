"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Award, Briefcase, CalendarCheck2, Clock3, LifeBuoy, LogOut, Moon, Pencil, Sun, Users } from "lucide-react";
import { api } from "@/lib/client";
import { useAuthStore } from "@/stores/app";
import { useTheme } from "@/components/providers";
import { Avatar, Badge, Button, Field, Input, PageHeader, Segmented, Select, Textarea } from "@/components/ui/core";
import { PhotoPicker } from "@/components/PhotoPicker";
import { BottomSheet } from "@/components/ui/overlays";
import { HelpBot } from "@/components/HelpBot";
import { useToast } from "@/components/ui/toast";
import { REPORT_TYPES, REPORT_TYPE_LABELS } from "@/lib/constants";
import type { ClientDTO, TrainerOverviewDTO } from "@/lib/types";

export default function TrainerProfile() {
  const router = useRouter();
  const toast = useToast();
  const me = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { theme, setTheme } = useTheme();
  const { data } = useSWR<{ clients: ClientDTO[] }>("/api/trainer?action=clients");
  const { data: overview } = useSWR<TrainerOverviewDTO>("/api/trainer?action=overview");

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState("other");
  const [reportDesc, setReportDesc] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  const openEdit = () => {
    setName(me?.name ?? "");
    setPhone(me?.phone ?? "");
    setQualification(me?.trainer?.qualification ?? "");
    setExperience(me?.trainer?.experience ?? "");
    setBio(me?.trainer?.bio ?? "");
    setAvailability(me?.trainer?.availability ?? "");
    setPhotoUrl(me?.photoUrl ?? null);
    setEditOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await api("/api/trainer", {
        method: "POST",
        body: { action: "updateProfile", name, phone, qualification, experience, bio, availability, photoUrl },
      });
      const meData = await api<{ user: NonNullable<typeof me> }>("/api/auth");
      setUser(meData.user);
      toast("success", "Profile updated.");
      setEditOpen(false);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to save changes.");
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async () => {
    setReportBusy(true);
    try {
      await api("/api/misc", { method: "POST", body: { action: "report", type: reportType, description: reportDesc } });
      toast("success", "Report sent to the admin team.");
      setReportDesc("");
      setReportOpen(false);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to send your report — try again.");
    } finally {
      setReportBusy(false);
    }
  };

  const signOut = async () => {
    await api("/api/auth", { method: "POST", body: { action: "logout" } }).catch(() => {});
    setUser(null);
    router.replace("/");
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        title="My Profile"
        right={
          <Button size="sm" variant="secondary" onClick={openEdit}>
            <Pencil size={14} /> Edit
          </Button>
        }
      />

      {/* Identity */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <Avatar name={me?.name ?? "?"} src={me?.photoUrl} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[19px] font-extrabold tracking-tight text-ink">{me?.name}</h1>
            <p className="truncate text-[13px] text-ink-2">{me?.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone="ok">Approved trainer</Badge>
              {me?.phone && <Badge tone="neutral">{me.phone}</Badge>}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className="card p-4 text-center">
          <p className="tabular text-[20px] font-extrabold text-ink">{data?.clients.length ?? "—"}</p>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            <Users size={11} /> Clients
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="tabular text-[20px] font-extrabold text-ink">{overview?.todaySessionCount ?? "—"}</p>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            <Clock3 size={11} /> Sessions
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="tabular text-[20px] font-extrabold text-ink">{overview?.activeClientCount ?? "—"}</p>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
            <CalendarCheck2 size={11} /> Active
          </p>
        </div>
      </div>

      {/* Credentials */}
      <div className="card mt-4 divide-y divide-line overflow-hidden">
        <div className="flex items-center gap-3.5 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <Award size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">Qualification</p>
            <p className="mt-0.5 text-[14px] font-bold text-ink">{me?.trainer?.qualification || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
            <Briefcase size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">Experience</p>
            <p className="mt-0.5 text-[14px] font-bold text-ink">{me?.trainer?.experience || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
            <Clock3 size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">Availability</p>
            <p className="mt-0.5 text-[14px] font-bold text-ink">{me?.trainer?.availability || "—"}</p>
          </div>
        </div>
        {me?.trainer?.bio && (
          <div className="p-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">About me</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{me.trainer.bio}</p>
          </div>
        )}
      </div>

      {/* Appearance */}
      <div className="card mt-4 p-5">
        <p className="mb-3 flex items-center gap-2 text-[14px] font-bold text-ink">
          <Sun size={15} className="text-warn" /> <Moon size={15} className="text-ink-3" /> Appearance
        </p>
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
      </div>

      {/* Help */}
      <section className="card mt-4 overflow-hidden">
        <HelpBot role="trainer" />
      </section>
      <button onClick={() => setReportOpen(true)} className="card card-press mt-4 flex w-full items-center gap-3.5 p-4 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
          <LifeBuoy size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold text-ink">Help & support</span>
          <span className="block text-[12.5px] text-ink-2">Report a problem to the gym admin</span>
        </span>
      </button>

      <Button variant="outline" block className="mt-5 !border-err/25 !text-err" onClick={signOut}>
        <LogOut size={16} /> Sign out
      </Button>

      {/* Edit sheet */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <div className="space-y-4">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Qualification">
            <Input value={qualification} onChange={(e) => setQualification(e.target.value)} />
          </Field>
          <Field label="Experience">
            <Input value={experience} onChange={(e) => setExperience(e.target.value)} />
          </Field>
          <Field label="Availability" hint="Shown to members, e.g. 5 PM – 9 PM">
            <Input value={availability} onChange={(e) => setAvailability(e.target.value)} />
          </Field>
          <Field label="Bio">
            <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>
          <Field label="Profile photo">
            <PhotoPicker scope="profile" value={photoUrl} onUploaded={(res) => setPhotoUrl(res.url)} onClear={() => setPhotoUrl(null)} />
          </Field>
          <Button block size="lg" onClick={save} loading={busy}>
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
          <Field label="Describe the problem">
            <textarea className="input" rows={5} value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="What happened? What did you expect?" />
          </Field>
          <Button block size="lg" onClick={submitReport} loading={reportBusy} disabled={reportDesc.trim().length < 10}>
            Send report
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
