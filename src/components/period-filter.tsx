"use client";

import { CalendarDays, Filter, Store } from "lucide-react";
import { MONTH_NAMES } from "@/lib/utils";
import type { MerchantOption } from "@/lib/use-merchants";
import type { PeriodMode } from "@/lib/types";
import { Label, Select } from "@/components/ui";

export interface PeriodValue {
  mode: PeriodMode;
  month: number;
  year: number;
  merchantId: string;
}

export function PeriodFilter({
  value,
  onChange,
  merchants,
  years,
  loadingMerchants,
}: {
  value: PeriodValue;
  onChange: (next: PeriodValue) => void;
  merchants: MerchantOption[];
  years: number[];
  loadingMerchants?: boolean;
}) {
  const set = (patch: Partial<PeriodValue>) => onChange({ ...value, ...patch });

  const yearOptions =
    years.length > 0
      ? years
      : Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="flex flex-col gap-4 rounded-2xl glass p-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
          <Filter className="h-4 w-4" />
        </span>
        Filter Periode
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* Mode toggle */}
        <div>
          <Label>Mode</Label>
          <div className="inline-flex rounded-xl border border-border bg-background/60 p-1">
            {(["monthly", "yearly"] as PeriodMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set({ mode: m })}
                className={
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors " +
                  (value.mode === m
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {m === "monthly" ? "Bulanan" : "Tahunan"}
              </button>
            ))}
          </div>
        </div>

        {/* Month (only in monthly mode) */}
        {value.mode === "monthly" ? (
          <div className="w-40">
            <Label>Bulan</Label>
            <Select
              value={value.month}
              onChange={(e) => set({ month: Number(e.target.value) })}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        {/* Year */}
        <div className="w-32">
          <Label>Tahun</Label>
          <Select
            value={value.year}
            onChange={(e) => set({ year: Number(e.target.value) })}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>

        {/* Merchant filter */}
        <div className="w-56">
          <Label>
            <span className="inline-flex items-center gap-1">
              <Store className="h-3 w-3" /> Merchant
            </span>
          </Label>
          <Select
            value={value.merchantId}
            onChange={(e) => set({ merchantId: e.target.value })}
            disabled={loadingMerchants}
          >
            <option value="">Semua Merchant</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
