"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowRight, CircleAlert, Dumbbell, Eye, EyeOff, Lock, Mail, Sparkles, Timer } from "lucide-react";
import { api } from "@/lib/client";
import { Button, Field, Input } from "@/components/ui/core";
import type { MeUser } from "@/lib/types";

const schema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

type FormValues = z.infer<typeof schema>;


export function routeFor(user: MeUser): string {
  if (user.role === "admin") return "/app/admin/dashboard";
  if (user.role === "trainer") {
    return user.trainer && user.trainer.isActive && user.trainer.approvalStatus === "approved"
      ? "/app/trainer/home"
      : "/pending";
  }
  return user.approvalStatus === "approved" ? "/app/user/home" : "/pending";
}

export function LoginScreen() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ user: MeUser }>("/api/auth", {
        method: "POST",
        body: { action: "login", email: values.email, password: values.password },
      });
      router.replace(routeFor(res.user));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in. Try again.");
    } finally {
      setBusy(false);
    }
  };



  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="hero-panel relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <img
          src="/images/brand-hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-55"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/60" aria-hidden />

        <div className="relative z-10 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-strong text-[19px] font-extrabold text-white shadow-lg shadow-red-900/40">
            F
          </span>
          <span className="text-[22px] font-extrabold tracking-tight text-white">
            FIT<span className="text-brand">WISH</span>
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 max-w-md"
        >
          <h1 className="text-[40px] font-extrabold leading-[1.08] tracking-tight text-white">
            Your gym.
            <br />
            <span className="text-brand">Elevated.</span>
          </h1>
          <p className="mt-4 text-[15.5px] leading-relaxed text-white/70">
            Membership, training, workouts, progress and attendance — one calm, premium place for your fitness life.
          </p>
          <div className="mt-8 grid max-w-sm gap-3">
            {[
              { icon: Dumbbell, text: "Real workout plans from real trainers" },
              { icon: Timer, text: "Guided sets with a precise rest timer" },
              { icon: Sparkles, text: "Track weight, photos and progress" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-[13.5px] font-medium text-white/85">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-brand">
                  <f.icon size={15} />
                </span>
                {f.text}
              </div>
            ))}
          </div>
        </motion.div>

        <p className="relative z-10 text-[12px] text-white/40">© {new Date().getFullYear()} FitWish · Premium gym experience</p>
      </section>

      {/* Form panel */}
      {/* Form panel */}
<main className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-8 lg:px-12">

  {/* Mobile hero image */}
  <div className="absolute inset-x-0 top-0 h-[240px] lg:hidden">
    <img
      src="/images/brand-hero.jpg"
      alt=""
      className="absolute inset-0 h-full w-full object-cover opacity-100"
      aria-hidden
    />

    {/* Dark overlay + fade into page */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-bg" />
  </div>
 <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative z-10 mx-auto w-full max-w-[400px]"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-strong text-[17px] font-extrabold text-white shadow-md">
              F
            </span>
            <span className="text-[20px] font-extrabold tracking-tight text-ink">
              FIT<span className="text-brand">WISH</span>
            </span>
          </div>

          <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">Welcome back</h2>
          <p className="mt-1.5 text-[14px] text-ink-2">Sign in to continue your training.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
            {error && (
              <div role="alert" className="card flex items-start gap-2.5 border-err/25 p-3.5">
                <CircleAlert size={17} className="mt-0.5 shrink-0 text-err" />
                <p className="text-[13px] font-medium text-ink">{error}</p>
              </div>
            )}

            <Field label="Email" htmlFor="login-email" error={errors.email?.message}>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="!pl-11"
                  {...register("email")}
                />
              </div>
            </Field>

            <Field label="Password" htmlFor="login-password" error={errors.password?.message}>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                <Input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="!pl-11 !pr-12"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-ink-3 transition hover:text-ink"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Button type="submit" block size="lg" loading={busy} className="mt-2">
              Sign in <ArrowRight size={16} />
            </Button>
          </form>

          <p className="mt-6 text-center text-[13.5px] text-ink-2">
            New to FitWish?{" "}
            <Link href="/register" className="font-semibold text-brand transition hover:text-brand-strong">
              Create account
            </Link>
          </p>

        </motion.div>
      </main>
    </div>
  );
}
