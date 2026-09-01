"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Activity, Beef, Calculator, Droplets, Flame, Scale } from "lucide-react";
import { api } from "@/lib/client";
import { ACTIVITY_LEVELS, PROTEIN_GOALS } from "@/lib/constants";
import { bmiCategory, calcBMI, calcBMR, calcCalories, calcProtein, calcWater, fmtDate, waterGlasses } from "@/lib/format";
import { Badge, Button, EmptyState, Field, Input, PageHeader, Segmented, Skeleton } from "@/components/ui/core";
import { useToast } from "@/components/ui/toast";
import type { CalcDTO } from "@/lib/types";

type Tab = "bmi" | "bmr" | "calories" | "water" | "protein";

export default function Calculators() {
  const toast = useToast();
  const { data, isLoading, mutate } = useSWR<{ calcs: CalcDTO[] }>("/api/misc?action=calcs");
  const [tab, setTab] = useState<Tab>("bmi");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [activity, setActivity] = useState("moderate");
  const [workoutMins, setWorkoutMins] = useState("45");
  const [proteinGoal, setProteinGoal] = useState("maintain");
  const [saving, setSaving] = useState(false);

  const bmi = useMemo(() => calcBMI(parseFloat(weight) || 0, parseFloat(height) || 0), [weight, height]);
  const bmr = useMemo(
    () => calcBMR(sex, parseFloat(weight) || 0, parseFloat(height) || 0, parseInt(age) || 0),
    [sex, weight, height, age]
  );
  const calories = useMemo(() => {
    const level = ACTIVITY_LEVELS.find((a) => a.key === activity);
    return calcCalories(bmr, level?.factor ?? 1.2);
  }, [bmr, activity]);

  const water = useMemo(() => {
    const level = ACTIVITY_LEVELS.find((a) => a.key === activity);
    return calcWater(parseFloat(weight) || 0, level?.factor ?? 1.2, parseInt(workoutMins) || 0);
  }, [weight, activity, workoutMins]);
  const protein = useMemo(() => {
    const goal = PROTEIN_GOALS.find((g) => g.key === proteinGoal);
    return calcProtein(parseFloat(weight) || 0, goal?.perKg ?? 1.6);
  }, [weight, proteinGoal]);

  const inputsValid = tab === "water" ? water > 0 : tab === "protein" ? protein > 0 : tab === "bmi" ? bmi > 0 : tab === "bmr" ? bmr > 100 : calories > 500;

  const result = tab === "water"
    ? (water > 0 ? `${water} L/day · ${waterGlasses(water)} glasses` : "")
    : tab === "protein"
      ? (protein > 0 ? `${protein} g/day` : "")
      : tab === "bmi" ? (bmi > 0 ? `${bmi} kg/m² · ${bmiCategory(bmi)}` : "") : tab === "bmr" ? (bmr > 100 ? `${bmr.toLocaleString("en-IN")} kcal/day` : "") : calories > 500 ? `${calories.toLocaleString("en-IN")} kcal/day` : "";

  const explanation =
    tab === "water"
      ? "Your daily water target — roughly 35 ml per kg of bodyweight, plus extra for activity and training time. Sip through the day, don't gulp it all at once."
      : tab === "protein"
        ? "Protein keeps muscle while you train. Split this total across your meals — breakfast, lunch, snacks and dinner."
        : tab === "bmi"
      ? "BMI compares your weight to your height. 18.5–24.9 is considered the healthy range for most adults."
      : tab === "bmr"
        ? "BMR (Mifflin-St Jeor) is the energy your body burns at complete rest — before any exercise."
        : "Maintenance calories estimate your daily burn including activity. Eat slightly less to cut, more to build.";

  const save = async () => {
    if (!inputsValid || saving) return;
    setSaving(true);
    try {
      const inputs: Record<string, number | string> =
        tab === "water"
        ? { weight: parseFloat(weight), activity, workoutMinutes: parseInt(workoutMins) || 0 }
        : tab === "protein"
        ? { weight: parseFloat(weight), goal: proteinGoal }
        : tab === "bmi"
          ? { weight: parseFloat(weight), height: parseFloat(height) }
          : tab === "bmr"
            ? { sex, weight: parseFloat(weight), height: parseFloat(height), age: parseInt(age) }
            : { sex, weight: parseFloat(weight), height: parseFloat(height), age: parseInt(age), activity };
      await api("/api/misc", { method: "POST", body: { action: "calc", type: tab, inputs, result } });
      toast("success", "Saved to your calculation history.");
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  };

  const hasInputs = Boolean(weight) || Boolean(height);

  return (
    <div>
      <PageHeader title="Calculators" subtitle="Understand your body, instantly" />

      <Segmented
        className="w-full [&>button]:flex-1"
        options={[
          { value: "bmi", label: "BMI" },
          { value: "bmr", label: "BMR" },
          { value: "calories", label: "Calories" },
          { value: "water", label: "Water" },
          { value: "protein", label: "Protein" },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="card mt-4 p-5">
        {tab === "bmi" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Scale size={17} className="text-brand" />
              <h2 className="text-[16px] font-bold text-ink">Body Mass Index</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Height (cm)">
                <Input type="number" inputMode="decimal" min={100} max={250} placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} />
              </Field>
              <Field label="Weight (kg)">
                <Input type="number" inputMode="decimal" min={20} max={400} placeholder="74" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {(tab === "bmr" || tab === "calories") && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity size={17} className="text-brand" />
              <h2 className="text-[16px] font-bold text-ink">{tab === "bmr" ? "Basal Metabolic Rate" : "Daily Calorie Needs"}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Height (cm)">
                <Input type="number" inputMode="decimal" min={100} max={250} placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} />
              </Field>
              <Field label="Weight (kg)">
                <Input type="number" inputMode="decimal" min={20} max={400} placeholder="74" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </Field>
              <Field label="Age">
                <Input type="number" inputMode="numeric" min={10} max={100} placeholder="28" value={age} onChange={(e) => setAge(e.target.value)} />
              </Field>
              <Field label="Sex">
                <select className="input appearance-none" value={sex} onChange={(e) => setSex(e.target.value as "male" | "female")}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
            </div>
            {tab === "calories" && (
              <Field label="Activity level">
                <select className="input appearance-none" value={activity} onChange={(e) => setActivity(e.target.value)}>
                  {ACTIVITY_LEVELS.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        )}

        {tab === "water" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Droplets size={17} className="text-brand" />
              <h2 className="text-[16px] font-bold text-ink">Daily Water Intake</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weight (kg)">
                <Input type="number" inputMode="decimal" min={20} max={400} placeholder="74" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </Field>
              <Field label="Workout (minutes/day)">
                <Input type="number" inputMode="numeric" min={0} max={300} placeholder="45" value={workoutMins} onChange={(e) => setWorkoutMins(e.target.value)} />
              </Field>
            </div>
            <Field label="Activity level">
              <select className="input appearance-none" value={activity} onChange={(e) => setActivity(e.target.value)}>
                {ACTIVITY_LEVELS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {tab === "protein" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Beef size={17} className="text-brand" />
              <h2 className="text-[16px] font-bold text-ink">Daily Protein Target</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weight (kg)">
                <Input type="number" inputMode="decimal" min={20} max={400} placeholder="74" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </Field>
              <Field label="Goal">
                <select className="input appearance-none" value={proteinGoal} onChange={(e) => setProteinGoal(e.target.value)}>
                  {PROTEIN_GOALS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* Result */}
        <div className="mt-5 rounded-2xl bg-surface-2 p-4 text-center">
          {inputsValid ? (
            <>
              <p className="tabular text-[26px] font-extrabold tracking-tight text-brand">{result}</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-ink-2">{explanation}</p>
            </>
          ) : (
            <p className="text-[13.5px] font-medium text-ink-3">
              {hasInputs ? "Keep filling the fields — result appears here." : "Enter your details to see an instant result."}
            </p>
          )}
        </div>

        <Button block className="mt-4" onClick={save} loading={saving} disabled={!inputsValid}>
          <Calculator size={15} /> Save to history
        </Button>
      </div>

      {/* History */}
      <section className="mt-6">
        <h2 className="mb-2.5 text-[15px] font-bold tracking-tight text-ink">Previous calculations</h2>
        {isLoading ? (
          <Skeleton className="h-24 w-full rounded-[22px]" />
        ) : !data?.calcs.length ? (
          <EmptyState icon={<Flame size={20} />} title="No saved calculations" hint="Your saved BMI, BMR, calorie, water and protein results appear here." />
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {data.calcs.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="flex items-center gap-3">
                  <Badge tone="brand" className="uppercase">
                    {c.type}
                  </Badge>
                  <div>
                    <p className="tabular text-[13.5px] font-bold text-ink">{c.result}</p>
                    <p className="text-[11.5px] text-ink-3">{fmtDate(c.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
