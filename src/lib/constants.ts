/* ------------------------------------------------------------------ */
/* FitWish centralized constants — roles, states, plans                */
/* ------------------------------------------------------------------ */

export const ROLES = {
  USER: "user",
  TRAINER: "trainer",
  ADMIN: "admin",
} as const;

export const APPROVAL = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const MEMBERSHIP_PLANS = ["Basic", "Silver", "Gold", "Premium"] as const;

export const REPORT_TYPES = ["billing", "bug", "feedback", "other"] as const;
export const REPORT_TYPE_LABELS: Record<string, string> = {
  billing: "Billing / Payment",
  bug: "App Problem",
  feedback: "Feedback",
  other: "Other",
};

export const CALC_TYPES = ["bmi", "bmr", "calories", "water", "protein"] as const;

export const ACTIVITY_LEVELS: { key: string; label: string; factor: number }[] = [
  { key: "sedentary", label: "Sedentary (little exercise)", factor: 1.2 },
  { key: "light", label: "Light (1–3 days/week)", factor: 1.375 },
  { key: "moderate", label: "Moderate (3–5 days/week)", factor: 1.55 },
  { key: "active", label: "Active (6–7 days/week)", factor: 1.725 },
  { key: "intense", label: "Very active (twice/day)", factor: 1.9 },
];

export const PROTEIN_GOALS: { key: string; label: string; perKg: number }[] = [
  { key: "maintain", label: "Maintain weight", perKg: 1.6 },
  { key: "lose", label: "Fat loss (preserve muscle)", perKg: 2.0 },
  { key: "gain", label: "Muscle gain", perKg: 2.2 },
  { key: "sedentary", label: "Low activity / general health", perKg: 1.0 },
];

export const MEAL_TYPES = ["breakfast", "lunch", "snacks", "dinner"] as const;
export const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  dinner: "Dinner",
};

export const SESSION_COOKIE = "fitwish_session";
export const SESSION_TTL_DAYS = 30;

export const WORKOUT_STORAGE_KEY = "fitwish:active-workout:v1";
export const THEME_STORAGE_KEY = "fitwish:theme";

export const APP_NAME = "FitWish";
export const APP_VERSION = "1.0.0";

export const NOTIF_TYPES = {
  TRAINER_REQUEST: "trainer_request",
  TRAINER_ACCEPTED: "trainer_accepted",
  TRAINER_REJECTED: "trainer_rejected",
  TRAINER_APPROVED: "trainer_approved",
  TRAINER_REJECTED_BY_ADMIN: "trainer_rejected_by_admin",
  TRAINER_DEACTIVATED: "trainer_deactivated",
  MEMBER_APPROVED: "member_approved",
  MEMBER_REJECTED: "member_rejected",
  MEMBER_DEACTIVATED: "member_deactivated",
  MEMBERSHIP_UPDATED: "membership_updated",
  MEMBERSHIP_EXPIRING: "membership_expiring",
  PAYMENT_RECEIVED: "payment_received",
  PAYMENT_REQUESTED: "payment_requested",
  REPORT_STATUS: "report_status",
  SESSION_TIME: "session_time",
  WORKOUT_UPDATED: "workout_updated",
  DIET_UPDATED: "diet_updated",
  WORKOUT_COMPLETED: "workout_completed",
  ATTENDANCE_MARKED: "attendance_marked",
  ANNOUNCEMENT: "announcement",
  WELCOME: "welcome",
} as const;
