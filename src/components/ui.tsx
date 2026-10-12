"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  className,
  children,
  highlight,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { highlight?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl glass p-5 shadow-lg shadow-black/20",
        highlight && "gradient-border",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
            {icon}
          </span>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Button ───────────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25",
  secondary: "bg-muted text-foreground hover:bg-muted/70 border border-border",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "bg-danger/90 text-white hover:bg-danger shadow-lg shadow-danger/20",
  outline: "border border-border text-foreground hover:bg-muted",
};

export function Button({
  variant = "primary",
  className,
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-60",
        buttonVariants[variant],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const badgeTones: Record<BadgeTone, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  info: "bg-accent/15 text-accent border-accent/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Map a transaction/user status string to a badge tone. */

// ── Inputs ──────────────────────────────────────────────────────────────────────
export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full appearance-none rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({
  className,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium text-muted-foreground", className)}
      {...props}
    >
      {children}
    </label>
  );
}

// ── States ──────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-primary", className)} />;
}

export function LoadingBlock({ label = "Memuat data…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Spinner className="h-7 w-7" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      {icon ? (
        <span className="mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function statusTone(status: string): BadgeTone {
  switch (status?.toUpperCase()) {
    case "SUCCESS":
    case "PAID":
    case "ACTIVE":
      return "success";
    case "PENDING":
      return "warning";
    case "EXPIRED":
    case "FAILED":
    case "INACTIVE":
      return "danger";
    default:
      return "neutral";
  }
}
