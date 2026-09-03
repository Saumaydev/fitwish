/* ------------------------------------------------------------------ */
/* Fitwish formatting + pure business logic (unit-testable)            */
/* ------------------------------------------------------------------ */

import type { MembershipDTO } from "./types";

/** Format an integer rupee amount as ₹1,500 */
export function fmtMoney(amount: number): string {
  const n = Math.round(amount || 0);
  return `₹${n.toLocaleString("en-IN")}`;
}

/** Local date string YYYY-MM-DD */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** DD/MM/YYYY */
export function fmtDate(value: string | Date): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(String(value).slice(0, 10) + "T00:00:00") : value;
  if (isNaN(d.getTime())) return String(value);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** "05 Jan 2026, 6:30 PM" */
export function fmtDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function fmtTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function timeAgo(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return localDateStr(d);
}

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00").getTime();
  const t = new Date(localDateStr() + "T00:00:00").getTime();
  return Math.round((d - t) / 86400000);
}

export type MembershipState = "active" | "expiring" | "expired" | "inactive";

/** Centralized membership business logic */
export function membershipState(m: Pick<MembershipDTO, "expiryDate"> | null | undefined): MembershipState {
  if (!m) return "inactive";
  const days = daysUntil(m.expiryDate);
  if (days < 0) return "expired";
  if (days <= 14) return "expiring";
  return "active";
}

export const MEMBERSHIP_STATE_LABEL: Record<MembershipState, string> = {
  active: "Active",
  expiring: "Expiring Soon",
  expired: "Expired",
  inactive: "Inactive",
};

/* ------------------------------------------------------------------ */
/* Calculators (pure)                                                  */
/* ------------------------------------------------------------------ */

export function calcBMI(weightKg: number, heightCm: number): number {
  if (!weightKg || !heightCm) return 0;
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy range";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export function calcBMR(sex: "male" | "female", weightKg: number, heightCm: number, age: number): number {
  // Mifflin-St Jeor
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

export function calcCalories(bmr: number, activityFactor: number): number {
  return Math.round(bmr * activityFactor);
}

export function attendancePercent(present: number, total: number): number {
  if (!total) return 0;
  return Math.round((present / total) * 100);
}

/** Exercise duration estimate for a session */
export function sessionDurationMinutes(startedAt: string | Date, completedAt: string | Date): number {
  const a = new Date(startedAt).getTime();
  const b = new Date(completedAt).getTime();
  if (isNaN(a) || isNaN(b) || b <= a) return 0;
  return Math.max(1, Math.round((b - a) / 60000));
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Water & protein calculators (pure)                                  */
/* ------------------------------------------------------------------ */

/** Daily water need in litres (35 ml/kg baseline + activity + workout bonus) */
export function calcWater(weightKg: number, activityFactor: number, workoutMinutes = 0): number {
  if (!weightKg) return 0;
  const baseMl = weightKg * 35;
  const activityMl = baseMl * Math.max(0, (activityFactor || 1.2) - 1.2) * 0.5;
  const workoutMl = Math.max(0, workoutMinutes) * 12;
  return Math.round(((baseMl + activityMl + workoutMl) / 1000) * 10) / 10;
}

/** Number of 250 ml glasses for a litre target */
export function waterGlasses(litres: number): number {
  return Math.max(0, Math.round((litres * 1000) / 250));
}

/** Daily protein need in grams (g per kg of bodyweight) */
export function calcProtein(weightKg: number, gramsPerKg: number): number {
  if (!weightKg || !gramsPerKg) return 0;
  return Math.round(weightKg * gramsPerKg);
}
