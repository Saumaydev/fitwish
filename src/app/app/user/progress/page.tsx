"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { CalendarCheck2, Camera, Dumbbell, Plus, Ruler, Scale, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { calcBMI, fmtDate, localDateStr } from "@/lib/format";
import { Badge, Button, EmptyState, Field, Input, PageHeader, Skeleton, StatCard } from "@/components/ui/core";
import { BottomSheet, ConfirmDialog } from "@/components/ui/overlays";
import { PhotoPicker } from "@/components/PhotoPicker";
import { useToast } from "@/components/ui/toast";
import type { UserProgressBundle } from "@/lib/types";

const WeightChart = dynamic(() => import("@/components/Charts").then((m) => m.WeightChart), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full rounded-2xl" />,
});

const MEASURES: { key: "chest" | "waist" | "arms" | "thighs" | "hips"; label: string }[] = [
  { key: "chest", label: "Chest (cm)" },
  { key: "waist", label: "Waist (cm)" },
  { key: "arms", label: "Arms (cm)" },
  { key: "thighs", label: "Thighs (cm)" },
  { key: "hips", label: "Hips (cm)" },
];

export default function UserProgress() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<UserProgressBundle>("/api/progress", { refreshInterval: 60000 });
  const [logOpen, setLogOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoUpload, setPhotoUpload] = useState<{ url: string; thumbnailUrl: string | null; storagePath: string } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [weight, setWeight] = useState("");
  const [measures, setMeasures] = useState<Record<string, string>>({});
  const [logBusy, setLogBusy] = useState(false);
  const [deletePhoto, setDeletePhoto] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const latest = data?.entries[data.entries.length - 1];

  const saveLog = async () => {
    const w = parseFloat(weight);
    if (!w || w < 20 || w > 400) {
      toast("error", "Enter a valid weight in kg.");
      return;
    }
    setLogBusy(true);
    try {
      const bmi = latest && false ? 0 : null;
      void bmi;
      await api("/api/progress", {
        method: "POST",
        body: {
          action: "logWeight",
          date: localDateStr(),
          weight: w,
          bmi: null,
          measurements: Object.fromEntries(
            Object.entries(measures)
              .filter(([, v]) => v !== "")
              .map(([k, v]) => [k, Number(v)])
          ),
        },
      });
      toast("success", "Weight entry saved.");
      setWeight("");
      setMeasures({});
      setLogOpen(false);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to save the entry.");
    } finally {
      setLogBusy(false);
    }
  };

  const savePhoto = async () => {
    if (!photoUpload || photoBusy) return;
    setPhotoBusy(true);
    try {
      await api("/api/progress", {
        method: "POST",
        body: {
          action: "photo",
          url: photoUpload.url,
          thumbnailUrl: photoUpload.thumbnailUrl,
          storagePath: photoUpload.storagePath,
          date: localDateStr(),
          category: "general",
        },
      });
      toast("success", "Progress photo saved.");
      setPhotoUpload(null);
      setPhotoOpen(false);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to save the photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletePhoto) return;
    setDeleteBusy(true);
    try {
      await api(`/api/progress?photoId=${encodeURIComponent(deletePhoto)}`, { method: "DELETE" });
      toast("success", "Photo deleted.");
      setDeletePhoto(null);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to delete the photo.");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Progress"
        subtitle="Where you are now, and how far you've come"
        right={
          <Button size="sm" onClick={() => setLogOpen(true)}>
            <Plus size={15} /> Log weight
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-[22px]" />
          <Skeleton className="h-56 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load progress."}
          <Button variant="outline" size="sm" className="mt-3 block" onClick={() => mutate()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <StatCard icon={<Scale size={18} />} label="Weight" value={latest?.weight ? `${latest.weight} kg` : "—"} sub={latest ? `as of ${fmtDate(latest.date)}` : "No entries yet"} />
            <StatCard icon={<Ruler size={18} />} label="BMI" value={latest?.bmi ? String(latest.bmi) : "—"} sub={latest?.bmi ? "kg/m²" : "Log weight to see BMI"} tone="neutral" />
            <StatCard icon={<Dumbbell size={18} />} label="Workouts" value={data?.workoutCount ?? 0} sub="sessions completed" tone="ok" />
            <StatCard icon={<CalendarCheck2 size={18} />} label="Attendance" value={`${data?.attendance.percent ?? 0}%`} sub={`${data?.attendance.present ?? 0} of ${data?.attendance.total ?? 0} days`} tone="warn" />
          </div>

          {/* Weight chart */}
          <section className="card mt-4 p-5">
            <h2 className="text-[15px] font-bold tracking-tight text-ink">Weight trend</h2>
            <div className="mt-3">
              <WeightChart data={(data?.entries ?? []).map((e) => ({ date: e.date, weight: e.weight }))} />
            </div>
          </section>

          {/* Measurements (latest) */}
          {latest?.measurements && Object.keys(latest.measurements).length > 0 && (
            <section className="card mt-4 p-5">
              <h2 className="text-[15px] font-bold tracking-tight text-ink">Latest measurements</h2>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {MEASURES.filter((m) => latest.measurements?.[m.key] != null).map((m) => (
                  <div key={m.key} className="rounded-2xl bg-surface-2 p-3 text-center">
                    <p className="tabular text-[17px] font-bold text-ink">{latest.measurements![m.key]} cm</p>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{m.label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Photos */}
          <section className="mt-6">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-[15px] font-bold tracking-tight text-ink">Progress photos</h2>
              <Button size="sm" variant="secondary" onClick={() => setPhotoOpen(true)}>
                <Camera size={14} /> Add photo
              </Button>
            </div>
            {!data?.photos.length ? (
              <EmptyState
                icon={<Camera size={20} />}
                title="No photos yet"
                hint="Capture front, side and back photos to see your transformation over time. Only you (and your trainer) can see them."
              />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {data.photos.map((p) => (
                  <motion.div key={p.id} whileHover={{ scale: 1.02 }} className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-surface-2">
                    <img src={p.thumbnailUrl ?? p.url} alt={`Progress photo ${fmtDate(p.date)}`} className="h-full w-full object-cover" loading="lazy" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                      <p className="tabular text-[10.5px] font-semibold text-white">{fmtDate(p.date)}</p>
                    </div>
                    <button
                      onClick={() => setDeletePhoto(p.id)}
                      aria-label="Delete photo"
                      className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Recent entries */}
          {data && data.entries.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2.5 text-[15px] font-bold tracking-tight text-ink">Recent entries</h2>
              <div className="card divide-y divide-line overflow-hidden">
                {[...data.entries].reverse().slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 p-3.5">
                    <div>
                      <p className="text-[13.5px] font-semibold text-ink">{e.weight ? `${e.weight} kg` : "—"}</p>
                      <p className="tabular text-[12px] text-ink-2">{fmtDate(e.date)}</p>
                    </div>
                    {e.bmi != null && <Badge tone="neutral">BMI {e.bmi}</Badge>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Log weight sheet */}
      <BottomSheet open={logOpen} onClose={() => setLogOpen(false)} title="Log weight & measurements">
        <div className="space-y-4">
          <Field label="Weight (kg)">
            <Input type="number" inputMode="decimal" min={20} max={400} step="0.1" placeholder="74.5" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <details className="rounded-2xl bg-surface-2 p-4">
            <summary className="cursor-pointer text-[13px] font-semibold text-ink">Add measurements (optional)</summary>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {MEASURES.map((m) => (
                <div key={m.key}>
                  <label className="field-label !mb-1.5 !text-[11.5px]">{m.label}</label>
                  <Input type="number" inputMode="decimal" min={10} max={300} placeholder="—" value={measures[m.key] ?? ""} onChange={(e) => setMeasures((s) => ({ ...s, [m.key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </details>
          <Button block size="lg" onClick={saveLog} loading={logBusy}>
            Save entry
          </Button>
        </div>
      </BottomSheet>

      {/* Add photo sheet */}
      <BottomSheet open={photoOpen} onClose={() => !photoBusy && setPhotoOpen(false)} title="Add progress photo">
        {!photoUpload ? (
          <div className="space-y-4">
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              Take a photo with your camera or choose one from your gallery. It&apos;s compressed and stored privately under your account.
            </p>
            <div className="flex gap-2">
              <PhotoPicker scope="progress" label="Camera" value={null} onUploaded={(res) => setPhotoUpload(res)} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-line">
              <img src={photoUpload.url} alt="Preview of your progress photo" className="max-h-72 w-full object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="secondary" onClick={() => setPhotoUpload(null)} disabled={photoBusy}>
                Retake
              </Button>
              <Button onClick={savePhoto} loading={photoBusy}>
                Confirm upload
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deletePhoto)}
        onClose={() => setDeletePhoto(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        title="Delete this photo?"
        body="The photo will be removed from your progress permanently."
        confirmLabel="Delete photo"
        danger
      />
    </div>
  );
}
