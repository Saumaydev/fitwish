"use client";

import { useState } from "react";
import useSWR from "swr";
import { Award, Briefcase, Clock3, Dumbbell, Search, Send } from "lucide-react";
import { api } from "@/lib/client";
import { Avatar, Badge, Button, EmptyState, Input, PageHeader, Skeleton } from "@/components/ui/core";
import { useToast } from "@/components/ui/toast";
import type { TrainerDTO, TrainerRequestDTO } from "@/lib/types";

export default function TrainersDirectory() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const { data, isLoading, error, mutate } = useSWR<{ trainers: TrainerDTO[] }>("/api/gym?action=trainers");
  const { data: myReqs, mutate: mutateReqs } = useSWR<{ requests: TrainerRequestDTO[] }>("/api/gym?action=myRequests");

  const filtered = (data?.trainers ?? []).filter((t) =>
    `${t.name} ${t.qualification ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())
  );

  const request = async (trainerUid: string) => {
    setBusyUid(trainerUid);
    try {
      await api("/api/gym", { method: "POST", body: { action: "requestTrainer", trainerUid } });
      toast("success", "Request sent! The trainer will review it.");
      mutateReqs();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to send the request.");
    } finally {
      setBusyUid(null);
    }
  };

  const statusOf = (uid: string): "pending" | "accepted" | "rejected" | null => {
    const req = myReqs?.requests.find((r) => r.trainerUid === uid);
    return req ? (req.status as "pending" | "accepted" | "rejected") : null;
  };

  return (
    <div>
      <PageHeader title="Find a Trainer" subtitle="Request to train with an approved coach" />

      <div className="relative mb-4">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
        <Input placeholder="Search by name or qualification…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search trainers" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-[22px]" />
          <Skeleton className="h-28 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load trainers."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Dumbbell size={20} />} title="No trainers found" hint={q ? "Try a different search." : "Approved trainers will appear here."} />
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const status = statusOf(t.uid);
            return (
              <div key={t.uid} className="card p-4.5 p-5">
                <div className="flex items-start gap-3.5">
                  <Avatar name={t.name} src={t.photoUrl} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[15.5px] font-bold text-ink">{t.name}</h2>
                      <Badge tone="ok">Active</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-2">
                      <Award size={13} className="shrink-0 text-ink-3" /> {t.qualification || "Certified trainer"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-2">
                      <Briefcase size={13} className="shrink-0 text-ink-3" /> {t.experience || "Experienced"} experience
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-2">
                      <Clock3 size={13} className="shrink-0 text-ink-3" /> {t.availability || "Availability on request"}
                    </p>
                  </div>
                </div>
                {t.bio && <p className="mt-3 line-clamp-2 rounded-xl bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-2">{t.bio}</p>}
                <div className="mt-3.5">
                  {status === "accepted" ? (
                    <div className="flex h-11 items-center justify-center rounded-2xl bg-ok/10 text-[13.5px] font-bold text-ok">
                      ✓ Your trainer
                    </div>
                  ) : status === "pending" ? (
                    <div className="flex h-11 items-center justify-center rounded-2xl bg-warn/10 text-[13.5px] font-bold text-warn">
                      Request pending…
                    </div>
                  ) : (
                    <Button block onClick={() => request(t.uid)} loading={busyUid === t.uid}>
                      <Send size={15} /> Request trainer
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
