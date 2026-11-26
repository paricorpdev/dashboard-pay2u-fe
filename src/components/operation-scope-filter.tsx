"use client";

import { ArrowLeftRight, Banknote, CircleDollarSign } from "lucide-react";

export type OperationScope = "all" | "payment" | "disbursement";

const options: { id: OperationScope; label: string; icon: typeof CircleDollarSign }[] = [
  { id: "all", label: "Semua alur", icon: ArrowLeftRight },
  { id: "payment", label: "Payment", icon: CircleDollarSign },
  { id: "disbursement", label: "Disbursement", icon: Banknote },
];

export function OperationScopeFilter({
  value,
  onChange,
}: {
  value: OperationScope;
  onChange: (scope: OperationScope) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card/80 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-foreground">Jenis aktivitas</p>
        <p className="text-xs text-muted-foreground">
          Bandingkan dana pembayaran masuk dan transfer keluar.
        </p>
      </div>
      <div className="inline-flex w-full rounded-xl border border-border bg-background/70 p-1 sm:w-auto">
        {options.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:flex-none ${
              value === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
