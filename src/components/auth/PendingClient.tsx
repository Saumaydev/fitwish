"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, CircleX, Clock3, Dumbbell, Hourglass, User } from "lucide-react";
import { api } from "@/lib/client";
import { Button, Spinner } from "@/components/ui/core";
import type { MeUser } from "@/lib/types";

function targetFor(user: MeUser): string {
  if (user.role === "admin") return "/app/admin/dashboard";
  if (user.role === "user") return "/app/user/home";
  return "/app/trainer/home";
}

export default function PendingClient() {
  const router = useRouter();
  const params = useSearchParams();
  const isWelcome = params.get("welcome") === "1";
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectBusy, setConnectBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const data = await api<{ user: MeUser | null }>("/api/auth");
        if (cancelled) return;
        const u = data.user;
        if (!u) {
          router.replace("/");
          return;
        }
        setUser(u);
        setLoading(false);
        const approved = u.role === "user" ? u.approvalStatus === "approved" : u.trainer?.isActive && u.trainer.approvalStatus === "approved";
        if (approved) {
          router.replace(targetFor(u));
          return;
        }
        timer = setTimeout(poll, 5000);
      } catch {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(poll, 6000);
        }
      }
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  const rejected = user && (user.role === "user" ? user.approvalStatus === "rejected" : user.trainer?.approvalStatus === "rejected");

  const connect = async () => {
    if (!user || user.role !== "trainer" || connectBusy) return;
    setConnectBusy(true);
    try {
      await api("/api/trainer", { method: "POST", body: { action: "connectAdmin" } });
      setConnectBusy(false);
    } catch {
      setConnectBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-4">
        <Spinner size={26} />
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-10 safe-top safe-bottom">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="card w-full max-w-[420px] p-7 text-center"
      >
        {rejected ? (
          <>
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-err/10 text-err">
              <CircleX size={30} />
            </span>
            <h1 className="mt-5 text-[22px] font-extrabold tracking-tight text-ink">Application declined</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              Your request wasn&apos;t approved this time. Please contact the gym front desk for more details.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={async () => {
                await api("/api/auth", { method: "POST", body: { action: "logout" } }).catch(() => {});
                router.replace("/");
              }}
            >
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-brand-soft text-brand">
              {user?.role === "trainer" ? <Dumbbell size={30} /> : <User size={30} />}
            </span>
            <h1 className="mt-5 text-[22px] font-extrabold tracking-tight text-ink">
              {isWelcome ? "Request sent" : "Waiting for approval"}
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              {user?.role === "trainer"
                ? "The gym admin is reviewing your trainer application. You'll get full access the moment it's approved."
                : "The gym admin needs to approve your membership account. This page updates automatically — you can sign in as soon as you're approved."}
            </p>

            <div className="mx-auto mt-6 flex w-fit items-center gap-2.5 rounded-2xl bg-surface-2 px-4 py-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
              </span>
              <span className="text-[13px] font-semibold text-ink-2">Checking for approval…</span>
            </div>

            {user?.role === "trainer" && (
              <Button variant="secondary" className="mt-5" onClick={connect} loading={connectBusy}>
                <Hourglass size={15} /> Connect with Admin
              </Button>
            )}

            <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-ink-3">
              <Clock3 size={13} />
              Approval usually takes a few hours
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
