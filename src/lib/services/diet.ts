import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dietPlans, users } from "@/db/schema";
import { ApiError } from "@/lib/auth";
import { MEAL_TYPES, NOTIF_TYPES } from "@/lib/constants";
import { createNotification } from "./notifications";
import type { DietItem, DietMeal, DietPlanDTO } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Diet plans — assigned by the trainer, read by the member            */
/* ------------------------------------------------------------------ */

export async function getDietPlanForUser(userUid: string): Promise<DietPlanDTO | null> {
  const [plan] = await db.select().from(dietPlans).where(eq(dietPlans.userUid, userUid)).limit(1);
  if (!plan) return null;
  return {
    id: plan.id,
    userUid: plan.userUid,
    trainerUid: plan.trainerUid,
    title: plan.title,
    notes: plan.notes,
    meals: plan.meals ?? [],
    status: plan.status,
    updatedAt: plan.updatedAt.toISOString(),
  };
}

function cleanMeals(meals: DietMeal[]): DietMeal[] {
  return meals
    .filter((m) => m && MEAL_TYPES.includes(m.type as (typeof MEAL_TYPES)[number]))
    .map((m, i) => ({
      mealId: m.mealId || randomUUID(),
      type: m.type,
      time: (m.time || "").trim(),
      notes: (m.notes || "").trim(),
      order: i,
      items: (Array.isArray(m.items) ? m.items : [])
        .filter((it) => it && it.name && String(it.name).trim())
        .map<DietItem>((it) => ({
          itemId: it.itemId || randomUUID(),
          name: String(it.name).trim(),
          quantity: (it.quantity ? String(it.quantity) : "").trim(),
          calories: it.calories === null || it.calories === undefined || it.calories === ("" as unknown) ? null : Number(it.calories) || 0,
          protein: it.protein === null || it.protein === undefined || it.protein === ("" as unknown) ? null : Number(it.protein) || 0,
        })),
    }))
    .filter((m) => m.items.length > 0);
}

export async function saveDietPlanForClient(
  trainerUid: string,
  clientUid: string,
  title: string,
  meals: DietMeal[],
  notes?: string
): Promise<void> {
  const [client] = await db.select().from(users).where(eq(users.id, clientUid)).limit(1);
  if (!client || client.assignedTrainerUid !== trainerUid) {
    throw new ApiError(403, "You can only edit diet plans for your assigned clients.");
  }

  const cleaned = cleanMeals(meals);
  if (!cleaned.length) throw new ApiError(400, "Add at least one meal with a food item.");

  const safeTitle = (title || "").trim() || "My Diet Plan";
  const id = `diet_${clientUid}`;
  const [existing] = await db.select({ id: dietPlans.id }).from(dietPlans).where(eq(dietPlans.id, id)).limit(1);

  if (existing) {
    await db
      .update(dietPlans)
      .set({ trainerUid, title: safeTitle, notes: (notes ?? "").trim() || null, meals: cleaned, updatedAt: new Date() })
      .where(eq(dietPlans.id, id));
  } else {
    await db.insert(dietPlans).values({
      id,
      userUid: clientUid,
      trainerUid,
      title: safeTitle,
      notes: (notes ?? "").trim() || null,
      meals: cleaned,
      status: "active",
    });
  }

  await createNotification(clientUid, {
    type: NOTIF_TYPES.DIET_UPDATED,
    title: "Diet plan updated",
    body: `Your trainer updated your diet plan: ${safeTitle}.`,
    actionRef: "/app/user/diet",
  });
}
