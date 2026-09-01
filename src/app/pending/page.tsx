import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSessionUser, roleHome } from "@/lib/auth";
import { db } from "@/db";
import { trainers } from "@/db/schema";
import PendingClient from "@/components/auth/PendingClient";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role === "admin") redirect(roleHome("admin"));
  if (user.role === "user") {
    if (user.approvalStatus === "approved") redirect(roleHome("user"));
  } else if (user.role === "trainer") {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.uid, user.id)).limit(1);
    if (trainer && trainer.approvalStatus === "approved" && trainer.adminApproval === "approved" && trainer.isActive) {
      redirect(roleHome("trainer"));
    }
  }
  return <PendingClient />;
}
