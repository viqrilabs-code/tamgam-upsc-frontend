"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ApiError } from "@/lib/api";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** 24-spoke wheel — a nod to the Ashoka Chakra; doubles as the loading spinner. */
export function Chakra({ size = 28, spin = false, className = "" }: { size?: number; spin?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className={cx(spin && "chakra-spin", className)}>
      <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="24" cy="24" r="4" fill="currentColor" />
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i * Math.PI * 2) / 24;
        return (
          <line key={i} x1={24 + 5 * Math.cos(a)} y1={24 + 5 * Math.sin(a)} x2={24 + 19 * Math.cos(a)}
                y2={24 + 19 * Math.sin(a)} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        );
      })}
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={cx("inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight", className)}>
      <span className="text-primary"><Chakra size={30} /></span>
      <span>Tam<span className="text-saffron">Gam</span></span>
    </Link>
  );
}

export function Card({ children, className = "", sticker = false, as: As = "div" }:
  { children: ReactNode; className?: string; sticker?: boolean; as?: "div" | "section" | "article" }) {
  return (
    <As className={cx("rounded-3xl bg-surface p-5", sticker ? "sticker" : "border border-line", className)}>
      {children}
    </As>
  );
}

type Variant = "primary" | "ghost" | "outline" | "lime" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink sticker sticker-hover",
  lime: "bg-lime text-[#17152b] sticker sticker-hover",
  outline: "bg-surface text-ink border-2 border-ink dark:border-line hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2",
  danger: "bg-danger text-white hover:opacity-90",
};

export function Button({ variant = "primary", className = "", loading, children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx("inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold",
        "disabled:cursor-not-allowed disabled:opacity-50", VARIANTS[variant], className)}
    >
      {loading && <Chakra size={16} spin />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", className = "", children }:
  { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cx("inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold",
      VARIANTS[variant], className)}>
      {children}
    </Link>
  );
}

type Tone = "neutral" | "primary" | "saffron" | "green" | "danger" | "lime";
const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  primary: "bg-primary-soft text-primary",
  saffron: "bg-saffron-soft text-saffron",
  green: "bg-green-soft text-green",
  danger: "bg-danger-soft text-danger",
  lime: "bg-lime text-[#17152b]",
};

export function Chip({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function PageHeader({ kicker, title, sub, action }: { kicker?: string; title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker && <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-saffron">{kicker}</div>}
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-ink-2">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-primary" role="status">
      <Chakra size={32} spin />
      <span className="text-sm font-semibold text-muted">{label}…</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const e = error as ApiError;
  const msg = e?.problem?.detail || e?.problem?.title || e?.message || "Something went wrong";
  return (
    <div className="rounded-2xl border-2 border-danger/40 bg-danger-soft p-4 text-sm text-danger" role="alert">
      <div className="font-bold">{e?.problem?.title && e.problem.detail ? e.problem.title : "Oops"}</div>
      <div className="mt-0.5">{msg}</div>
      {e?.status === undefined && <div className="mt-1 text-xs opacity-80">Is the backend running on the API base URL?</div>}
      {typeof e?.problem?.request_id === "string" && (
        <div className="mt-1 font-mono text-[10px] opacity-70">Ref: {e.problem.request_id} — quote this if you contact support</div>
      )}
      {onRetry && <button onClick={onRetry} className="mt-2 font-bold underline">Try again</button>}
    </div>
  );
}

export function Empty({ icon = "🪷", title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="grain rounded-3xl border-2 border-dashed border-line p-10 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="mt-2 font-display text-lg font-bold">{title}</div>
      {children && <div className="mt-1 text-sm text-ink-2">{children}</div>}
    </div>
  );
}

/** Horizontal magnitude bar (single series, one hue). Value text stays in ink. */
export function Bar({ value, max = 100, tone = "primary", label, hint }:
  { value: number | null | undefined; max?: number; tone?: "primary" | "saffron" | "green" | "danger"; label?: string; hint?: string }) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, (100 * value) / max));
  const fill = { primary: "bg-primary", saffron: "bg-saffron", green: "bg-green", danger: "bg-danger" }[tone];
  return (
    <div title={hint} className="group">
      {label && <div className="mb-1 flex justify-between text-xs text-ink-2"><span>{label}</span>
        <span className="font-mono font-semibold text-ink">{value == null ? "—" : Math.round(value)}</span></div>}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className={cx("h-full rounded-full transition-all", fill)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Progress ring — a stat tile, not a chart: one number, one hue. */
export function Ring({ value, max = 100, size = 120, stroke = 12, children, tone = "primary" }:
  { value: number; max?: number; size?: number; stroke?: number; children?: ReactNode; tone?: "primary" | "saffron" | "green" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const color = { primary: "var(--primary)", saffron: "var(--saffron)", green: "var(--green)" }[tone];
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose} role="dialog" aria-modal>
      <div className="pop w-full max-w-md rounded-3xl bg-surface p-6 sticker" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full px-2 text-xl text-muted hover:text-ink" aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }:
  { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-surface-2 p-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cx("rounded-xl px-3 py-1.5 text-sm font-semibold transition",
            value === o.value ? "bg-surface text-ink shadow-sm ring-2 ring-ink dark:ring-line" : "text-muted hover:text-ink")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
