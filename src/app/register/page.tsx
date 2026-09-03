"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CircleAlert, Dumbbell, User, Users } from "lucide-react";
import { api } from "@/lib/client";
import { Button, Field, Input, Textarea } from "@/components/ui/core";
import { PhotoPicker } from "@/components/PhotoPicker";
import { APP_NAME } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* Schemas                                                             */
/* ------------------------------------------------------------------ */

const baseSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().min(1, "Enter your email").email("Enter a valid email address"),
  phone: z
    .string()
    .min(1, "Enter your phone number")
    .refine((v) => v.replace(/\D/g, "").length >= 7, "Enter a valid phone number"),
  password: z.string().min(8, "At least 8 characters"),
  photoUrl: z.string().nullable().optional(),
});

const memberSchema = baseSchema;
const trainerSchema = baseSchema.extend({
  qualification: z.string().min(2, "Enter your qualification"),
  experience: z.string().min(1, "Enter your experience"),
  bio: z.string().min(20, "A short bio helps members trust you (20+ chars)"),
  availability: z.string().min(4, "Add your availability, e.g. 5 PM – 9 PM"),
});

type Step = "choose" | "member" | "trainer";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const memberForm = useForm<z.infer<typeof memberSchema>>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", photoUrl: null },
  });
  const trainerForm = useForm<z.infer<typeof trainerSchema>>({
    resolver: zodResolver(trainerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      photoUrl: null,
      qualification: "",
      experience: "",
      bio: "",
      availability: "",
    },
  });

  const submit = async (values: Record<string, unknown>, role: "user" | "trainer") => {
    setBusy(true);
    setFormError(null);
    try {
      await api("/api/auth", {
        method: "POST",
        body: { action: "register", role, ...values },
      });
      router.replace("/pending?welcome=1");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Unable to create your account. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg-soft safe-top">
      <div className="mx-auto w-full max-w-[460px] px-4 pb-12 pt-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={step === "choose" ? "/" : "#"}
            onClick={(e) => {
              if (step !== "choose") {
                e.preventDefault();
                setStep("choose");
                setFormError(null);
              }
            }}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition hover:text-ink"
          >
            <ArrowLeft size={17} />
          </Link>
          <span className="text-[17px] font-extrabold tracking-tight text-ink">
            FIT<span className="text-brand">WISH</span>
          </span>
          <span className="w-10" aria-hidden />
        </div>

        {/* Step: choose role */}
        {step === "choose" && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">Create your account</h1>
            <p className="mt-1.5 text-[14px] text-ink-2">How would you like to join {APP_NAME}?</p>

            <div className="mt-7 grid gap-3.5">
              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={() => setStep("member")}
                className="card card-press flex items-center gap-4 p-5 text-left"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <User size={22} />
                </span>
                <span className="flex-1">
                  <span className="block text-[16px] font-bold text-ink">Join as a Member</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">
                    Train, track progress, attend the gym. Your request goes to the gym admin for approval.
                  </span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-ink-3" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={() => setStep("trainer")}
                className="card card-press flex items-center gap-4 p-5 text-left"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <Dumbbell size={22} />
                </span>
                <span className="flex-1">
                  <span className="block text-[16px] font-bold text-ink">Join as a Trainer</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">
                    Manage clients, plans and attendance — after the admin approves your application.
                  </span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-ink-3" />
              </motion.button>
            </div>

            <p className="mt-6 text-center text-[13.5px] text-ink-2">
              Already have an account?{" "}
              <Link href="/" className="font-semibold text-brand">
                Sign in
              </Link>
            </p>
          </motion.div>
        )}

        {/* Step: member form */}
        {step === "member" && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-[24px] font-extrabold tracking-tight text-ink">Member registration</h1>
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              Your account will be active once the gym admin approves it.
            </p>
            {formError && (
              <div role="alert" className="card mt-4 flex items-start gap-2.5 border-err/25 p-3.5">
                <CircleAlert size={16} className="mt-0.5 shrink-0 text-err" />
                <p className="text-[13px] font-medium text-ink">{formError}</p>
              </div>
            )}
            <form
              className="mt-5 space-y-4"
              onSubmit={memberForm.handleSubmit((v) => submit({ ...v, photoUrl: v.photoUrl ?? null }, "user"))}
              noValidate
            >
              <Field label="Full name" htmlFor="m-name" error={memberForm.formState.errors.name?.message}>
                <Input id="m-name" placeholder="Aman Verma" {...memberForm.register("name")} />
              </Field>
              <Field label="Email" htmlFor="m-email" error={memberForm.formState.errors.email?.message}>
                <Input id="m-email" type="email" placeholder="you@example.com" {...memberForm.register("email")} />
              </Field>
              <Field label="Phone" htmlFor="m-phone" error={memberForm.formState.errors.phone?.message}>
                <Input id="m-phone" type="tel" inputMode="tel" placeholder="+91 98•••• ••••" {...memberForm.register("phone")} />
              </Field>
              <Field label="Password" htmlFor="m-password" error={memberForm.formState.errors.password?.message}>
                <Input id="m-password" type="password" placeholder="At least 8 characters" {...memberForm.register("password")} />
              </Field>
              <Field label="Profile photo (optional)">
                <PhotoPicker
                  scope="profile"
                  value={memberForm.watch("photoUrl") ?? null}
                  onUploaded={(res) => memberForm.setValue("photoUrl", res.url)}
                  onClear={() => memberForm.setValue("photoUrl", null)}
                />
              </Field>
              <Button type="submit" block size="lg" loading={busy} className="mt-2">
                Send approval request
              </Button>
            </form>
          </motion.div>
        )}

        {/* Step: trainer form */}
        {step === "trainer" && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-[24px] font-extrabold tracking-tight text-ink">Trainer application</h1>
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              The gym admin reviews every trainer application before access is granted.
            </p>
            {formError && (
              <div role="alert" className="card mt-4 flex items-start gap-2.5 border-err/25 p-3.5">
                <CircleAlert size={16} className="mt-0.5 shrink-0 text-err" />
                <p className="text-[13px] font-medium text-ink">{formError}</p>
              </div>
            )}
            <form
              className="mt-5 space-y-4"
              onSubmit={trainerForm.handleSubmit((v) => submit({ ...v, photoUrl: v.photoUrl ?? null }, "trainer"))}
              noValidate
            >
              <Field label="Full name" htmlFor="t-name" error={trainerForm.formState.errors.name?.message}>
                <Input id="t-name" placeholder="Rahul Sharma" {...trainerForm.register("name")} />
              </Field>
              <Field label="Email" htmlFor="t-email" error={trainerForm.formState.errors.email?.message}>
                <Input id="t-email" type="email" placeholder="you@example.com" {...trainerForm.register("email")} />
              </Field>
              <Field label="Phone" htmlFor="t-phone" error={trainerForm.formState.errors.phone?.message}>
                <Input id="t-phone" type="tel" inputMode="tel" placeholder="+91 98•••• ••••" {...trainerForm.register("phone")} />
              </Field>
              <Field label="Password" htmlFor="t-password" error={trainerForm.formState.errors.password?.message}>
                <Input id="t-password" type="password" placeholder="At least 8 characters" {...trainerForm.register("password")} />
              </Field>
              <Field label="Qualification" htmlFor="t-qual" error={trainerForm.formState.errors.qualification?.message}>
                <Input id="t-qual" placeholder="Certified Strength & Conditioning Coach" {...trainerForm.register("qualification")} />
              </Field>
              <Field label="Experience" htmlFor="t-exp" error={trainerForm.formState.errors.experience?.message}>
                <Input id="t-exp" placeholder="8 years" {...trainerForm.register("experience")} />
              </Field>
              <Field label="Availability" htmlFor="t-avail" error={trainerForm.formState.errors.availability?.message}>
                <Input id="t-avail" placeholder="5 PM – 9 PM" {...trainerForm.register("availability")} />
              </Field>
              <Field label="Bio" htmlFor="t-bio" error={trainerForm.formState.errors.bio?.message}>
                <Textarea id="t-bio" placeholder="Tell members about your training style…" {...trainerForm.register("bio")} />
              </Field>
              <Field label="Profile photo (optional)">
                <PhotoPicker
                  scope="profile"
                  value={trainerForm.watch("photoUrl") ?? null}
                  onUploaded={(res) => trainerForm.setValue("photoUrl", res.url)}
                  onClear={() => trainerForm.setValue("photoUrl", null)}
                />
              </Field>
              <Button type="submit" block size="lg" loading={busy} className="mt-2">
                Submit application
              </Button>
            </form>
          </motion.div>
        )}

        <div className="mt-8 flex items-center justify-center gap-1.5 text-[12px] text-ink-3">
          <Users size={13} />
          Protected & approved by the Fitwish admin team
        </div>
      </div>
    </div>
  );
}
