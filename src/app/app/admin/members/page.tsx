"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { fmtDate, fmtMoney } from "@/lib/format";
import { Avatar, Badge, EmptyState, Input, PageHeader, Segmented, Skeleton } from "@/components/ui/core";
import type { Paginated, MemberRowDTO } from "@/lib/types";

type Filter = "all" | "pending" | "due" | "expiring" | "no-membership";

export default function AdminMembers() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  const { data, error, isLoading, mutate } = useSWR<Paginated<MemberRowDTO>>(
    `/api/admin?action=members&q=${encodeURIComponent(debouncedQ)}&filter=${filter}&page=${page}`,
    { keepPreviousData: true }
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle={data ? `${data.total} member accounts` : "Member management"}
        right={
          <Link href="/app/admin/requests" className="btn btn-secondary btn-sm">
            Pending approvals
          </Link>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input placeholder="      Search name, email or phone…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search members" />
        </div>
      </div>

      <Segmented
        className="mb-4 max-w-full overflow-x-auto hide-scrollbar [&>button]:shrink-0"
        options={[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "due", label: "Payment due" },
          { value: "expiring", label: "Expiring" },
          { value: "no-membership", label: "No plan" },
        ]}
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setPage(1);
        }}
      />

      {isLoading && !data ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-[22px]" />
          ))}
        </div>
      ) : error ? (
        <div className="card border-err/25 p-5 text-[14px] font-medium text-ink">
          {error instanceof Error ? error.message : "Couldn't load members."}
          <button className="ml-2 font-semibold text-brand" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      ) : !data?.items.length ? (
        <EmptyState icon={<Users size={20} />} title="No members found" hint="Try a different filter or search." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11.5px] uppercase tracking-wide text-ink-3">
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold">Trainer</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((m) => (
                  <tr key={m.uid} className="transition hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <Link href={`/app/admin/members/${m.uid}`} className="flex items-center gap-2.5">
                        <Avatar name={m.name} src={m.photoUrl} size={34} />
                        <span>
                          <span className="block font-bold text-ink">{m.name}</span>
                          <span className="block text-[12px] text-ink-3">{m.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">{m.plan ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          m.approvalStatus === "pending"
                            ? "warn"
                            : m.membershipStatus === "active"
                              ? "ok"
                              : m.membershipStatus === "expiring"
                                ? "warn"
                                : m.membershipStatus === "expired"
                                  ? "err"
                                  : "neutral"
                        }
                      >
                        {m.approvalStatus === "pending" ? "Pending" : m.membershipStatus ?? "—"}
                      </Badge>
                    </td>
                    <td className="tabular px-4 py-3 font-semibold text-ink">{m.dueAmount ? fmtMoney(m.dueAmount) : "—"}</td>
                    <td className="px-4 py-3 text-ink-2">{m.trainerName ?? "—"}</td>
                    <td className="tabular px-4 py-3 text-ink-2">{fmtDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2.5 md:hidden">
            {data.items.map((m) => (
              <Link key={m.uid} href={`/app/admin/members/${m.uid}`} className="card card-press block p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} src={m.photoUrl} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-ink">{m.name}</p>
                    <p className="truncate text-[12px] text-ink-2">{m.email}</p>
                  </div>
                  <Badge
                    tone={
                      m.approvalStatus === "pending"
                        ? "warn"
                        : m.membershipStatus === "active"
                          ? "ok"
                          : m.membershipStatus === "expiring"
                            ? "warn"
                            : m.membershipStatus === "expired"
                              ? "err"
                              : "neutral"
                    }
                  >
                    {m.approvalStatus === "pending" ? "Pending" : m.plan ?? "No plan"}
                  </Badge>
                </div>
                <div className="tabular mt-2.5 flex items-center justify-between border-t border-line pt-2.5 text-[12px] text-ink-2">
                  <span>{m.trainerName ? `Trainer: ${m.trainerName}` : "No trainer"}</span>
                  <span className="font-bold text-ink">{m.dueAmount ? `Due ${fmtMoney(m.dueAmount)}` : "No due"}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
                className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition hover:text-ink disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="tabular text-[13px] font-semibold text-ink-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
                className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition hover:text-ink disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
