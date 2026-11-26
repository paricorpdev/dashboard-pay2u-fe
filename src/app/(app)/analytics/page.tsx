"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  BanknoteArrowDown,
  ChartNoAxesCombined,
  CircleDollarSign,
  Percent,
  ReceiptText,
} from "lucide-react";
import { fetchAnalytics, type AnalyticsBundle } from "@/lib/analytics";
import { useMerchants, useYearOptions } from "@/lib/use-merchants";
import { PeriodFilter, type PeriodValue } from "@/components/period-filter";
import { OperationScopeFilter, type OperationScope } from "@/components/operation-scope-filter";
import { StatCard } from "@/components/stat-card";
import {
  DisbursementBankDonut,
  DisbursementStatusTrendChart,
  FlowTrendChart,
  StatusTrendChart,
  VaQrisDonut,
} from "@/components/charts";
import { Badge, Button, Card, CardHeader, EmptyState, LoadingBlock } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { downloadAnalyticsPdf } from "@/lib/analytics-pdf";
import { MONTH_NAMES, formatCurrency, formatNumber, formatPaymentMethod } from "@/lib/utils";

function defaultPeriod(): PeriodValue {
  return {
    mode: "yearly",
    month: 1,
    year: 2000,
    merchantId: "",
  };
}

export default function AnalyticsPage() {
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
      setError(err instanceof ApiError ? err.message : "Gagal memuat analitik operasional.");
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

  const periodLabel = period.mode === "monthly"
    ? `${MONTH_NAMES[period.month - 1]} ${period.year}`
    : `Tahun ${period.year}`;
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

  const paymentStatusTrend = useMemo(() => {
    if (!bundle) return [];
    if (period.mode === "yearly") {
      return bundle.yearSeries.map((row) => ({
        label: row.label,
        count: row.count,
        success: row.success,
        pending: row.pending,
        expired: row.expired,
      }));
    }
    return bundle.dailyTrend.map((row) => ({
      label: String(row.day),
      count: row.total_count,
      success: row.success_count,
      pending: row.pending_count,
      expired: row.expired_count,
    }));
  }, [bundle, period.mode]);

  const disbursementStatusTrend = useMemo(() => {
    if (!bundle) return [];
    if (period.mode === "yearly") {
      return bundle.disbursementYearSeries.map((row) => ({
        label: row.label,
        success: row.success,
        waiting: row.waitingSettlement,
        processing: row.processing,
        failed: row.failed,
        cancelled: row.cancelled,
      }));
    }
    return bundle.disbursementDailyTrend.map((row) => ({
      label: String(row.day),
      success: row.success_count,
      waiting: row.waiting_settlement_count,
      processing: row.processing_count,
      failed: row.failed_count,
      cancelled: row.cancelled_count,
    }));
  }, [bundle, period.mode]);

  const merchantName = merchants.find((merchant) => merchant.id === period.merchantId)?.name ?? "";
  const hasData = Boolean(
    bundle && (
      bundle.summary.total_transaction_count > 0 ||
      bundle.disbursementSummary.total_disbursement_count > 0
    ),
  );

  return (
    <div className="space-y-6">

      <PeriodFilter
        value={period}
        onChange={setPeriod}
        merchants={merchants}
        years={years}
        loadingMerchants={loadingMerchants}
        action={(
          <Button
            type="button"
            variant="secondary"
            disabled={!bundle || loading}
            onClick={() => bundle && downloadAnalyticsPdf(bundle, period, scope, merchantName)}
            className="w-fit shrink-0"
          >
            <ArrowDownToLine className="h-4 w-4" /> Unduh PDF
          </Button>
        )}
      />

      <OperationScopeFilter value={scope} onChange={setScope} />

      {error ? (
        <Card className="border-danger/30 bg-danger/5">
          <p className="text-sm font-semibold text-danger">Data analitik belum dapat dimuat</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </Card>
      ) : null}
      {loading && !bundle ? <LoadingBlock label="Menghitung analitik…" /> : null}

      {bundle ? (
        <div className="animate-fade-up space-y-6">
          {showPayment ? (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 px-1 text-sm font-semibold text-foreground">
                <CircleDollarSign className="h-4 w-4 text-primary" /> Payment masuk
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Volume sukses" value={formatCurrency(bundle.summary.total_volume_amount)} hint="Nilai transaksi berhasil" icon={CircleDollarSign} tone="primary" />
                <StatCard label="Jumlah transaksi" value={formatNumber(bundle.summary.total_transaction_count)} hint={`${formatNumber(bundle.summary.success_count)} sukses`} icon={ReceiptText} tone="accent" />
                <StatCard label="Success rate" value={`${bundle.summary.success_rate.toFixed(1)}%`} hint={`${formatNumber(bundle.summary.pending_count)} pending · ${formatNumber(bundle.summary.expired_count)} expired`} icon={Percent} tone="success" />
              </div>
            </section>
          ) : null}

          {showDisbursement ? (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 px-1 text-sm font-semibold text-foreground">
                <BanknoteArrowDown className="h-4 w-4 text-sky-600" /> Disbursement keluar
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Dana terkirim sukses" value={formatCurrency(bundle.disbursementSummary.total_volume_amount)} hint="Nilai yang diterima beneficiary" icon={BanknoteArrowDown} tone="accent" />
                <StatCard label="Jumlah transfer" value={formatNumber(bundle.disbursementSummary.total_disbursement_count)} hint={`${formatNumber(bundle.disbursementSummary.success_count)} sukses`} icon={ReceiptText} tone="primary" />
                <StatCard label="Success rate" value={`${bundle.disbursementSummary.success_rate.toFixed(1)}%`} hint={`${formatNumber(bundle.disbursementSummary.waiting_settlement_count + bundle.disbursementSummary.processing_count)} menunggu / diproses`} icon={Percent} tone="success" />
              </div>
            </section>
          ) : null}

          <Card>
            <CardHeader
              title="Pergerakan nilai transaksi"
              subtitle={period.mode === "yearly" ? `Perbandingan per bulan selama ${period.year}` : `Perbandingan per hari selama ${periodLabel}`}
              icon={<ChartNoAxesCombined className="h-4 w-4" />}
            />
            <div className="mt-4">
              {hasData ? (
                <FlowTrendChart data={flowTrend} showPayment={showPayment} showDisbursement={showDisbursement} />
              ) : (
                <EmptyState title="Belum ada aktivitas pada periode ini" description="Ubah periode atau merchant untuk melihat pergerakan transaksi." />
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Volume payment memakai nilai transaksi sukses. Volume disbursement memakai nilai dana yang sukses dikirim; kedua arus ditampilkan terpisah.
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {showPayment ? (
              <Card>
                <CardHeader
                  title="Status payment"
                  subtitle={period.mode === "yearly" ? "Jumlah status tiap bulan" : "Jumlah status tiap hari"}
                  icon={<CircleDollarSign className="h-4 w-4" />}
                />
                <div className="mt-4">
                  {paymentStatusTrend.some((row) => row.count > 0)
                    ? <StatusTrendChart data={paymentStatusTrend} />
                    : <EmptyState title="Belum ada data status payment" />}
                </div>
              </Card>
            ) : null}
            {showDisbursement ? (
              <Card>
                <CardHeader
                  title="Status disbursement"
                  subtitle={period.mode === "yearly" ? "Jumlah status tiap bulan" : "Jumlah status tiap hari"}
                  icon={<BanknoteArrowDown className="h-4 w-4" />}
                />
                <div className="mt-4">
                  {disbursementStatusTrend.some((row) => row.success + row.waiting + row.processing + row.failed + row.cancelled > 0)
                    ? <DisbursementStatusTrendChart data={disbursementStatusTrend} />
                    : <EmptyState title="Belum ada data status disbursement" />}
                </div>
              </Card>
            ) : null}
            {showPayment ? (
              <Card>
                <CardHeader title="Metode pembayaran" subtitle="Komposisi transaksi payment sukses" icon={<CircleDollarSign className="h-4 w-4" />} />
                {bundle.vaQrisSplit.length > 0 ? <div className="mt-2"><VaQrisDonut data={bundle.vaQrisSplit} /></div> : <EmptyState title="Belum ada data metode" />}
                {bundle.paymentMethods.length > 0 ? (
                  <div className="space-y-2 border-t border-border pt-3">
                    {bundle.paymentMethods.map((method) => (
                      <div key={method.payment_method} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                        <span className="font-medium text-foreground">{formatPaymentMethod(method.payment_method)}</span>
                        <span className="text-right tabular-nums text-muted-foreground">{formatNumber(method.count)} trx sukses · {formatCurrency(method.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            ) : null}
            {showDisbursement ? (
              <Card>
                <CardHeader title="Bank tujuan disbursement" subtitle="Transfer sukses berdasarkan beneficiary_bank_name" icon={<BanknoteArrowDown className="h-4 w-4" />} />
                {bundle.disbursementBanks.length > 0 ? (
                  <div className="mt-2"><DisbursementBankDonut data={bundle.disbursementBanks} /></div>
                ) : <EmptyState title="Belum ada data bank tujuan" />}
                {bundle.disbursementBanks.length > 0 ? (
                  <div className="max-h-48 space-y-2 overflow-y-auto border-t border-border pt-3">
                    {bundle.disbursementBanks.map((bank) => (
                      <div key={bank.bank_name} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                        <span className="font-medium text-foreground">{bank.bank_name}</span>
                        <span className="text-right tabular-nums text-muted-foreground">{formatNumber(bank.count)} transfer sukses · {formatCurrency(bank.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            ) : null}
          </div>

          {period.mode === "yearly" ? (
            <Card>
              <CardHeader title="Perbandingan bulanan" subtitle={`Ringkasan volume payment masuk dan disbursement keluar · ${period.year}`} icon={<ChartNoAxesCombined className="h-4 w-4" />} />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Bulan</th>
                      {showPayment ? <><th className="pb-3 pr-4 text-right font-medium">Payment trx</th><th className="pb-3 pr-4 text-right font-medium">Payment sukses</th></> : null}
                      {showDisbursement ? <><th className="pb-3 pr-4 text-right font-medium">Disbursement</th><th className="pb-3 text-right font-medium">Dana terkirim</th></> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.yearSeries.map((payment) => {
                      const disbursement = bundle.disbursementYearSeries.find((row) => row.month === payment.month);
                      return (
                        <tr key={payment.month} className="border-b border-border/50 last:border-0">
                          <td className="py-3 pr-4 font-medium text-foreground">{MONTH_NAMES[payment.month - 1]}</td>
                          {showPayment ? <><td className="py-3 pr-4 text-right tabular-nums text-foreground">{formatNumber(payment.count)}</td><td className="py-3 pr-4 text-right tabular-nums text-primary">{formatCurrency(payment.volume)}</td></> : null}
                          {showDisbursement ? <><td className="py-3 pr-4 text-right tabular-nums text-foreground">{formatNumber(disbursement?.count ?? 0)}</td><td className="py-3 text-right tabular-nums text-sky-700">{formatCurrency(disbursement?.volume ?? 0)}</td></> : null}
                        </tr>
                      );
                    })}
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
