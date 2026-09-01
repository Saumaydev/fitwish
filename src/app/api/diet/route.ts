import { requireApiUser } from "@/lib/auth";
import { handle } from "@/lib/api-helpers";
import { getDietPlanForUser } from "@/lib/services/diet";

export const dynamic = "force-dynamic";

/* GET /api/diet — the member's assigned diet plan */
export async function GET() {
  return handle(async () => {
    const user = await requireApiUser(["user"]);
    return { dietPlan: await getDietPlanForUser(user.id) };
  });
}
