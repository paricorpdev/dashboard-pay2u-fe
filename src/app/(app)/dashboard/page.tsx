"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BanknoteArrowDown,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  Clock3,
  ReceiptText,
  Store,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useMerchants } from "@/lib/use-merchants";
import { StatCard } from "@/components/stat-card";
import { Badge, Card, CardHeader, EmptyState, LoadingBlock } from "@/components/ui";
import type { AnalyticSummary, DisbursementSummary } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function getCurrentMonth() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    label: new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(now),
    date: new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(now),
  };
}

function StatusPill({ label, count, tone }: { label: string; count: number; tone: "success" | "warning" | "danger" | "info" | "neutral" }) {
  return <Badge tone={tone}>{label} <span className="tabular-nums">{formatNumber(count)}</span></Badge>;
}

export default function DashboardPage() {
  const { user, canAccessRoute } = useAuth();
  const { merchants, loading: loadingMerchants, error: merchantError } = useMerchants();
  const [payment, setPayment] = useState<AnalyticSummary | null>(null);
  const [disbursement, setDisbursement] = useState<DisbursementSummary | null>(null);
  const [merchantTotal, setMerchantTotal] = useState<number | null>(null);
  const [merchantSummaryError, setMerchantSummaryError] = useState<string | null>(null);
  const [periodLabel, setPeriodLabel] = useState("Periode berjalan");
  const [todayLabel, setTodayLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const period = getCurrentMonth();
    setPeriodLabel(period.label);
    setTodayLabel(period.date);

    async function loadOverview() {
      setLoading(true);
      setError(null);
      const results = await Promise.allSettled([
        api.analytics.summary({ month: period.month, year: period.year, signal: controller.signal }),
        api.analytics.disbursementSummary({ month: period.month, year: period.year, signal: controller.signal }),
        api.merchants.list({ page: 1, limit: 1 }),
      ]);
      if (controller.signal.aborted) return;

      const errors: string[] = [];
      const paymentResult = results[0];
      const disbursementResult = results[1];
      const merchantResult = results[2];
      if (paymentResult.status === "fulfilled") setPayment(paymentResult.value);
      else {
        setPayment(null);
        errors.push(getErrorMessage(paymentResult.reason, "Ringkasan payment gagal dimuat."));
      }
      if (disbursementResult.status === "fulfilled") setDisbursement(disbursementResult.value);
      else {
        setDisbursement(null);
        errors.push(getErrorMessage(disbursementResult.reason, "Ringkasan disbursement gagal dimuat."));
      }
      if (merchantResult.status === "fulfilled") {
        setMerchantTotal(merchantResult.value.paging.total_data);
        setMerchantSummaryError(null);
      } else {
        setMerchantTotal(null);
        setMerchantSummaryError(getErrorMessage(merchantResult.reason, "Jumlah merchant terdaftar belum dapat dimuat."));
      }
      setError(errors.length > 0 ? errors.join(" ") : null);
      setLoading(false);
    }

    void loadOverview();
    return () => controller.abort();
  }, []);

  const paymentNeedsAttention = payment?.pending_count ?? 0;
  const disbursementNeedsAttention = disbursement
    ? disbursement.waiting_settlement_count + disbursement.processing_count + disbursement.failed_count
    : 0;
  const needsAttention = paymentNeedsAttention + disbursementNeedsAttention;
  const dashboardErrors = [error, merchantSummaryError].filter((message): message is string => Boolean(message));
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || user?.username || "Admin";
  const canManageMerchants = canAccessRoute("/merchants");
  const canViewAnalytics = canAccessRoute("/analytics");

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold text-foreground"></h2>
        <p className="text-xs text-muted-foreground">{todayLabel}</p>
      </div>

      {dashboardErrors.length > 0 ? (
        <Card className="border-danger/30 bg-danger/5">
          <p className="text-sm font-semibold text-danger">Sebagian data dashboard belum dapat dimuat</p>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {dashboardErrors.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}
          </ul>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total merchant"
          value={merchantTotal !== null ? formatNumber(merchantTotal) : loading ? "…" : "—"}
          hint={merchantSummaryError ? `${formatNumber(merchants.length)} merchant aktif · jumlah total belum tersedia` : `${formatNumber(merchants.length)} aktif · termasuk merchant nonaktif`}
          icon={Store}
          tone="primary"
        />
        <StatCard
          label="Payment sukses"
          value={payment ? formatCurrency(payment.total_volume_amount) : loading ? "…" : "—"}
          hint={payment ? `${formatNumber(payment.success_count)} sukses dari ${formatNumber(payment.total_transaction_count)} transaksi` : "Nilai payment bulan ini"}
          icon={CircleDollarSign}
          tone="success"
        />
        <StatCard
          label="Dana disbursement terkirim"
          value={disbursement ? formatCurrency(disbursement.total_volume_amount) : loading ? "…" : "—"}
          hint={disbursement ? `${formatNumber(disbursement.success_count)} sukses dari ${formatNumber(disbursement.total_disbursement_count)} transfer` : "Dana transfer sukses bulan ini"}
          icon={BanknoteArrowDown}
          tone="accent"
        />
        <StatCard
          label="Perlu perhatian"
          value={loading && !payment && !disbursement ? "…" : formatNumber(needsAttention)}
          hint={`Payment pending ${formatNumber(paymentNeedsAttention)} · Disbursement menunggu / gagal ${formatNumber(disbursementNeedsAttention)}`}
          icon={Clock3}
          tone={needsAttention > 0 ? "warning" : "success"}
        />
      </div>

      {loading && !payment && !disbursement ? <LoadingBlock label="Memuat ringkasan bulan ini…" /> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Aktivitas payment"
            subtitle={`Ringkasan transaksi masuk · ${periodLabel}`}
            icon={<ReceiptText className="h-4 w-4" />}
            action={canAccessRoute("/transactions") ? (
              <Link href="/transactions" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Transaksi <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          />
          {payment ? (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/45 p-4">
                  <p className="text-xs text-muted-foreground">Nilai sukses</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(payment.total_volume_amount)}</p>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4">
                  <p className="text-xs text-muted-foreground">Tingkat sukses</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{payment.success_rate.toFixed(1)}%</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill label="Sukses" count={payment.success_count} tone="success" />
                <StatusPill label="Pending" count={payment.pending_count} tone="warning" />
                <StatusPill label="Expired" count={payment.expired_count} tone="danger" />
              </div>
              <p className="text-xs text-muted-foreground">Total {formatNumber(payment.total_transaction_count)} transaksi · Admin fee sukses {formatCurrency(payment.total_admin_fee)}</p>
            </div>
          ) : loading ? <LoadingBlock label="Memuat payment…" /> : <EmptyState title="Ringkasan payment tidak tersedia" />}
        </Card>

        <Card>
          <CardHeader
            title="Aktivitas disbursement"
            subtitle={`Ringkasan transfer keluar · ${periodLabel}`}
            icon={<BanknoteArrowDown className="h-4 w-4" />}
            action={canViewAnalytics ? (
              <Link href="/analytics" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Detail <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          />
          {disbursement ? (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/45 p-4">
                  <p className="text-xs text-muted-foreground">Dana terkirim sukses</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(disbursement.total_volume_amount)}</p>
                </div>
                <div className="rounded-2xl bg-muted/45 p-4">
                  <p className="text-xs text-muted-foreground">Tingkat sukses</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{disbursement.success_rate.toFixed(1)}%</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill label="Sukses" count={disbursement.success_count} tone="success" />
                <StatusPill label="Menunggu" count={disbursement.waiting_settlement_count} tone="warning" />
                <StatusPill label="Diproses" count={disbursement.processing_count} tone="info" />
                <StatusPill label="Gagal" count={disbursement.failed_count} tone="danger" />
                <StatusPill label="Dibatalkan" count={disbursement.cancelled_count} tone="neutral" />
              </div>
              <p className="text-xs text-muted-foreground">Total {formatNumber(disbursement.total_disbursement_count)} transfer · Admin fee sukses {formatCurrency(disbursement.total_admin_fee)}</p>
            </div>
          ) : loading ? <LoadingBlock label="Memuat disbursement…" /> : <EmptyState title="Ringkasan disbursement tidak tersedia" />}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Merchant aktif"
          subtitle={`${loadingMerchants ? "Memuat daftar merchant…" : `${formatNumber(merchants.length)} merchant siap menerima transaksi`}`}
          icon={<Store className="h-4 w-4" />}
          action={canManageMerchants ? (
            <Link href="/merchants" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Kelola merchant <ArrowRight className="h-3 w-3" />
            </Link>
          ) : null}
        />
        {loadingMerchants ? (
          <div className="py-6"><LoadingBlock label="Memuat merchant…" /></div>
        ) : merchants.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {merchants.slice(0, 8).map((merchant) => (
              <div key={merchant.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-background/35 px-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{merchant.name}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">Merchant aktif</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl bg-muted/30">
            <EmptyState
              title={merchantError ? "Daftar merchant belum dapat dimuat" : "Belum ada merchant aktif"}
              description={merchantError ?? "Merchant aktif akan muncul di sini setelah terdaftar."}
              action={canManageMerchants ? (
                <Link href="/merchants" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">
                  Buka merchant <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            />
          </div>
        )}
        {merchants.length > 8 ? (
          <p className="mt-3 text-right text-xs text-muted-foreground">Menampilkan 8 dari {formatNumber(merchants.length)} merchant aktif</p>
        ) : null}
      </Card>
    </div>
  );
}
