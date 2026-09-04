"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarCheck2,
  Clock3,
  Dumbbell,
  Pencil,
  UtensilsCrossed,
  Plus,
  Scale,
  Save,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, fmtMoney, membershipState, MEMBERSHIP_STATE_LABEL } from "@/lib/format";
import { MEAL_LABELS, MEAL_TYPES } from "@/lib/constants";
import { Avatar, Badge, Button, EmptyState, Field, Input, PageHeader, Segmented, Skeleton, Textarea } from "@/components/ui/core";
import { BottomSheet, ConfirmDialog } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import type { ClientBundle, DietMeal, WorkoutExercise } from "@/lib/types";

type Tab = "overview" | "plan" | "diet" | "progress" | "attendance";

interface ExDraft {
  exerciseId?: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  time: string;
  rest: string;
  instructions: string;
}

const emptyDraft: ExDraft = {
  name: "",
  sets: "3",
  reps: "10",
  weight: "",
  time: "",
  rest: "90",
  instructions: ""
};

interface MealDraft {
  mealId?: string;
  type: string;
  time: string;
  notes: string;
  items: { itemId?: string; name: string; quantity: string; calories: string; protein: string }[];
}

const emptyMealDraft: MealDraft = {
  type: "breakfast",
  time: "",
  notes: "",
  items: [{ name: "", quantity: "", calories: "", protein: "" }],
};

export default function ClientDetail() {
  const { uid } = useParams<{ uid: string }>();
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<ClientBundle>(`/api/trainer?action=client&uid=${uid}`, { refreshInterval: 30000 });

  const [tab, setTab] = useState<Tab>("overview");
  const [time, setTime] = useState("");
  const [timeBusy, setTimeBusy] = useState(false);

  const [planTitle, setPlanTitle] = useState("");
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftIndex, setDraftIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<ExDraft>(emptyDraft);
  const [planBusy, setPlanBusy] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  const [dietTitle, setDietTitle] = useState("");
  const [dietNotes, setDietNotes] = useState("");
  const [meals, setMeals] = useState<DietMeal[]>([]);
  const [mealOpen, setMealOpen] = useState(false);
  const [mealIndex, setMealIndex] = useState<number | null>(null);
  const [mealDraft, setMealDraft] = useState<MealDraft>(emptyMealDraft);
  const [dietBusy, setDietBusy] = useState(false);
  const [removeMealIndex, setRemoveMealIndex] = useState<number | null>(null);

  useMemo(() => {
    if (data) {
      setTime(data.sessionTime ?? "");
      setPlanTitle(data.plan?.title ?? "");
      setExercises([...(data.plan?.exercises ?? [])].sort((a, b) => a.order - b.order));
      setDietTitle(data.dietPlan?.title ?? "");
      setDietNotes(data.dietPlan?.notes ?? "");
      setMeals([...(data.dietPlan?.meals ?? [])].sort((a, b) => a.order - b.order));
    }
  }, [data]);

  const saveTime = async () => {
    if (!/^([01]?\d|1[0-2]):[0-5]\d ?(AM|PM|am|pm)$/.test(time.trim())) {
      toast("error", "Use a time like 6:30 PM.");
      return;
    }
    setTimeBusy(true);
    try {
      await api("/api/trainer", { method: "POST", body: { action: "setSessionTime", userUid: uid, time: time.trim() } });
      toast("success", `Session time set to ${time.trim()}.`);
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to save the time.");
    } finally {
      setTimeBusy(false);
    }
  };

  const openDraft = (index: number | null) => {
    setDraftIndex(index);
    if (index === null) {
      setDraft(emptyDraft);
    } else {
      const ex = exercises[index]!;
      setDraft({
  exerciseId: ex.exerciseId,
  name: ex.name,
  sets: String(ex.sets),
  reps: String(ex.reps),
  weight: ex.weight ? String(ex.weight) : "",
  time: ex.time ? String(ex.time) : "",
  rest: String(ex.rest ?? 0),
  instructions: ex.instructions ?? "",
});
    }
    setDraftOpen(true);
  };

  const saveDraft = () => {
    if (!draft.name.trim()) {
      toast("error", "Give the exercise a name.");
      return;
    }
    const ex: WorkoutExercise = {
  exerciseId: draft.exerciseId ?? `ex-${Date.now()}`,
  name: draft.name.trim(),
  sets: Math.max(1, parseInt(draft.sets) || 1),
  reps: draft.reps.trim() || "—",
  weight: draft.weight ? Number(draft.weight) || draft.weight : null,
  time: draft.time.trim() === "" ? null : Math.max(1, parseInt(draft.time) || 1),
  rest: Math.max(0, parseInt(draft.rest) || 0),
  instructions: draft.instructions.trim(),
  order: draftIndex ?? exercises.length,
};
    const next = [...exercises];
    if (draftIndex === null) next.push(ex);
    else next[draftIndex] = ex;
    setExercises(next);
    setDraftOpen(false);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= exercises.length) return;
    const next = [...exercises];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setExercises(next);
  };

  const savePlan = async () => {
    if (!exercises.length) {
      toast("error", "Add at least one exercise.");
      return;
    }
    setPlanBusy(true);
    try {
      await api("/api/trainer", {
        method: "POST",
        body: { action: "savePlan", userUid: uid, title: planTitle.trim() || "My Workout Plan", exercises },
      });
      toast("success", "Workout plan saved — your client sees it now.");
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to save the plan.");
    } finally {
      setPlanBusy(false);
    }
  };

  const openMeal = (index: number | null) => {
    setMealIndex(index);
    if (index === null) {
      setMealDraft({ ...emptyMealDraft, items: [{ name: "", quantity: "", calories: "", protein: "" }] });
    } else {
      const m = meals[index]!;
      setMealDraft({
        mealId: m.mealId,
        type: m.type,
        time: m.time ?? "",
        notes: m.notes ?? "",
        items: (m.items.length ? m.items : [{ itemId: undefined, name: "", quantity: "", calories: null, protein: null }]).map((it) => ({
          itemId: it.itemId,
          name: it.name,
          quantity: it.quantity ?? "",
          calories: it.calories === null || it.calories === undefined ? "" : String(it.calories),
          protein: it.protein === null || it.protein === undefined ? "" : String(it.protein),
        })),
      });
    }
    setMealOpen(true);
  };

  const saveMealDraft = () => {
    const items = mealDraft.items.filter((it) => it.name.trim());
    if (!items.length) {
      toast("error", "Add at least one food item.");
      return;
    }
    const meal: DietMeal = {
      mealId: mealDraft.mealId ?? `meal-${Date.now()}`,
      type: mealDraft.type,
      time: mealDraft.time.trim(),
      notes: mealDraft.notes.trim(),
      order: mealIndex ?? meals.length,
      items: items.map((it, i) => ({
        itemId: it.itemId ?? `item-${Date.now()}-${i}`,
        name: it.name.trim(),
        quantity: it.quantity.trim(),
        calories: it.calories === "" ? null : Number(it.calories) || 0,
        protein: it.protein === "" ? null : Number(it.protein) || 0,
      })),
    };
    const next = [...meals];
    if (mealIndex === null) next.push(meal);
    else next[mealIndex] = meal;
    setMeals(next);
    setMealOpen(false);
  };

  const moveMeal = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= meals.length) return;
    const next = [...meals];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setMeals(next);
  };

  const saveDiet = async () => {
    if (!meals.length) {
      toast("error", "Add at least one meal.");
      return;
    }
    setDietBusy(true);
    try {
      await api("/api/trainer", {
        method: "POST",
        body: {
          action: "saveDietPlan",
          userUid: uid,
          title: dietTitle.trim() || "My Diet Plan",
          notes: dietNotes.trim(),
          meals: meals.map((m, i) => ({ ...m, order: i })),
        },
      });
      toast("success", "Diet plan saved — your client sees it now.");
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to save the diet plan.");
    } finally {
      setDietBusy(false);
    }
  };

  const mealTotals = (m: DietMeal) => ({
    calories: m.items.reduce((a, it) => a + (it.calories ?? 0), 0),
    protein: m.items.reduce((a, it) => a + (it.protein ?? 0), 0),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-[22px]" />
        <Skeleton className="h-48 w-full rounded-[22px]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <Link href="/app/trainer/clients" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink">
          <ArrowLeft size={15} /> Back to clients
        </Link>
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Client not found."}
        </div>
      </div>
    );
  }

  const m = data.membership;
  const mState = membershipState(m);

  return (
    <div>
      <Link href="/app/trainer/clients" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft size={15} /> Back to clients
      </Link>

      <div className="flex items-center gap-4">
        <Avatar name={data.user.name} src={data.user.photoUrl} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-extrabold tracking-tight text-ink">{data.user.name}</h1>
          <p className="truncate text-[12.5px] text-ink-2">{data.user.email}</p>
        </div>
        {data.sessionTime && (
          <Badge tone="brand" className="!h-8 !px-3.5 !text-[13px] tabular">
            {data.sessionTime}
          </Badge>
        )}
      </div>

      <div className="mt-5 w-full min-w-0 overflow-x-auto">
  <Segmented
    className="min-w-[620px] [&>button]:min-w-[120px] [&>button]:flex-none"
    options={[
      { value: "overview", label: "Overview" },
      { value: "plan", label: "Workout Plan" },
      { value: "diet", label: "Diet Plan" },
      { value: "progress", label: "Progress" },
      { value: "attendance", label: "Attendance" },
    ]}
    value={tab}
    onChange={setTab}
  />
</div>
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-4 space-y-4">
        {/* ---------------- Overview ---------------- */}
        {tab === "overview" && (
          <>
            <div className="card p-5">
              <h2 className="text-[15px] font-bold tracking-tight text-ink">Membership</h2>
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
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Expiry</p>
                    <p className="tabular mt-0.5 text-[14px] font-bold text-ink">{fmtDate(m.expiryDate)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Due</p>
                    <p className="tabular mt-0.5 text-[14px] font-bold text-ink">{m.dueAmount > 0 ? fmtMoney(m.dueAmount) : "—"}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-[13.5px] text-ink-2">No membership yet.</p>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2">
                <Clock3 size={16} className="text-brand" />
                <h2 className="text-[15px] font-bold tracking-tight text-ink">Session time</h2>
              </div>
              <p className="mt-1.5 text-[12.5px] text-ink-2">Your client sees this time on their home screen. Only you control it.</p>
              <div className="mt-3 flex gap-2.5">
                <Input placeholder="6:30 PM" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Session time" />
                <Button onClick={saveTime} loading={timeBusy} className="shrink-0">
                  <Save size={15} /> Save
                </Button>
              </div>
            </div>

            {data.user.emergencyContact?.name && (
              <div className="card p-5">
                <h2 className="text-[15px] font-bold tracking-tight text-ink">Emergency contact</h2>
                <p className="mt-1.5 text-[13.5px] font-semibold text-ink">{data.user.emergencyContact.name}</p>
                {data.user.emergencyContact.phone && <p className="tabular text-[13px] text-ink-2">{data.user.emergencyContact.phone}</p>}
              </div>
            )}
          </>
        )}

        {/* ---------------- Plan ---------------- */}
        {tab === "plan" && (
          <>
            <div className="card p-5">
              <Field label="Plan title">
                <Input value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} placeholder="Upper Body Strength" />
              </Field>
            </div>

            {exercises.length === 0 ? (
              <EmptyState icon={<Dumbbell size={20} />} title="No exercises yet" hint="Build your client's plan — it appears in their Workout tab instantly." />
            ) : (
              <div className="space-y-2.5">
                {exercises.map((ex, i) => (
                  <div key={ex.exerciseId} className="card p-4">
                    <div className="flex items-start gap-3">
                      <span className="tabular grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-[12.5px] font-bold text-ink-2">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-ink">{ex.name}</p>
                        <p className="tabular mt-0.5 text-[12px] text-ink-2">
                          {ex.sets} × {String(ex.reps)} {ex.weight ? `· ${String(ex.weight)} kg` : ""} {ex.rest > 0 ? `· rest ${ex.rest}s` : ""}
                        </p>
                        {ex.instructions && <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink-3">{ex.instructions}</p>}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink disabled:opacity-30">
                          <ArrowUp size={14} />
                        </button>
                        <button onClick={() => move(i, 1)} disabled={i === exercises.length - 1} aria-label="Move down" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink disabled:opacity-30">
                          <ArrowDown size={14} />
                        </button>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button onClick={() => openDraft(i)} aria-label="Edit exercise" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setRemoveIndex(i)} aria-label="Remove exercise" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-err">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="secondary" onClick={() => openDraft(null)}>
                <Plus size={15} /> Add exercise
              </Button>
              <Button onClick={savePlan} loading={planBusy} disabled={!exercises.length}>
                <Save size={15} /> Save plan
              </Button>
            </div>
          </>
        )}

        {/* ---------------- Diet ---------------- */}
        {tab === "diet" && (
          <>
            <div className="card space-y-4 p-5">
              <Field label="Diet plan title">
                <Input value={dietTitle} onChange={(e) => setDietTitle(e.target.value)} placeholder="Fat Loss Nutrition" />
              </Field>
              <Field label="General notes" hint="Water intake, supplements, cheat-meal rules…">
                <Textarea rows={2} value={dietNotes} onChange={(e) => setDietNotes(e.target.value)} placeholder="Drink 3L water daily. No sugar after 7 PM." />
              </Field>
            </div>

            {meals.length === 0 ? (
              <EmptyState icon={<UtensilsCrossed size={20} />} title="No meals yet" hint="Assign breakfast, lunch, snacks and dinner — it appears in your client's Diet tab instantly." />
            ) : (
              <div className="space-y-2.5">
                {meals.map((m, i) => {
                  const totals = mealTotals(m);
                  return (
                    <div key={m.mealId} className="card p-4">
                      <div className="flex items-start gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-2">
                          <UtensilsCrossed size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold text-ink">
                            {MEAL_LABELS[m.type] ?? m.type}
                            {m.time ? <span className="tabular ml-2 text-[12px] font-semibold text-ink-3">{m.time}</span> : null}
                          </p>
                          <p className="tabular mt-0.5 text-[12px] text-ink-2">
                            {m.items.length} items{totals.calories ? ` · ${totals.calories} kcal` : ""}{totals.protein ? ` · ${totals.protein} g protein` : ""}
                          </p>
                          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink-3">
                            {m.items.map((it) => `${it.name}${it.quantity ? ` (${it.quantity})` : ""}`).join(", ")}
                          </p>
                          {m.notes && <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-3">{m.notes}</p>}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button onClick={() => moveMeal(i, -1)} disabled={i === 0} aria-label="Move up" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink disabled:opacity-30">
                            <ArrowUp size={14} />
                          </button>
                          <button onClick={() => moveMeal(i, 1)} disabled={i === meals.length - 1} aria-label="Move down" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink disabled:opacity-30">
                            <ArrowDown size={14} />
                          </button>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button onClick={() => openMeal(i)} aria-label="Edit meal" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setRemoveMealIndex(i)} aria-label="Remove meal" className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-err">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="secondary" onClick={() => openMeal(null)}>
                <Plus size={15} /> Add meal
              </Button>
              <Button onClick={saveDiet} loading={dietBusy} disabled={!meals.length}>
                <Save size={15} /> Save diet plan
              </Button>
            </div>
          </>
        )}

        {/* ---------------- Progress ---------------- */}
        {tab === "progress" && (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="card p-4 text-center">
                <p className="tabular text-[18px] font-extrabold text-ink">{data.entries[data.entries.length - 1]?.weight ?? "—"} kg</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Weight</p>
              </div>
              <div className="card p-4 text-center">
                <p className="tabular text-[18px] font-extrabold text-ink">{data.workoutCount}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Workouts</p>
              </div>
              <div className="card p-4 text-center">
                <p className="tabular text-[18px] font-extrabold text-ink">{data.attendance.percent}%</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Attendance</p>
              </div>
            </div>

            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Scale size={15} className="text-ink-3" />
                <h2 className="text-[15px] font-bold tracking-tight text-ink">Weight log</h2>
              </div>
              {data.entries.length === 0 ? (
                <p className="text-[13px] text-ink-2">No weight entries yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {[...data.entries].reverse().slice(0, 8).map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-2.5">
                      <span className="tabular text-[13.5px] font-semibold text-ink">{e.weight} kg</span>
                      <span className="tabular text-[12px] text-ink-2">{fmtDate(e.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp size={15} className="text-ink-3" />
                <h2 className="text-[15px] font-bold tracking-tight text-ink">Progress photos</h2>
              </div>
              {data.photos.length === 0 ? (
                <p className="text-[13px] text-ink-2">No photos shared yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {data.photos.slice(0, 12).map((p) => (
                    <div key={p.id} className="aspect-[3/4] overflow-hidden rounded-xl border border-line bg-surface-2">
                      <img src={p.thumbnailUrl ?? p.url} alt={`Progress photo ${fmtDate(p.date)}`} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ---------------- Attendance ---------------- */}
        {tab === "attendance" && (
          <>
            <div className="card flex items-center gap-5 p-5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ok/10 text-ok">
                <CalendarCheck2 size={21} />
              </span>
              <div className="flex-1">
                <p className="tabular text-[20px] font-extrabold text-ink">{data.attendance.percent}%</p>
                <p className="text-[12px] text-ink-2">
                  {data.attendance.present} present of {data.attendance.total} days
                </p>
              </div>
              <Link href="/app/trainer/attendance" className="btn btn-secondary btn-sm">
                Mark attendance
              </Link>
            </div>
            {data.recentAttendance.length === 0 ? (
              <EmptyState icon={<CalendarCheck2 size={20} />} title="No attendance yet" hint="Mark attendance from the Attendance tab." />
            ) : (
              <div className="card divide-y divide-line overflow-hidden">
                {data.recentAttendance.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3.5">
                    <span className="tabular text-[13.5px] font-semibold text-ink">{fmtDate(a.date)}</span>
                    <Badge tone={a.status === "present" ? "ok" : "err"}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Exercise draft sheet */}
      <BottomSheet open={draftOpen} onClose={() => setDraftOpen(false)} title={draftIndex === null ? "Add exercise" : "Edit exercise"}>
        <div className="space-y-4">
          <Field label="Exercise name">
            <Input placeholder="Bench Press" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-3 gap-2.5">
            <Field label="Sets">
              <Input type="number" inputMode="numeric" min={1} value={draft.sets} onChange={(e) => setDraft((d) => ({ ...d, sets: e.target.value }))} />
            </Field>
            <Field label="Reps">
              <Input placeholder="10" value={draft.reps} onChange={(e) => setDraft((d) => ({ ...d, reps: e.target.value }))} />
            </Field>
            <Field label="Weight (kg)">
              <Input type="number" inputMode="decimal" min={0} placeholder="60" value={draft.weight} onChange={(e) => setDraft((d) => ({ ...d, weight: e.target.value }))} />
            </Field>
          </div>
<Field label="Time (optional)">
  <Input
    type="number"
    min="1"
    inputMode="numeric"
    placeholder="e.g. 60"
    value={draft.time}
    onChange={(e) => setDraft({ ...draft, time: e.target.value })}
  />
  <p className="mt-1 text-[11px] text-ink-3">
    Duration in seconds. Leave empty for no timer.
  </p>
</Field>
          <Field label="Rest (seconds)" hint="Countdown shown between sets.">
            <Input type="number" inputMode="numeric" min={0} placeholder="90" value={draft.rest} onChange={(e) => setDraft((d) => ({ ...d, rest: e.target.value }))} />
          </Field>
          <Field label="Instructions">
            <Textarea rows={3} placeholder="Keep your back flat, control the lowering phase…" value={draft.instructions} onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))} />
          </Field>
          <Button block size="lg" onClick={saveDraft}>
            {draftIndex === null ? "Add to plan" : "Save exercise"}
          </Button>
        </div>
      </BottomSheet>

      {/* Meal draft sheet */}
      <BottomSheet open={mealOpen} onClose={() => setMealOpen(false)} title={mealIndex === null ? "Add meal" : "Edit meal"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Meal">
              <select className="input appearance-none" value={mealDraft.type} onChange={(e) => setMealDraft((d) => ({ ...d, type: e.target.value }))}>
                {MEAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {MEAL_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Time">
              <Input placeholder="8:00 AM" value={mealDraft.time} onChange={(e) => setMealDraft((d) => ({ ...d, time: e.target.value }))} />
            </Field>
          </div>

          <div className="space-y-2.5">
            {mealDraft.items.map((it, i) => (
              <div key={i} className="rounded-2xl border border-line p-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Oats with milk"
                    value={it.name}
                    aria-label="Food item"
                    onChange={(e) =>
                      setMealDraft((d) => ({ ...d, items: d.items.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)) }))
                    }
                  />
                  <button
                    onClick={() => setMealDraft((d) => ({ ...d, items: d.items.length > 1 ? d.items.filter((_, xi) => xi !== i) : d.items }))}
                    aria-label="Remove item"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-err"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Input
                    placeholder="100 g"
                    aria-label="Quantity"
                    value={it.quantity}
                    onChange={(e) =>
                      setMealDraft((d) => ({ ...d, items: d.items.map((x, xi) => (xi === i ? { ...x, quantity: e.target.value } : x)) }))
                    }
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="kcal"
                    aria-label="Calories"
                    value={it.calories}
                    onChange={(e) =>
                      setMealDraft((d) => ({ ...d, items: d.items.map((x, xi) => (xi === i ? { ...x, calories: e.target.value } : x)) }))
                    }
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="protein g"
                    aria-label="Protein grams"
                    value={it.protein}
                    onChange={(e) =>
                      setMealDraft((d) => ({ ...d, items: d.items.map((x, xi) => (xi === i ? { ...x, protein: e.target.value } : x)) }))
                    }
                  />
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setMealDraft((d) => ({ ...d, items: [...d.items, { name: "", quantity: "", calories: "", protein: "" }] }))}
            >
              <Plus size={14} /> Add food item
            </Button>
          </div>

          <Field label="Meal notes">
            <Textarea rows={2} placeholder="Eat within 30 minutes of waking up…" value={mealDraft.notes} onChange={(e) => setMealDraft((d) => ({ ...d, notes: e.target.value }))} />
          </Field>
          <Button block size="lg" onClick={saveMealDraft}>
            {mealIndex === null ? "Add to diet plan" : "Save meal"}
          </Button>
        </div>
      </BottomSheet>

      {/* Remove meal confirm */}
      <ConfirmDialog
        open={removeMealIndex !== null}
        onClose={() => setRemoveMealIndex(null)}
        onConfirm={() => {
          if (removeMealIndex !== null) {
            setMeals((ms) => ms.filter((_, i) => i !== removeMealIndex));
            setRemoveMealIndex(null);
          }
        }}
        title="Remove this meal?"
        body="It will disappear from the diet plan after you save."
        confirmLabel="Remove"
        danger
      />

      {/* Remove exercise confirm */}
      <ConfirmDialog
        open={removeIndex !== null}
        onClose={() => setRemoveIndex(null)}
        onConfirm={() => {
          if (removeIndex !== null) {
            setExercises((exs) => exs.filter((_, i) => i !== removeIndex));
            setRemoveIndex(null);
          }
        }}
        title="Remove this exercise?"
        body="It will disappear from the plan after you save."
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}
