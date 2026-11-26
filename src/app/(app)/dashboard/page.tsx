"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BanknoteArrowDown,
  ChartNoAxesCombined,
  CircleDollarSign,
  Percent,
  ReceiptText,
} from "lucide-react";
import { fetchAnalytics, disbursementStatusRows, type AnalyticsBundle } from "@/lib/analytics";
import { useMerchants, useYearOptions } from "@/lib/use-merchants";
import { PeriodFilter, type PeriodValue } from "@/components/period-filter";
import { OperationScopeFilter, type OperationScope } from "@/components/operation-scope-filter";
import { StatCard } from "@/components/stat-card";
import {
  DisbursementBankDonut,
  FlowTrendChart,
  StatusBar,
  VaQrisDonut,
} from "@/components/charts";
import { Badge, Card, CardHeader, EmptyState, LoadingBlock } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { MONTH_NAMES, formatCurrency, formatNumber } from "@/lib/utils";

function defaultPeriod(): PeriodValue {
  return {
    mode: "monthly",
    month: 1,
    year: 2000,
    merchantId: "",
  };
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodValue>(defaultPeriod);
  const [periodReady, setPeriodReady] = useState(false);
  const [scope, setScope] = useState<OperationScope>("all");
  const { merchants, loading: loadingMerchants } = useMerchants();
  const years = useYearOptions();
  const [bundle, setBundle] = useState<AnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (value: PeriodValue) => {
    setLoading(true);
    setError(null);
    try {
      setBundle(await fetchAnalytics({
        mode: value.mode,
        month: value.month,
        year: value.year,
        merchantId: value.merchantId || undefined,
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat ringkasan operasional.");
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const now = new Date();
    setPeriod((current) => ({
      ...current,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    }));
    setPeriodReady(true);
  }, []);

  useEffect(() => {
    if (!periodReady) return;
    void load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodReady, period.mode, period.month, period.year, period.merchantId]);

  const periodLabel = useMemo(() => period.mode === "monthly"
    ? `${MONTH_NAMES[period.month - 1]} ${period.year}`
    : `Tahun ${period.year}`, [period]);
  const showPayment = scope !== "disbursement";
  const showDisbursement = scope !== "payment";

  const flowTrend = useMemo(() => {
    if (!bundle) return [];
    if (period.mode === "yearly") {
      return bundle.yearSeries.map((payment, index) => ({
        label: payment.label,
        payment: payment.volume,
        disbursement: bundle.disbursementYearSeries[index]?.volume ?? 0,
      }));
    }
    return bundle.dailyTrend.map((payment, index) => ({
      label: String(payment.day),
      payment: payment.total_amount,
      disbursement: bundle.disbursementDailyTrend[index]?.total_amount ?? 0,
    }));
  }, [bundle, period.mode]);

  const disbursement = bundle?.disbursementSummary;
  const pendingDisbursements = disbursement
    ? disbursement.waiting_settlement_count + disbursement.processing_count
    : 0;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-sky-500/10 p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <ChartNoAxesCombined className="h-4 w-4" />
              </span>
              <Badge tone="info">PAYGATE · OPERATIONS</Badge>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Ringkasan operasional
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pantau dana payment yang masuk dan disbursement yang dikirim dalam satu tampilan.
              Periode aktif: <span className="font-semibold text-foreground">{periodLabel}</span>.
            </p>
          </div>
          <Link
            href="/analytics"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            Buka analitik <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <PeriodFilter
        value={period}
        onChange={setPeriod}
        merchants={merchants}
        years={years}
        loadingMerchants={loadingMerchants}
      />
      <OperationScopeFilter value={scope} onChange={setScope} />

      {error ? (
        <Card className="border-danger/30 bg-danger/5">
          <div className="text-sm text-danger">
            <p className="font-semibold">Data belum dapat dimuat</p>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
        </Card>
      ) : null}

      {loading && !bundle ? <LoadingBlock label="Memuat ringkasan operasional…" /> : null}

      {bundle ? (
        <div className="animate-fade-up space-y-6">
          {showPayment ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <CircleDollarSign className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Payment masuk</h3>
                <span className="text-xs text-muted-foreground">Transaksi sukses pada periode terpilih</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  label="Volume sukses"
                  value={formatCurrency(bundle.summary.total_volume_amount)}
                  hint="Nilai payment berhasil"
                  icon={CircleDollarSign}
                  tone="primary"
                />
                <StatCard
                  label="Jumlah transaksi"
                  value={formatNumber(bundle.summary.total_transaction_count)}
                  hint={`${formatNumber(bundle.summary.success_count)} sukses`}
                  icon={ReceiptText}
                  tone="accent"
                />
                <StatCard
                  label="Success rate"
                  value={`${bundle.summary.success_rate.toFixed(1)}%`}
                  hint={`${formatNumber(bundle.summary.pending_count)} pending · ${formatNumber(bundle.summary.expired_count)} expired`}
                  icon={Percent}
                  tone="success"
                />
              </div>
            </section>
          ) : null}

          {showDisbursement ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <BanknoteArrowDown className="h-4 w-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-foreground">Disbursement keluar</h3>
                <span className="text-xs text-muted-foreground">Nilai dana yang berhasil dikirim</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  label="Dana terkirim sukses"
                  value={formatCurrency(disbursement!.total_volume_amount)}
                  hint="Nilai transfer berhasil"
                  icon={BanknoteArrowDown}
                  tone="accent"
                />
                <StatCard
                  label="Jumlah transfer"
                  value={formatNumber(disbursement!.total_disbursement_count)}
                  hint={`${formatNumber(disbursement!.success_count)} sukses`}
                  icon={ReceiptText}
                  tone="primary"
                />
                <StatCard
                  label="Success rate"
                  value={`${disbursement!.success_rate.toFixed(1)}%`}
                  hint={`${formatNumber(pendingDisbursements)} menunggu / diproses`}
                  icon={Percent}
                  tone="success"
                />
              </div>
            </section>
          ) : null}

          <Card>
              <CardHeader
                title="Arus dana"
                subtitle={period.mode === "yearly"
                  ? `Nilai transaksi sukses per bulan selama ${period.year}`
                  : `Nilai transaksi sukses per hari pada ${periodLabel}`}
                icon={<ChartNoAxesCombined className="h-4 w-4" />}
              />
              <div className="mt-4">
                <FlowTrendChart data={flowTrend} showPayment={showPayment} showDisbursement={showDisbursement} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Payment menunjukkan dana masuk; disbursement menunjukkan nilai transfer keluar. Nilainya dipisah, tidak dijumlahkan sebagai saldo.
              </p>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {showPayment ? (
              <Card>
                <CardHeader title="Status payment" subtitle="Jumlah transaksi menurut status" icon={<CircleDollarSign className="h-4 w-4" />} />
                {bundle.statusDistribution.length > 0
                  ? <StatusBar data={bundle.statusDistribution} />
                  : <EmptyState title="Belum ada data status payment" />}
              </Card>
            ) : null}

            {showDisbursement ? (
              <Card>
                <CardHeader
                  title="Status disbursement"
                  subtitle="Jumlah berdasarkan status transfer"
                  icon={<BanknoteArrowDown className="h-4 w-4" />}
                />
                <div className="mt-3">
                  {disbursementStatusRows(disbursement!).length > 0 ? (
                    <StatusBar data={disbursementStatusRows(disbursement!)} />
                  ) : (
                    <EmptyState title="Belum ada data disbursement" />
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-muted-foreground">Admin fee sukses</p>
                    <p className="mt-1 font-semibold text-foreground">{formatCurrency(disbursement!.total_admin_fee)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-muted-foreground">Gagal / dibatalkan</p>
                    <p className="mt-1 font-semibold text-foreground">
                      {formatNumber(disbursement!.failed_count + disbursement!.cancelled_count)}
                    </p>
                  </div>
                </div>
              </Card>
            ) : null}
            {showPayment ? (
              <Card>
                <CardHeader title="Metode payment" subtitle="Distribusi transaksi payment sukses" icon={<CircleDollarSign className="h-4 w-4" />} />
                {bundle.vaQrisSplit.length > 0 ? (
                  <div className="mt-2"><VaQrisDonut data={bundle.vaQrisSplit} /></div>
                ) : <EmptyState title="Belum ada data metode payment" />}
              </Card>
            ) : null}
            {showDisbursement ? (
              <Card>
                <CardHeader
                  title="Bank tujuan disbursement"
                  subtitle="Transfer sukses berdasarkan nama bank beneficiary"
                  icon={<BanknoteArrowDown className="h-4 w-4" />}
                  action={<Link href="/analytics" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Rincian <ArrowUpRight className="h-3 w-3" /></Link>}
                />
                {bundle.disbursementBanks.length > 0 ? (
                  <>
                    <div className="mt-2"><DisbursementBankDonut data={bundle.disbursementBanks} /></div>
                    <div className="space-y-2 border-t border-border pt-3">
                      {bundle.disbursementBanks.map((bank) => (
                        <div key={bank.bank_name} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                          <span className="font-medium text-foreground">{bank.bank_name}</span>
                          <span className="text-right tabular-nums text-muted-foreground">{formatNumber(bank.count)} transfer sukses · {formatCurrency(bank.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <EmptyState title="Belum ada data bank tujuan" />}
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
