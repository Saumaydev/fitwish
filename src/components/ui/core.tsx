"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { initialsOf } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, block = false, className = "", children, disabled, ...rest },
  ref
) {
  const cls = [
    "btn",
    `btn-${variant}`,
    size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "",
    block ? "btn-block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      className={cls}
      disabled={disabled || loading}
      {...(rest as Record<string, unknown>)}
    >
      {loading && <Loader2 size={15} className="animate-spin" aria-hidden />}
      {children}
    </motion.button>
  );
});

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = "", ...rest },
  ref
) {
  return <input ref={ref} className={`input ${className}`} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = "", ...rest },
  ref
) {
  return <textarea ref={ref} className={`input ${className}`} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = "", children, ...rest },
  ref
) {
  return (
    <select ref={ref} className={`input appearance-none ${className}`} {...rest}>
      {children}
    </select>
  );
});

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-ink-3">{hint}</span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge / Avatar / Spinner                                            */
/* ------------------------------------------------------------------ */

export function Badge({ tone = "neutral", children, className = "" }: { tone?: "brand" | "ok" | "warn" | "err" | "neutral"; children: ReactNode; className?: string }) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>;
}

export function Avatar({
  name,
  src,
  size = 44,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={style}
        className={`shrink-0 rounded-full border border-line bg-surface-2 object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={{ ...style, fontSize: size * 0.36 }}
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-strong font-bold text-white ${className}`}
      aria-hidden
    >
      {initialsOf(name || "?")}
    </span>
  );
}

export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin text-brand ${className}`} aria-label="Loading" />;
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-ink-3">{icon}</div>}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {hint && <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-2">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page header + stat card                                             */
/* ------------------------------------------------------------------ */

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink md:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-ink-2">{subtitle}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "brand",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "brand" | "neutral" | "ok" | "warn";
}) {
  const iconTone =
    tone === "ok"
      ? "bg-ok/10 text-ok"
      : tone === "warn"
        ? "bg-warn/10 text-warn"
        : tone === "brand"
          ? "bg-brand-soft text-brand"
          : "bg-surface-2 text-ink-2";
  return (
    <div className="card p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold uppercase tracking-wide text-ink-3">{label}</p>
          <p className="tabular mt-1.5 truncate text-[22px] font-bold leading-none tracking-tight text-ink md:text-[26px]">{value}</p>
          {sub && <div className="mt-2 text-[12px] text-ink-2">{sub}</div>}
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconTone}`}>{icon}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex rounded-xl border border-line bg-surface-2 p-1 ${className}`} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`relative h-9 rounded-[10px] px-3.5 text-[13px] font-semibold transition-colors ${
              active ? "text-ink" : "text-ink-2 hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${options.map((x) => x.value).join("-")}`}
                className="absolute inset-0 rounded-[10px] bg-surface shadow-sm ring-1 ring-line"
                transition={{ duration: 0.18, ease: "easeOut" }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress ring                                                       */
/* ------------------------------------------------------------------ */

export function ProgressRing({ percent, size = 84, stroke = 8, label }: { percent: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${clamped}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * clamped) / 100}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="tabular text-[16px] font-bold text-ink">{clamped}%</span>
        {label && <span className="sr-only">{label}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Error banner                                                        */
/* ------------------------------------------------------------------ */

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-start gap-3 border-err/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[14px] font-semibold text-ink">Something went wrong</p>
        <p className="mt-0.5 text-[13px] text-ink-2">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
