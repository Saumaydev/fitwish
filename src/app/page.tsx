import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSessionUser, roleHome } from "@/lib/auth";
import { db } from "@/db";
import { trainers } from "@/db/schema";
import { LoginScreen } from "@/components/auth/LoginScreen";

export const metadata = { title: "Sign in" };

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    if (user.role === "admin") redirect(roleHome("admin"));
    if (user.role === "user") {
      redirect(user.approvalStatus === "approved" ? roleHome("user") : "/pending");
    }
    if (user.role === "trainer") {
      const [trainer] = await db.select().from(trainers).where(eq(trainers.uid, user.id)).limit(1);
      if (trainer && trainer.approvalStatus === "approved" && trainer.adminApproval === "approved" && trainer.isActive) {
        redirect(roleHome("trainer"));
      }
      redirect("/pending");
    }
  }
  return <LoginScreen />;
}
