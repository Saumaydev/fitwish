"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { BellOff, CheckCheck, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import { Button, EmptyState, PageHeader, Skeleton } from "@/components/ui/core";
import { useToast } from "@/components/ui/toast";
import type { NotificationDTO } from "@/lib/types";

export default function TrainerNotificationsPage() {
  const toast = useToast();
  const { data, isLoading, error, mutate } = useSWR<{ notifications: NotificationDTO[] }>("/api/misc?action=notifications", {
    refreshInterval: 20000,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  const open = async (n: NotificationDTO) => {
    if (n.readAt) return;
    try {
      await api("/api/misc", { method: "PATCH", body: { action: "markRead", id: n.id } });
      mutate();
    } catch {
      /* non-fatal */
    }
  };

  const markAll = async () => {
    try {
      await api("/api/misc", { method: "PATCH", body: { action: "markRead", all: true } });
      toast("success", "All notifications marked as read.");
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to update.");
    }
  };

  const dismiss = async (id: string) => {
    setBusyId(id);
    try {
      await api("/api/misc", { method: "PATCH", body: { action: "dismiss", id } });
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to remove the notification.");
    } finally {
      setBusyId(null);
    }
  };

  const unread = data?.notifications.filter((n) => !n.readAt).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : "You're all caught up"}
        right={
          unread > 0 ? (
            <Button size="sm" variant="secondary" onClick={markAll}>
              <CheckCheck size={14} /> Mark all read
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-[22px]" />
          <Skeleton className="h-20 w-full rounded-[22px]" />
          <Skeleton className="h-20 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load notifications."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : !data?.notifications.length ? (
        <EmptyState icon={<BellOff size={20} />} title="No notifications" hint="Gym updates, client requests and admin messages will appear here." />
      ) : (
        <div className="space-y-2.5">
          {data.notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.2), duration: 0.22 }}
              onClick={() => open(n)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open(n);
                }
              }}
              className="card card-press relative block w-full cursor-pointer p-4 text-left"
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-ink-3/40" : "bg-brand"}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13.5px] font-bold text-ink">{n.title}</p>
                    <span className="shrink-0 text-[11px] text-ink-3">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{n.body}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(n.id);
                  }}
                  aria-label="Dismiss notification"
                  disabled={busyId === n.id}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-3 transition hover:bg-surface-2 hover:text-err"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
