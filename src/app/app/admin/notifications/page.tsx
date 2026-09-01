"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { BellRing, Send } from "lucide-react";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import { Badge, Button, EmptyState, Field, Input, PageHeader, Segmented, Skeleton, Textarea } from "@/components/ui/core";
import { useToast } from "@/components/ui/toast";

interface SentNotification {
  id: string;
  recipientUid: string;
  recipientName: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
}

type Audience = "users" | "trainers" | "all" | "single";

export default function AdminNotifications() {
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<{ notifications: SentNotification[] }>("/api/admin?action=notifications", {
    refreshInterval: 30000,
  });
  const [audience, setAudience] = useState<Audience>("users");
  const [singleQ, setSingleQ] = useState("");
  const [singleUser, setSingleUser] = useState<{ id: string; name: string } | null>(null);
  const [results, setResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (audience !== "single" || singleQ.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api<{ users: { id: string; name: string; email: string }[] }>(
          `/api/admin?action=searchUsers&q=${encodeURIComponent(singleQ)}`
        );
        setResults(res.users);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [singleQ, audience]);

  const send = async () => {
    setBusy(true);
    try {
      const res = await api<{ count: number }>("/api/admin", {
        method: "POST",
        body: {
          action: "sendNotification",
          audience,
          userUid: audience === "single" ? singleUser?.id : undefined,
          title,
          body,
        },
      });
      toast("success", `Sent to ${res.count} ${res.count === 1 ? "person" : "people"}.`);
      setTitle("");
      setBody("");
      setSingleUser(null);
      setSingleQ("");
      mutate();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Unable to send the notification.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Announcements and gym updates" />

      {/* Composer */}
      <div className="card mb-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <BellRing size={16} className="text-brand" />
          <h2 className="text-[15px] font-bold tracking-tight text-ink">Send announcement</h2>
        </div>
        <div className="space-y-4">
          <Field label="Audience">
            <Segmented
              className="w-full [&>button]:flex-1"
              options={[
                { value: "users", label: "Members" },
                { value: "trainers", label: "Trainers" },
                { value: "all", label: "Everyone" },
                { value: "single", label: "One person" },
              ]}
              value={audience}
              onChange={(v) => {
                setAudience(v);
                setSingleUser(null);
              }}
            />
          </Field>

          {audience === "single" && (
            <div className="relative">
              <Input placeholder="Search by name or email…" value={singleQ} onChange={(e) => setSingleQ(e.target.value)} aria-label="Search recipient" />
              {results.length > 0 && !singleUser && (
                <div className="card absolute inset-x-0 top-12 z-20 max-h-48 overflow-y-auto p-1.5">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSingleUser(r);
                        setSingleQ(r.name);
                        setResults([]);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2"
                    >
                      <span className="text-[13px] font-semibold text-ink">{r.name}</span>
                      <span className="text-[11.5px] text-ink-3">{r.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {singleUser && <p className="mt-1.5 text-[12.5px] font-semibold text-ok">→ {singleUser.name}</p>}
            </div>
          )}

          <Field label="Title">
            <Input placeholder="Holiday notice, new equipment…" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Message">
            <Textarea rows={3} placeholder="Write the announcement…" value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <Button block onClick={send} loading={busy} disabled={!title.trim() || !body.trim() || (audience === "single" && !singleUser)}>
            <Send size={15} /> Send notification
          </Button>
        </div>
      </div>

      {/* History */}
      <h2 className="mb-2.5 text-[15px] font-bold tracking-tight text-ink">Recently sent</h2>
      {isLoading ? (
        <div className="space-y-2.5">
          <Skeleton className="h-16 w-full rounded-[22px]" />
          <Skeleton className="h-16 w-full rounded-[22px]" />
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load notifications."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : !data?.notifications.length ? (
        <EmptyState icon={<BellRing size={20} />} title="Nothing sent yet" hint="System notifications (approvals, payments, reports) and your announcements appear here." />
      ) : (
        <div className="card divide-y divide-line overflow-hidden">
          {data.notifications.slice(0, 30).map((n) => (
            <div key={n.id} className="flex items-start gap-3 p-3.5">
              <Badge tone={n.type === "announcement" ? "brand" : "neutral"} className="mt-0.5 shrink-0">
                {n.type === "announcement" ? "announcement" : n.type.replace(/_/g, " ")}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-ink">
                  {n.title} <span className="font-medium text-ink-3">→ {n.recipientName}</span>
                </p>
                <p className="line-clamp-1 text-[12.5px] text-ink-2">{n.body}</p>
              </div>
              <span className="shrink-0 text-[11px] text-ink-3">{timeAgo(n.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
