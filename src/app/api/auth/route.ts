import { ApiError, destroySession, getSessionUser } from "@/lib/auth";
import { EMAIL_RE, handle, readJson } from "@/lib/api-helpers";
import { changePassword, loginAccount, registerAccount } from "@/lib/services/auth";
import { toMeUser } from "@/lib/services/users";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/* GET /api/auth — current session user (or null)                      */
/* ------------------------------------------------------------------ */

export async function GET() {
  return handle(async () => {
    const user = await getSessionUser();
    if (!user) return { user: null };
    return { user: await toMeUser(user) };
  });
}

/* ------------------------------------------------------------------ */
/* POST /api/auth — login / register / logout / change-password        */
/* ------------------------------------------------------------------ */

export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson<Record<string, unknown>>(req);
    const action = String(body.action ?? "");

    if (action === "login") {
      const email = String(body.email ?? "").trim();
      const password = String(body.password ?? "");
      if (!EMAIL_RE.test(email)) throw new ApiError(400, "Enter a valid email address.");
      if (!password) throw new ApiError(400, "Enter your password.");
      const uid = await loginAccount(email, password);
      const user = await getSessionUser();
      return { ok: true, user: user ? await toMeUser(user) : null, uid };
    }

    if (action === "register") {
      const role = body.role === "trainer" ? ROLES.TRAINER : ROLES.USER;
      const name = String(body.name ?? "").trim();
      const email = String(body.email ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      const password = String(body.password ?? "");

      if (name.length < 2) throw new ApiError(400, "Enter your full name.");
      if (!EMAIL_RE.test(email)) throw new ApiError(400, "Enter a valid email address.");
      if (phone.replace(/\D/g, "").length < 7) throw new ApiError(400, "Enter a valid phone number.");
      if (password.length < 8) throw new ApiError(400, "Password must be at least 8 characters.");

      if (role === ROLES.TRAINER) {
        if (!String(body.qualification ?? "").trim()) throw new ApiError(400, "Tell us your qualification.");
        if (!String(body.experience ?? "").trim()) throw new ApiError(400, "Tell us your experience.");
        if (!String(body.availability ?? "").trim()) throw new ApiError(400, "Add your availability window, e.g. 5 PM – 9 PM.");
      }

      const result = await registerAccount({
        role,
        name,
        email,
        phone,
        password,
        photoUrl: body.photoUrl ? String(body.photoUrl) : null,
        qualification: body.qualification ? String(body.qualification) : undefined,
        experience: body.experience ? String(body.experience) : undefined,
        bio: body.bio ? String(body.bio) : undefined,
        availability: body.availability ? String(body.availability) : undefined,
      });
      return { ok: true, pending: true, role: result.role, uid: result.uid };
    }

    if (action === "logout") {
      await destroySession();
      return { ok: true };
    }

    if (action === "change-password") {
      const user = await getSessionUser();
      if (!user) throw new ApiError(401, "Please sign in to continue.");
      await changePassword(user.id, String(body.current ?? ""), String(body.next ?? ""));
      return { ok: true };
    }

    throw new ApiError(400, "Unknown action.");
  });
}
