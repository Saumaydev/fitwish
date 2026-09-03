"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Timer,
  TrendingUp,
  X,
} from "lucide-react";
import { api } from "@/lib/client";
import { fmtDuration, sessionDurationMinutes } from "@/lib/format";
import { loadSavedWorkout, saveWorkout, useWorkoutStore, type ActiveWorkout } from "@/stores/app";
import { Button } from "@/components/ui/core";
import { BottomSheet, ConfirmDialog } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";

function buzz() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([80, 60, 80]);
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* audio unavailable */
  }
}

function RestTimer({ onFinished }: { onFinished: () => void }) {
  const restUntil = useWorkoutStore((s) => s.restUntil);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (restUntil && now >= restUntil) {
      onFinished();
      buzz();
    }
  }, [now, restUntil, onFinished]);

  const remaining = restUntil ? Math.max(0, restUntil - now) : 0;
  return (
    <div className="tabular text-center">
      <p className="text-[64px] font-extrabold leading-none tracking-tight text-ink md:text-[76px]">{fmtDuration(remaining / 1000)}</p>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-widest text-ink-3">
        <Timer size={13} /> Rest
      </p>
    </div>
  );
}

export function WorkoutPlayer({ onExit }: { onExit: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const s = useWorkoutStore();
  const [finishOpen, setFinishOpen] = useState(false);
  const [abortOpen, setAbortOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedSummary, setSavedSummary] = useState<{ exercises: number; sets: number; minutes: number } | null>(null);
  const [pauseUntil, setPauseUntil] = useState<number | null>(null);
  const lastActionRef = useRef<"set" | "rest" | "finish" | "done" | null>(s.lastAction);

  /* Hydrate from localStorage (survives refresh / app backgrounding) */
  useEffect(() => {
    if (!s.hydrated) s.hydrate(loadSavedWorkout());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Persist continuously */
  useEffect(() => {
    if (!s.hydrated) return;
    const unsub = useWorkoutStore.subscribe((state) => {
      const snapshot: ActiveWorkout = {
        planId: state.planId,
        title: state.title,
        trainerUid: state.trainerUid,
        startedAt: state.startedAt,
        exercises: state.exercises,
        current: state.current,
        setCounts: state.setCounts,
        weights: state.weights,
        results: state.results,
        restUntil: state.restUntil,
        restDuration: state.restDuration,
        restDone: state.restDone,
        lastAction: state.lastAction,
      };
      saveWorkout(snapshot);
    });
    return unsub;
  }, [s.hydrated]);

  /* Pause / resume of the rest clock */
  useEffect(() => {
    if (pauseUntil !== null && s.restUntil) {
      if (s.restUntil > Date.now()) {
        const remaining = s.restUntil - Date.now();
        setPauseUntil(remaining);
        useWorkoutStore.setState({ restUntil: Date.now() });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseUntil]);

  const resumeRest = () => {
    if (pauseUntil !== null) {
      useWorkoutStore.setState({ restUntil: Date.now() + pauseUntil });
      setPauseUntil(null);
    }
  };

  const ex = s.exercises[s.current];
  const totalSets = s.exercises.reduce((a, e) => a + e.sets, 0);
  const doneSets = s.setCounts.reduce((a, b) => a + b, 0);
  const exerciseDone = ex ? (s.setCounts[s.current] ?? 0) >= ex.sets : false;
  const isLast = s.current >= s.exercises.length - 1;
  const inRest = s.restUntil !== null && s.restUntil > Date.now();
  const restPaused = pauseUntil !== null && !inRest;
  const weight = ex && s.weights[s.current] !== null ? (s.weights[s.current] ?? 0) : null;

  const progressPct = s.exercises.length ? Math.min(100, Math.round((doneSets / totalSets) * 100)) : 0;

  const onRestFinished = () => {
    if (lastActionRef.current !== "rest") return;
    lastActionRef.current = "done";
    s.restFinished();
  };
  lastActionRef.current = s.lastAction;

  const completeSet = () => {
    if (!ex) return;
    s.completeSet();
    // Read the fresh store state — the render snapshot is stale right after set().
    const after = useWorkoutStore.getState();
    const idx = after.current;
    const target = after.exercises[idx];
    if (!target) return;
    if ((after.setCounts[idx] ?? 0) >= target.sets) {
      if (target.rest > 0 && !isLast) {
        after.startRest(target.rest);
      } else {
        after.advance();
      }
    }
  };

  const skip = () => {
    const current = useWorkoutStore.getState();
    const curEx = current.exercises[current.current];
    const doneSets = current.setCounts[current.current] ?? 0;
    if (curEx && curEx.rest > 0 && doneSets < curEx.sets && current.current < current.exercises.length - 1) {
      current.startRest(curEx.rest);
      return;
    }
    s.skipExercise();
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const completed = s.results.filter((r) => r.completed || r.completedSets > 0);
      const summary = {
        exercises: completed.length,
        sets: completed.reduce((a, r) => a + r.completedSets, 0),
        minutes: sessionDurationMinutes(s.startedAt, new Date().toISOString()),
      };
      await api("/api/workout", {
        method: "POST",
        body: { action: "complete", planId: s.planId, startedAt: s.startedAt, results: s.results },
      });
      s.clear();
      saveWorkout(null);
      setSavedSummary(summary);
      setSaved(true);
      setFinishOpen(false);
      toast("success", "Workout saved — great session!");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to save your workout.");
    } finally {
      setSaving(false);
    }
  };

  /* Success overlay */
  if (saved && savedSummary) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[85] grid place-items-center bg-bg px-5"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="card w-full max-w-sm p-7 text-center"
        >
          <motion.span
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.08, type: "spring", stiffness: 320, damping: 18 }}
            className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ok/12 text-ok"
          >
            <CheckCircle2 size={34} />
          </motion.span>
          <h2 className="mt-4 text-[22px] font-extrabold tracking-tight text-ink">Workout complete</h2>
          <p className="mt-1.5 text-[13.5px] text-ink-2">
            {savedSummary.exercises} exercises · {savedSummary.sets} sets · {savedSummary.minutes} min
          </p>
          <div className="mt-6 grid gap-2.5">
            <Button block onClick={() => router.push("/app/user/progress")}>
              <TrendingUp size={15} /> View progress
            </Button>
            <Button variant="secondary" block onClick={onExit}>
              Back to workout plan
            </Button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (!ex || !s.hydrated) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 38 }}
      className="fixed inset-0 z-[85] flex flex-col bg-bg safe-top safe-bottom"
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div className="px-4 pt-4 md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-3">
              Exercise {s.current + 1} of {s.exercises.length}
            </p>
            <p className="truncate text-[13px] font-semibold text-ink-2">{s.title}</p>
          </div>
          <button
            onClick={() => setAbortOpen(true)}
            aria-label="End workout"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-ink-2 transition hover:text-err"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-strong"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${s.current}-${s.lastAction}-${inRest}`}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {inRest || s.restDone || s.lastAction === "rest" ? (
              /* ---------------------- REST MODE ---------------------- */
              <div className="card mx-auto mt-4 max-w-md p-8">
                {inRest && !restPaused && (
                  <RestTimer
                    onFinished={() => {
                      onRestFinished();
                    }}
                  />
                )}
                {restPaused && (
                  <div className="text-center">
                    <p className="tabular text-[64px] font-extrabold leading-none text-ink md:text-[76px]">
                      {fmtDuration(pauseUntil / 1000)}
                    </p>
                    <p className="mt-2 text-[12.5px] font-semibold uppercase tracking-widest text-ink-3">Rest paused</p>
                  </div>
                )}
                {(s.restDone || (s.lastAction === "rest" && !inRest && !restPaused)) && (
                  <div className="text-center">
                    <p className="text-[52px] font-extrabold leading-none text-brand md:text-[64px]">✓</p>
                    <p className="mt-2 text-[14px] font-semibold text-ink">Rest complete</p>
                  </div>
                )}

                <p className="mt-6 text-center text-[13px] text-ink-2">
                  Next up: <span className="font-bold text-ink">{isLast ? "Finish the workout" : s.exercises[s.current + 1]?.name}</span>
                </p>
                <div className="mt-5 grid gap-2.5">
                  {inRest ? (
                    <Button variant="secondary" block size="lg" onClick={() => setPauseUntil(Date.now() + (s.restUntil! - Date.now()))}>
                      <Pause size={16} /> Pause rest
                    </Button>
                  ) : restPaused ? (
                    <Button variant="secondary" block size="lg" onClick={resumeRest}>
                      <Play size={16} /> Resume rest
                    </Button>
                  ) : (
                    <Button block size="lg" onClick={() => (isLast ? setFinishOpen(true) : s.advance())}>
                      {isLast ? "Finish workout" : "Start next exercise"} <ChevronRight size={17} />
                    </Button>
                  )}
                  {inRest && (
                    <Button variant="ghost" size="sm" block onClick={() => s.restFinished()}>
                      <RotateCcw size={14} /> Skip rest
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* ---------------------- SET MODE ---------------------- */
              <div className="mx-auto max-w-md">
                <div className="card p-6">
                  <h2 className="text-center text-[27px] font-extrabold leading-tight tracking-tight text-ink md:text-[30px]">
                    {ex.name}
                  </h2>

                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="badge badge-neutral tabular">
                      {ex.sets} sets × {String(ex.reps)} reps
                    </span>
                    {typeof ex.weight === "number" || (typeof ex.weight === "string" && ex.weight) ? (
                      <span className="badge badge-brand tabular">{String(ex.weight)} kg</span>
                    ) : null}
                    {ex.rest > 0 && <span className="badge badge-neutral tabular">Rest {fmtDuration(ex.rest)}</span>}
                  </div>

                  {ex.instructions && (
                    <p className="mt-4 rounded-2xl bg-surface-2 p-3.5 text-center text-[12.5px] leading-relaxed text-ink-2">
                      {ex.instructions}
                    </p>
                  )}

                  {/* Weight stepper */}
                  <div className="mt-5 flex items-center justify-center gap-4">
                    <button
                      aria-label="Decrease weight"
                      onClick={() => s.setWeight(s.current, Math.max(0, (s.weights[s.current] ?? 0) - 2.5))}
                      className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-2 text-ink-2 transition hover:text-ink"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="min-w-[96px] text-center">
                      <p className="tabular text-[26px] font-extrabold leading-none text-ink">{weight ?? "—"}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-ink-3">kg</p>
                    </div>
                    <button
                      aria-label="Increase weight"
                      onClick={() => s.setWeight(s.current, Math.min(400, (s.weights[s.current] ?? 0) + 2.5))}
                      className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-2 text-ink-2 transition hover:text-ink"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Sets */}
                  <div className="mt-5 flex items-center justify-center gap-2.5">
                    {Array.from({ length: ex.sets }).map((_, i) => {
                      const done = i < (s.setCounts[s.current] ?? 0);
                      return (
                        <motion.span
                          key={i}
                          animate={done ? { scale: [1, 1.25, 1] } : {}}
                          transition={{ duration: 0.25 }}
                          className={`grid h-10 w-10 place-items-center rounded-full border text-[13px] font-bold tabular ${
                            done
                              ? "border-brand bg-brand text-white shadow-md shadow-red-500/30"
                              : "border-line bg-surface-2 text-ink-3"
                          }`}
                          aria-label={done ? `Set ${i + 1} complete` : `Set ${i + 1}`}
                        >
                          {done ? "✓" : i + 1}
                        </motion.span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Primary action */}
      <div className="border-t border-line bg-surface px-4 pb-4 pt-3 md:px-6">
        <div className="mx-auto grid max-w-md gap-2">
          {!inRest && s.lastAction !== "rest" && !s.restDone && (
            <Button
              block
              size="lg"
              onClick={() => {
  if (exerciseDone && isLast) {
    setFinishOpen(true);
  } else {
    completeSet();
  }
}}
              className="text-[15.5px]"
              aria-label={exerciseDone ? (isLast ? "Finish workout" : "Continue") : `Complete set ${(s.setCounts[s.current] ?? 0) + 1} of ${ex.sets}`}
            >
              {exerciseDone
                ? isLast
                  ? "Finish workout"
                  : `Continue${ex.rest > 0 ? ` · rest ${fmtDuration(ex.rest)}` : ""}`
                : `Complete set ${(s.setCounts[s.current] ?? 0) + 1} of ${ex.sets}`}
            </Button>
          )}
          {!inRest && s.lastAction !== "rest" && !s.restDone && (
            <Button variant="ghost" size="sm" block onClick={skip} disabled={exerciseDone && isLast}>
              {exerciseDone ? "Next exercise" : "Skip this exercise"}
            </Button>
          )}
        </div>
      </div>

      {/* Finish sheet */}
      <BottomSheet open={finishOpen} onClose={() => setFinishOpen(false)} title="Finish workout">
        <p className="text-[14px] leading-relaxed text-ink-2">
          Save this session to your progress. Your trainer will see it too.
        </p>
        <div className="mt-4 rounded-2xl bg-surface-2 p-4">
          <div className="flex items-center justify-between py-1">
            <span className="text-[13px] text-ink-2">Exercises completed</span>
            <span className="tabular text-[13.5px] font-bold text-ink">
              {s.results.filter((r) => r.completedSets > 0).length} / {s.exercises.length}
            </span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-[13px] text-ink-2">Total sets</span>
            <span className="tabular text-[13.5px] font-bold text-ink">{doneSets}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-[13px] text-ink-2">Duration</span>
            <span className="tabular text-[13.5px] font-bold text-ink">
              {sessionDurationMinutes(s.startedAt, new Date().toISOString())} min
            </span>
          </div>
        </div>
        <Button block size="lg" className="mt-5" onClick={save} loading={saving}>
          <CheckCircle2 size={16} /> Save & finish workout
        </Button>
      </BottomSheet>

      {/* Abort confirm */}
      <ConfirmDialog
        open={abortOpen}
        onClose={() => setAbortOpen(false)}
        onConfirm={() => {
          s.clear();
          saveWorkout(null);
          onExit();
        }}
        title="End workout?"
        body="This discards your current session and progress. You can start a fresh workout anytime from your plan."
        confirmLabel="Discard workout"
        danger
      />
    </motion.div>
  );
}
