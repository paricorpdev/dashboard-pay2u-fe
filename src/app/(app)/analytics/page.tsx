"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  CreditCard,
  PieChart as PieIcon,
} from "lucide-react";
import { fetchAnalytics, type AnalyticsBundle } from "@/lib/analytics";
import { useMerchants, useYearOptions } from "@/lib/use-merchants";
import { PeriodFilter, type PeriodValue } from "@/components/period-filter";
import {
  StatusTrendChart,
  VaQrisDonut,
  VendorDonut,
  VolumeTrendChart,
} from "@/components/charts";
import { Card, CardHeader, EmptyState, LoadingBlock } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { MONTH_NAMES, formatCurrency, formatNumber } from "@/lib/utils";

function defaultPeriod(): PeriodValue {
  const now = new Date();
  return {
    mode: "yearly",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    merchantId: "",
  };
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodValue>(defaultPeriod);
  const { merchants, loading: loadingMerchants } = useMerchants();
  const years = useYearOptions();

  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: PeriodValue) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalytics({
        mode: p.mode,
        month: p.month,
        year: p.year,
        merchantId: p.merchantId || undefined,
      });
      setBundle(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat analytics.");
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.mode, period.month, period.year, period.merchantId]);

  const periodLabel =
    period.mode === "monthly"
      ? `${MONTH_NAMES[period.month - 1]} ${period.year}`
      : `Tahun ${period.year}`;

  const volumeTrend = useMemo(() => {
    if (!bundle) return [];
    if (period.mode === "yearly") {
      return bundle.yearSeries.map((y) => ({
        label: y.label,
        volume: y.volume,
        count: y.count,
      }));
    }
    return bundle.dailyTrend.map((d) => ({
      label: `${d.day}`,
      volume: d.total_amount,
      count: d.total_count,
    }));
  }, [bundle, period.mode]);

  const statusTrend = useMemo(() => {
    if (!bundle) return [];
    if (period.mode === "yearly") {
      return bundle.yearSeries.map((y) => ({
        label: y.label,
        count: y.count,
        success: y.success,
        pending: y.pending,
        expired: y.expired,
      }));
    }
    return bundle.dailyTrend.map((d) => ({
      label: `${d.day}`,
      count: d.total_count,
      success: d.success_count,
      pending: d.pending_count,
      expired: d.expired_count,
    }));
  }, [bundle, period.mode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">Analytics Mendalam</h2>
        <p className="text-sm text-muted-foreground">
          Analisis grafik volume, metode pembayaran (VA/QRIS), vendor, dan status untuk{" "}
          <span className="font-medium text-foreground">{periodLabel}</span>.
        </p>
      </div>

      <PeriodFilter
        value={period}
        onChange={setPeriod}
        merchants={merchants}
        years={years}
        loadingMerchants={loadingMerchants}
      />

      {error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading && !bundle ? <LoadingBlock label="Memuat analytics…" /> : null}

      {bundle ? (
        <div className="animate-fade-up space-y-6">
          <Card>
            <CardHeader
              title={
                period.mode === "yearly"
                  ? "Grafik Volume Tahunan"
                  : "Grafik Volume Bulanan"
              }
              subtitle={
                period.mode === "yearly"
                  ? `Total volume tiap bulan selama ${period.year}`
                  : `Total volume harian pada ${periodLabel}`
              }
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <div className="mt-4">
              {volumeTrend.length > 0 ? (
                <VolumeTrendChart data={volumeTrend} />
              ) : (
                <EmptyState title="Belum ada data volume" />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Tren Status Transaksi"
              subtitle={
                period.mode === "yearly"
                  ? "Komposisi sukses / pending / expired tiap bulan"
                  : "Komposisi sukses / pending / expired tiap tanggal"
              }
              icon={<Activity className="h-4 w-4" />}
            />
            <div className="mt-4">
              {statusTrend.length > 0 ? (
                <StatusTrendChart data={statusTrend} />
              ) : (
                <EmptyState title="Belum ada data status" />
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card highlight>
              <CardHeader
                title="Virtual Account vs QRIS"
                subtitle="Perbandingan metode pembayaran"
                icon={<CreditCard className="h-4 w-4" />}
              />
              <div className="mt-4">
                {bundle.vaQrisSplit.length > 0 ? (
                  <VaQrisDonut data={bundle.vaQrisSplit} />
                ) : (
                  <EmptyState title="Belum ada data metode pembayaran" />
                )}
              </div>
              {bundle.vaQrisSplit.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {bundle.vaQrisSplit.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm"
                    >
                      <span className="text-foreground">{s.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatNumber(s.value)} trx · {formatCurrency(s.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>

            <Card highlight>
              <CardHeader
                title="Distribusi Vendor / Bank"
                subtitle="Jumlah transaksi per penyedia"
                icon={<Building2 className="h-4 w-4" />}
              />
              <div className="mt-4">
                {bundle.vendorSplit.length > 0 ? (
                  <VendorDonut data={bundle.vendorSplit} />
                ) : (
                  <EmptyState title="Belum ada data vendor" />
                )}
              </div>
              {bundle.vendorSplit.length > 0 ? (
                <div className="mt-4 max-h-40 space-y-2 overflow-y-auto pr-1">
                  {bundle.vendorSplit.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm"
                    >
                      <span className="inline-flex items-center gap-2 text-foreground">
                        <PieIcon className="h-3.5 w-3.5 text-primary" />
                        {s.name}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatNumber(s.value)} trx
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          </div>

          {period.mode === "yearly" && bundle.yearSeries.some((y) => y.count > 0) ? (
            <Card>
              <CardHeader
                title="Rincian Per Bulan"
                subtitle={`Ringkasan tahun ${period.year}`}
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Bulan</th>
                      <th className="pb-2 pr-4 text-right font-medium">Trx</th>
                      <th className="pb-2 pr-4 text-right font-medium">Sukses</th>
                      <th className="pb-2 pr-4 text-right font-medium">Pending</th>
                      <th className="pb-2 pr-4 text-right font-medium">Expired</th>
                      <th className="pb-2 text-right font-medium">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.yearSeries.map((y) => (
                      <tr
                        key={y.month}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2.5 pr-4 text-foreground">
                          {MONTH_NAMES[y.month - 1]}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">
                          {formatNumber(y.count)}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-success">
                          {formatNumber(y.success)}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-warning">
                          {formatNumber(y.pending)}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-danger">
                          {formatNumber(y.expired)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-foreground">
                          {formatCurrency(y.volume)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
