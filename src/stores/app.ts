"use client";

import { create } from "zustand";
import type { MeUser } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Auth store — mirrors the server session                             */
/* ------------------------------------------------------------------ */

interface AuthState {
  user: MeUser | null;
  status: "loading" | "ready";
  setUser: (user: MeUser | null) => void;
  setStatus: (s: "loading" | "ready") => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  setUser: (user) => set({ user }),
  setStatus: (status) => set({ status }),
}));

/* ------------------------------------------------------------------ */
/* Active workout store — in-memory + localStorage persistence         */
/* ------------------------------------------------------------------ */

import type { ExerciseResult, WorkoutExercise, WorkoutPlanDTO } from "@/lib/types";
import { WORKOUT_STORAGE_KEY } from "@/lib/constants";

export interface ActiveWorkout {
  planId: string;
  title: string;
  trainerUid: string | null;
  startedAt: string;
  exercises: WorkoutExercise[];
  current: number;
  setCounts: number[];
  weights: (number | null)[];
  results: ExerciseResult[];
  restUntil: number | null;
  restDuration: number;
  restDone: boolean;
  lastAction: "set" | "rest" | "finish" | null;
}

interface WorkoutState extends ActiveWorkout {
  hydrated: boolean;
  startWorkout: (plan: WorkoutPlanDTO) => void;
  completeSet: () => void;
  startRest: (seconds: number) => void;
  restFinished: () => void;
  advance: () => void;
  skipExercise: () => void;
  setWeight: (index: number, weight: number) => void;
  hydrate: (saved: ActiveWorkout | null) => void;
  clear: () => void;
}

const empty: ActiveWorkout = {
  planId: "",
  title: "",
  trainerUid: null,
  startedAt: "",
  exercises: [],
  current: 0,
  setCounts: [],
  weights: [],
  results: [],
  restUntil: null,
  restDuration: 0,
  restDone: false,
  lastAction: null,
};

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  ...empty,
  hydrated: false,

  hydrate: (saved) => {
    if (saved && saved.exercises && saved.exercises.length && saved.lastAction !== "finish") {
      if (saved.restUntil && saved.restUntil <= Date.now()) {
        saved = { ...saved, restUntil: null, restDuration: 0 };
      }
      set({ ...saved, hydrated: true });
    } else {
      set({ ...empty, hydrated: true });
    }
  },

  startWorkout: (plan) => {
    const exercises = [...plan.exercises].sort((a, b) => a.order - b.order);
    set({
      planId: plan.id,
      title: plan.title,
      trainerUid: plan.trainerUid,
      startedAt: new Date().toISOString(),
      exercises,
      current: 0,
      setCounts: exercises.map(() => 0),
      weights: exercises.map((e) =>
        typeof e.weight === "number" ? e.weight : e.weight ? Number(e.weight) || null : null
      ),
      results: exercises.map((e) => ({
        exerciseId: e.exerciseId,
        name: e.name,
        completedSets: 0,
        actualReps: e.reps,
        actualWeight: typeof e.weight === "number" ? e.weight : null,
        completed: false,
      })),
      restUntil: null,
      restDuration: 0,
      restDone: false,
      lastAction: "set",
      hydrated: true,
    });
  },

  completeSet: () => {
    const s = get();
    if (!s.exercises.length) return;
    const idx = s.current;
    const ex = s.exercises[idx];
    if (!ex) return;
    const counts = [...s.setCounts];
    counts[idx] = Math.min(ex.sets, (counts[idx] ?? 0) + 1);
    const results = [...s.results];
    const prev = results[idx];
    results[idx] = {
      exerciseId: ex.exerciseId,
      name: ex.name,
      completedSets: counts[idx] ?? 0,
      actualReps: ex.reps,
      actualWeight: s.weights[idx] ?? null,
      completed: (counts[idx] ?? 0) >= ex.sets,
    };
    set({ setCounts: counts, results, lastAction: "set" });
  },

  startRest: (seconds) => {
    set({
      restUntil: Date.now() + seconds * 1000,
      restDuration: seconds,
      restDone: false,
      lastAction: "rest",
    });
  },

  restFinished: () => {
    set({ restUntil: null, restDuration: 0, restDone: true, lastAction: "rest" });
  },

  advance: () => {
    const s = get();
    if (s.current < s.exercises.length - 1) {
      set({ current: s.current + 1, restDone: false, lastAction: "set" });
    } else {
      set({ restDone: false, lastAction: "finish" });
    }
  },

  skipExercise: () => {
    const s = get();
    const counts = [...s.setCounts];
    if (s.current < counts.length) counts[s.current] = Math.max(0, (counts[s.current] ?? 0) - 1);
    set({ setCounts: counts, restUntil: null, restDuration: 0, restDone: false });
    get().advance();
  },

  setWeight: (index, weight) => {
    const weights = [...get().weights];
    weights[index] = weight;
    set({ weights });
  },

  clear: () => set({ ...empty, hydrated: true }),
}));

/* ------------------------------------------------------------------ */
/* Persistence bridge (localStorage, no SSR access)                    */
/* ------------------------------------------------------------------ */

export function loadSavedWorkout(): ActiveWorkout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKOUT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveWorkout) : null;
  } catch {
    return null;
  }
}

export function saveWorkout(state: ActiveWorkout | null): void {
  if (typeof window === "undefined") return;
  try {
    if (state) window.localStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(WORKOUT_STORAGE_KEY);
  } catch {
    /* storage full / private mode — ignore */
  }
}
