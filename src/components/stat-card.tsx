"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "accent" | "success" | "warning" | "danger";
  trend?: { value: string; positive?: boolean };
}

const toneRing: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "from-primary/30 to-primary/5 text-primary",
  accent: "from-accent/30 to-accent/5 text-accent",
  success: "from-success/30 to-success/5 text-success",
  warning: "from-warning/30 to-warning/5 text-warning",
  danger: "from-danger/30 to-danger/5 text-danger",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  trend,
}: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl glass p-5 shadow-lg shadow-black/20 transition-transform duration-200 hover:-translate-y-0.5">
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-60 blur-2xl",
          toneRing[tone].split(" ").slice(0, 2).join(" "),
        )}
      />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br",
            toneRing[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {trend ? (
        <p
          className={cn(
            "mt-3 text-xs font-medium",
            trend.positive ? "text-success" : "text-danger",
          )}
        >
          {trend.value}
        </p>
      ) : null}
    </div>
  );
}
