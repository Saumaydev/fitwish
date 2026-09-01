"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtDate } from "@/lib/format";

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  fontSize: 12.5,
  color: "var(--ink)",
  boxShadow: "var(--shadow-1)",
} as const;

export function WeightChart({ data }: { data: { date: string; weight: number | null }[] }) {
  const rows = data.filter((d) => d.weight !== null).map((d) => ({ date: fmtDate(d.date), weight: d.weight }));
  if (rows.length < 2) {
    return (
      <div className="grid h-48 place-items-center text-[13px] text-ink-3">
        Log at least two weight entries to see your trend.
      </div>
    );
  }
  return (
    <div className="h-48 w-full" aria-label="Weight trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickLine={false} axisLine={false} width={52} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} kg`, "Weight"]} />
          <Area type="monotone" dataKey="weight" stroke="var(--brand)" strokeWidth={2.4} fill="url(#weightFill)" dot={{ r: 3, fill: "var(--brand)", strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SignupsChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <div className="h-52 w-full" aria-label="Member sign-ups chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-3)" }} tickLine={false} axisLine={false} width={48} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, "Sign-ups"]} />
          <Area type="monotone" dataKey="count" stroke="var(--brand)" strokeWidth={2.4} fill="url(#signupFill)" dot={{ r: 3, fill: "var(--brand)", strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
