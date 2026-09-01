"use client";

import { useState } from "react";
import useSWR from "swr";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Flame, Salad, UtensilsCrossed } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { MEAL_LABELS } from "@/lib/constants";
import { Badge, Button, EmptyState, PageHeader, Skeleton } from "@/components/ui/core";
import type { UserDietBundle } from "@/lib/types";

export default function UserDiet() {
  const { data, error, isLoading, mutate } = useSWR<UserDietBundle>("/api/diet");
  const [openMeal, setOpenMeal] = useState<string | null>(null);

  const plan = data?.dietPlan ?? null;
  const meals = plan ? [...plan.meals].sort((a, b) => a.order - b.order) : [];
  const totals = meals.reduce(
    (acc, m) => {
      for (const it of m.items) {
        acc.calories += it.calories ?? 0;
        acc.protein += it.protein ?? 0;
      }
      return acc;
    },
    { calories: 0, protein: 0 }
  );

  return (
    <div>
      <PageHeader title="My Diet Plan" subtitle={plan ? `Updated ${fmtDate(plan.updatedAt)}` : "Built by your trainer"} />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-[24px]" />
          <Skeleton className="h-20 w-full rounded-[22px]" />
          <Skeleton className="h-20 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5">
          <p className="text-[14px] font-semibold text-ink">Couldn&apos;t load your diet plan</p>
          <p className="mt-1 text-[13px] text-ink-2">{error instanceof Error ? error.message : "Try again."}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => mutate()}>
            Try again
          </Button>
        </div>
      ) : plan && meals.length > 0 ? (
        <>
          <div className="hero-panel relative mb-4 overflow-hidden rounded-[24px] p-5 text-white md:p-6">
            <div className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full bg-brand/25 blur-3xl" aria-hidden />
            <div className="relative min-w-0">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-white/60">Today&apos;s nutrition</p>
              <h2 className="mt-1.5 text-[21px] font-extrabold tracking-tight md:text-[24px]">{plan.title}</h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-white/70">
                <span className="badge !bg-white/12 !text-white tabular">{meals.length} meals</span>
                {totals.calories > 0 && <span className="badge !bg-white/12 !text-white tabular">{totals.calories} kcal</span>}
                {totals.protein > 0 && <span className="badge !bg-white/12 !text-white tabular">{totals.protein} g protein</span>}
              </p>
            </div>
          </div>

          {plan.notes && (
            <div className="card mb-4 flex items-start gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <Salad size={17} />
              </span>
              <p className="text-[13px] leading-relaxed text-ink-2">{plan.notes}</p>
            </div>
          )}

          <div className="space-y-2.5">
            {meals.map((m) => {
              const open = openMeal === m.mealId;
              const kcal = m.items.reduce((a, it) => a + (it.calories ?? 0), 0);
              const protein = m.items.reduce((a, it) => a + (it.protein ?? 0), 0);
              return (
                <div key={m.mealId} className="card overflow-hidden">
                  <button
                    onClick={() => setOpenMeal(open ? null : m.mealId)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3.5 p-4 text-left"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2">
                      <UtensilsCrossed size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-bold text-ink">
                        {MEAL_LABELS[m.type] ?? m.type}
                        {m.time ? <span className="tabular ml-2 text-[12px] font-semibold text-ink-3">{m.time}</span> : null}
                      </span>
                      <span className="tabular mt-0.5 block text-[12px] text-ink-2">
                        {m.items.length} items{kcal ? ` · ${kcal} kcal` : ""}{protein ? ` · ${protein} g protein` : ""}
                      </span>
                    </span>
                    <ChevronDown size={17} className={`shrink-0 text-ink-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
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
                        <div className="border-t border-line">
                          {m.items.map((it) => (
                            <div key={it.itemId} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
                              <div className="min-w-0">
                                <p className="truncate text-[13.5px] font-semibold text-ink">{it.name}</p>
                                {it.quantity && <p className="tabular text-[12px] text-ink-3">{it.quantity}</p>}
                              </div>
                              <div className="shrink-0 text-right">
                                {it.calories !== null && <p className="tabular text-[12.5px] font-semibold text-ink-2">{it.calories} kcal</p>}
                                {it.protein !== null && <p className="tabular text-[11.5px] text-ink-3">{it.protein} g protein</p>}
                              </div>
                            </div>
                          ))}
                          {m.notes && <p className="px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">{m.notes}</p>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-surface-2 p-4">
            <Flame size={16} className="shrink-0 text-brand" />
            <p className="text-[12.5px] leading-relaxed text-ink-2">
              Follow the plan consistently — your trainer updates it as your progress changes.
            </p>
            <Badge tone="brand" className="ml-auto shrink-0 uppercase">
              {plan.status}
            </Badge>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Salad size={22} />}
          title="No diet plan yet"
          hint="Your trainer will assign your breakfast, lunch, snacks and dinner. Once it's ready, it appears here."
        />
      )}
    </div>
  );
}
