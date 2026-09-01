"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ClipboardList,
  Dumbbell,
  History,
  Play,
  Timer,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, fmtDuration, sessionDurationMinutes } from "@/lib/format";
import { loadSavedWorkout, useWorkoutStore, type ActiveWorkout } from "@/stores/app";
import { Badge, Button, EmptyState, PageHeader, Skeleton } from "@/components/ui/core";
import { ConfirmDialog } from "@/components/ui/overlays";
import { WorkoutPlayer } from "@/components/WorkoutPlayer";
import type { UserWorkoutBundle } from "@/lib/types";

export default function UserWorkout() {
  const { data, error, isLoading, mutate } = useSWR<UserWorkoutBundle>("/api/workout");
  const workout = useWorkoutStore();
  const [playerOpen, setPlayerOpen] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [openEx, setOpenEx] = useState<string | null>(null);
  const [saved, setSaved] = useState<ActiveWorkout | null>(null);

  useEffect(() => {
    if (!workout.hydrated) {
      workout.hydrate(loadSavedWorkout());
    }
    setSaved(loadSavedWorkout());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasActive =
    workout.exercises.length > 0 && workout.lastAction !== "finish";
  const hasSaved = saved !== null && saved.lastAction !== "finish" && (saved.lastAction === "set" || saved.lastAction === "rest");

  const plan = data?.plan ?? null;
  const totalTime = plan?.exercises.reduce((a, e) => a + e.sets * 45 + e.rest * (e.sets - 1), 0) ?? 0;

  const start = () => {
    if (!plan) return;
    workout.startWorkout(plan);
    setConfirmStart(false);
    setPlayerOpen(true);
  };

  return (
    <div>
      <PageHeader title="My Workout Plan" subtitle={plan ? `Updated ${fmtDate(plan.updatedAt)}` : "Built by your trainer"} />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-[24px]" />
          <Skeleton className="h-20 w-full rounded-[22px]" />
          <Skeleton className="h-20 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5">
          <p className="text-[14px] font-semibold text-ink">Couldn&apos;t load your plan</p>
          <p className="mt-1 text-[13px] text-ink-2">{error instanceof Error ? error.message : "Try again."}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => mutate()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {/* Resume banner */}
          {hasSaved && (
            <div className="card mb-4 flex items-center gap-3.5 border-brand/30 bg-brand-soft p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white">
                <Play size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-ink">Workout in progress</p>
                <p className="truncate text-[12.5px] text-ink-2">{saved.title}</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  workout.hydrate(saved);
                  setPlayerOpen(true);
                }}
              >
                Resume
              </Button>
            </div>
          )}

          {/* Plan hero */}
          {plan && plan.exercises.length > 0 ? (
            <div className="hero-panel relative mb-4 overflow-hidden rounded-[24px] p-5 text-white md:p-6">
              <div className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full bg-brand/25 blur-3xl" aria-hidden />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white/60">Today&apos;s plan</p>
                  <h2 className="mt-1.5 text-[21px] font-extrabold tracking-tight md:text-[24px]">{plan.title}</h2>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-white/70">
                    <span className="badge !bg-white/12 !text-white tabular">{plan.exercises.length} exercises</span>
                    <span className="badge !bg-white/12 !text-white tabular">≈ {Math.max(10, Math.round(totalTime / 60))} min</span>
                  </p>
                </div>
              </div>
              <Button
                block
                size="lg"
                className="relative mt-5 !bg-white !text-[#0b0c10] hover:!brightness-95"
                onClick={() => setConfirmStart(true)}
              >
                <Play size={17} /> Start Workout
              </Button>
            </div>
          ) : (
            <div className="mb-4">
              <EmptyState
                icon={<ClipboardList size={22} />}
                title="No workout plan yet"
                hint="Your trainer will build a plan for you. Once it's ready, it appears here and you can start training right away."
              />
            </div>
          )}

          {/* Exercise list */}
          {plan && plan.exercises.length > 0 && (
            <div className="space-y-2.5">
              {[...plan.exercises]
                .sort((a, b) => a.order - b.order)
                .map((ex, i) => {
                  const open = openEx === ex.exerciseId;
                  return (
                    <div key={ex.exerciseId} className="card overflow-hidden">
                      <button
                        onClick={() => setOpenEx(open ? null : ex.exerciseId)}
                        aria-expanded={open}
                        className="flex w-full items-center gap-3.5 p-4 text-left"
                      >
                        <span className="tabular grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-[13px] font-bold text-ink-2">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-bold text-ink">{ex.name}</span>
                          <span className="tabular mt-0.5 block text-[12px] text-ink-2">
                            {ex.sets} sets × {String(ex.reps)} reps
                            {ex.weight ? ` · ${String(ex.weight)} kg` : ""}
                            {ex.rest > 0 ? ` · rest ${fmtDuration(ex.rest)}` : ""}
                          </span>
                        </span>
                        <ChevronDown
                          size={17}
                          className={`shrink-0 text-ink-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-line px-4 py-3.5 text-[13px] leading-relaxed text-ink-2">
                              {ex.instructions || "No extra instructions for this exercise."}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
            </div>
          )}

          {/* History */}
          <section className="mt-8">
            <div className="mb-2.5 flex items-center gap-2">
              <History size={15} className="text-ink-3" />
              <h2 className="text-[15px] font-bold tracking-tight text-ink">Recent workouts</h2>
            </div>
            {data && data.sessions.length === 0 ? (
              <EmptyState
                icon={<Dumbbell size={20} />}
                title="No completed workouts"
                hint="Your finished sessions and their results will be listed here."
              />
            ) : (
              <div className="space-y-2.5">
                {data?.sessions.map((s) => {
                  const sets = s.exerciseResults.reduce((a, r) => a + r.completedSets, 0);
                  return (
                    <div key={s.id} className="card flex items-center gap-3.5 p-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                        <Timer size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-bold text-ink">
                          {s.exerciseResults.length} exercises · {sets} sets
                        </p>
                        <p className="tabular text-[12px] text-ink-2">
                          {fmtDate(s.completedAt)} · {sessionDurationMinutes(s.startedAt, s.completedAt)} min
                        </p>
                      </div>
                      <Badge tone="ok">Done</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Start confirmation */}
      <ConfirmDialog
        open={confirmStart}
        onClose={() => setConfirmStart(false)}
        onConfirm={start}
        title="Start workout?"
        body={
          plan
            ? `You're about to start "${plan.title}" — ${plan.exercises.length} exercises with guided sets and rest timers. Make sure you're ready.`
            : ""
        }
        confirmLabel="Start workout"
      />

      {/* Discard saved workout */}
      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => {
          workout.clear();
          setSaved(null);
        }}
        title="Discard saved workout?"
        body="Your in-progress workout will be removed from this device."
        confirmLabel="Discard"
        danger
      />

      {/* Active workout player */}
      <AnimatePresence>
        {playerOpen && (
          <WorkoutPlayer
            onExit={() => {
              setPlayerOpen(false);
              setSaved(loadSavedWorkout());
              mutate();
            }}
          />
        )}
      </AnimatePresence>

      {/* Inline saved-workout chip */}
      {hasSaved && !hasActive && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3.5">
          <p className="text-[13px] font-semibold text-ink">You have a saved workout on this device.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => workout.hydrate(saved)}>
              Resume
            </Button>
            <Button size="sm" variant="ghost" className="!text-err" onClick={() => setConfirmDiscard(true)}>
              <XCircle size={14} /> Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
