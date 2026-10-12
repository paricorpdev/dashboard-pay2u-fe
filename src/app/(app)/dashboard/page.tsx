"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgePercent,
  Coins,
  CreditCard,
  Hash,
  PieChart as PieIcon,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { fetchAnalytics, type AnalyticsBundle } from "@/lib/analytics";
import { useMerchants, useYearOptions } from "@/lib/use-merchants";
import { PeriodFilter, type PeriodValue } from "@/components/period-filter";
import { StatCard } from "@/components/stat-card";
import {
  StatusBar,
  VaQrisDonut,
  VendorDonut,
  VolumeTrendChart,
} from "@/components/charts";
import { Badge, Card, CardHeader, EmptyState, LoadingBlock } from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  MONTH_NAMES,
  formatCurrency,
  formatNumber,
  formatPaymentMethod,
} from "@/lib/utils";

function defaultPeriod(): PeriodValue {
  const now = new Date();
  return {
    mode: "monthly",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    merchantId: "",
  };
}

export default function DashboardPage() {
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
      const message =
        err instanceof ApiError ? err.message : "Gagal memuat data analytics.";
      setError(message);
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.mode, period.month, period.year, period.merchantId]);

  const periodLabel = useMemo(() => {
    if (period.mode === "monthly") {
      return `${MONTH_NAMES[period.month - 1]} ${period.year}`;
    }
    return `Tahun ${period.year}`;
  }, [period]);

  const summary = bundle?.summary;

  // Trend series differs by mode: monthly -> daily, yearly -> per-month.
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">Ringkasan Pembayaran</h2>
        <p className="text-sm text-muted-foreground">
          Pantau volume, metode pembayaran, dan status transaksi untuk periode{" "}
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
        <Card className="border-danger/30 bg-danger/5">
          <div className="flex items-center gap-3 text-danger">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Gagal memuat data</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {loading && !bundle ? <LoadingBlock label="Memuat analytics…" /> : null}

      {summary ? (
        <div className="animate-fade-up space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Volume"
              value={formatCurrency(summary.total_volume_amount)}
              hint={periodLabel}
              icon={Coins}
              tone="primary"
            />
            <StatCard
              label="Total Transaksi"
              value={formatNumber(summary.total_transaction_count)}
              hint={`${formatNumber(summary.success_count)} sukses`}
              icon={Receipt}
              tone="accent"
            />
            <StatCard
              label="Success Rate"
              value={`${summary.success_rate.toFixed(1)}%`}
              hint={`${formatNumber(summary.pending_count)} pending · ${formatNumber(summary.expired_count)} expired`}
              icon={TrendingUp}
              tone="success"
            />
            <StatCard
              label="Total Admin Fee"
              value={formatCurrency(summary.total_admin_fee)}
              hint="Akumulasi biaya admin"
              icon={BadgePercent}
              tone="warning"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title={
                  period.mode === "yearly"
                    ? "Tren Volume per Bulan"
                    : "Tren Volume Harian"
                }
                subtitle={
                  period.mode === "yearly"
                    ? `Akumulasi 12 bulan di tahun ${period.year}`
                    : `Volume transaksi per tanggal di ${periodLabel}`
                }
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <div className="mt-4">
                {volumeTrend.length > 0 ? (
                  <VolumeTrendChart data={volumeTrend} />
                ) : (
                  <EmptyState title="Belum ada data tren" />
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Status Transaksi"
                subtitle="Komposisi status"
                icon={<Hash className="h-4 w-4" />}
              />
              <div className="mt-4">
                {bundle.statusDistribution.length > 0 ? (
                  <StatusBar data={bundle.statusDistribution} />
                ) : (
                  <EmptyState title="Belum ada data status" />
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card highlight>
              <CardHeader
                title="Virtual Account vs QRIS"
                subtitle="Proporsi metode pembayaran"
                icon={<CreditCard className="h-4 w-4" />}
              />
              <div className="mt-4">
                {bundle.vaQrisSplit.length > 0 ? (
                  <VaQrisDonut data={bundle.vaQrisSplit} />
                ) : (
                  <EmptyState title="Belum ada data metode pembayaran" />
                )}
              </div>
            </Card>

            <Card highlight>
              <CardHeader
                title="Berdasarkan Vendor / Bank"
                subtitle="Distribusi per penyedia"
                icon={<PieIcon className="h-4 w-4" />}
                action={
                  <Link
                    href="/analytics"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Detail <ArrowUpRight className="h-3 w-3" />
                  </Link>
                }
              />
              <div className="mt-4">
                {bundle.vendorSplit.length > 0 ? (
                  <VendorDonut data={bundle.vendorSplit} />
                ) : (
                  <EmptyState title="Belum ada data vendor" />
                )}
              </div>
            </Card>
          </div>

          {bundle.paymentMethods.length > 0 ? (
            <Card>
              <CardHeader
                title="Rincian Metode Pembayaran"
                subtitle="Jumlah transaksi & nilai per metode"
                icon={<CreditCard className="h-4 w-4" />}
              />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Metode</th>
                      <th className="pb-2 pr-4 text-right font-medium">Trx</th>
                      <th className="pb-2 pr-4 text-right font-medium">Nilai</th>
                      <th className="pb-2 text-right font-medium">Porsi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.paymentMethods.map((m) => (
                      <tr
                        key={m.payment_method}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2.5 pr-4">
                          <Badge tone="info">
                            {formatPaymentMethod(m.payment_method)}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">
                          {formatNumber(m.count)}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-foreground">
                          {formatCurrency(m.amount)}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                          {m.percentage.toFixed(1)}%
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

      {!loading && !error && bundle && summary?.total_transaction_count === 0 ? (
        <Card>
          <EmptyState
            icon={<PieIcon className="h-6 w-6" />}
            title="Belum ada transaksi pada periode ini"
            description="Coba ubah filter bulan/tahun atau pilih merchant lain untuk melihat data."
          />
        </Card>
      ) : null}
    </div>
  );
}
