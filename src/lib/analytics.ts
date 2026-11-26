import { api } from "./api";
import type {
  AnalyticSummary,
  DailyTrendItem,
  DisbursementDailyTrendItem,
  DisbursementBankDistributionItem,
  DisbursementSummary,
  PaymentMethodDistributionItem,
  PeriodMode,
  StatusDistributionItem,
} from "./types";
import { MONTH_SHORT, paymentMethodCategory } from "./utils";

export interface YearPoint {
  label: string;
  month: number;
  volume: number;
  count: number;
  success: number;
  pending: number;
  expired: number;
  adminFee: number;
}

export interface DisbursementYearPoint {
  label: string;
  month: number;
  volume: number;
  count: number;
  success: number;
  waitingSettlement: number;
  processing: number;
  failed: number;
  cancelled: number;
  adminFee: number;
}

export interface CategorySlice {
  name: string;
  value: number;
  amount: number;
}

export interface AnalyticsBundle {
  summary: AnalyticSummary;
  disbursementSummary: DisbursementSummary;
  yearSeries: YearPoint[];
  disbursementYearSeries: DisbursementYearPoint[];
  dailyTrend: DailyTrendItem[];
  disbursementDailyTrend: DisbursementDailyTrendItem[];
  disbursementBanks: DisbursementBankDistributionItem[];
  paymentMethods: PaymentMethodDistributionItem[];
  statusDistribution: StatusDistributionItem[];
  vaQrisSplit: CategorySlice[];
}

const EMPTY_SUMMARY: AnalyticSummary = {
  month: 0,
  year: 0,
  total_volume_amount: 0,
  total_transaction_count: 0,
  success_count: 0,
  pending_count: 0,
  expired_count: 0,
  success_rate: 0,
  total_admin_fee: 0,
};

const EMPTY_DISBURSEMENT_SUMMARY: DisbursementSummary = {
  month: 0,
  year: 0,
  total_volume_amount: 0,
  total_disbursement_count: 0,
  success_count: 0,
  waiting_settlement_count: 0,
  processing_count: 0,
  failed_count: 0,
  cancelled_count: 0,
  success_rate: 0,
  total_admin_fee: 0,
};

function sumInto(target: AnalyticSummary, s: AnalyticSummary) {
  target.total_volume_amount += s.total_volume_amount;
  target.total_transaction_count += s.total_transaction_count;
  target.success_count += s.success_count;
  target.pending_count += s.pending_count;
  target.expired_count += s.expired_count;
  target.total_admin_fee += s.total_admin_fee;
}

function sumDisbursementsInto(target: DisbursementSummary, s: DisbursementSummary) {
  target.total_volume_amount += s.total_volume_amount;
  target.total_disbursement_count += s.total_disbursement_count;
  target.success_count += s.success_count;
  target.waiting_settlement_count += s.waiting_settlement_count;
  target.processing_count += s.processing_count;
  target.failed_count += s.failed_count;
  target.cancelled_count += s.cancelled_count;
  target.total_admin_fee += s.total_admin_fee;
}

function mergeDisbursementBanks(
  lists: DisbursementBankDistributionItem[][],
): DisbursementBankDistributionItem[] {
  const map = new Map<string, DisbursementBankDistributionItem>();
  for (const list of lists) {
    for (const item of list) {
      const key = item.bank_name.trim().toLocaleLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += item.count;
        existing.amount += item.amount;
      } else {
        map.set(key, { ...item });
      }
    }
  }
  const totalCount = [...map.values()].reduce((total, item) => total + item.count, 0);
  for (const item of map.values()) {
    item.percentage = totalCount > 0
      ? Math.round((item.count / totalCount) * 10000) / 100
      : 0;
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function disbursementStatusRows(summary: DisbursementSummary) {
  return [
    { status: "SUCCESS", count: summary.success_count, amount: 0, percentage: 0 },
    { status: "WAITING_SETTLEMENT", count: summary.waiting_settlement_count, amount: 0, percentage: 0 },
    { status: "PROCESSING", count: summary.processing_count, amount: 0, percentage: 0 },
    { status: "FAILED", count: summary.failed_count, amount: 0, percentage: 0 },
    { status: "CANCELLED", count: summary.cancelled_count, amount: 0, percentage: 0 },
  ].filter((row) => row.count > 0);
}

/** Aggregate payment-method rows into VA vs QRIS vs Other buckets. */
function buildVaQrisSplit(
  methods: PaymentMethodDistributionItem[],
): CategorySlice[] {
  const buckets: Record<string, CategorySlice> = {
    VA: { name: "Virtual Account", value: 0, amount: 0 },
    QRIS: { name: "QRIS", value: 0, amount: 0 },
    Other: { name: "Lainnya", value: 0, amount: 0 },
  };
  for (const m of methods) {
    const cat = paymentMethodCategory(m.payment_method);
    buckets[cat].value += m.count;
    buckets[cat].amount += m.amount;
  }
  return Object.values(buckets).filter((b) => b.value > 0);
}

function mergeMethods(
  lists: PaymentMethodDistributionItem[][],
): PaymentMethodDistributionItem[] {
  const map = new Map<string, PaymentMethodDistributionItem>();
  for (const list of lists) {
    for (const item of list) {
      const existing = map.get(item.payment_method);
      if (existing) {
        existing.count += item.count;
        existing.amount += item.amount;
      } else {
        map.set(item.payment_method, { ...item });
      }
    }
  }
  const total = [...map.values()].reduce((acc, i) => acc + i.count, 0);
  for (const item of map.values()) {
    item.percentage =
      total > 0 ? Math.round((item.count / total) * 10000) / 100 : 0;
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function mergeStatus(
  lists: StatusDistributionItem[][],
): StatusDistributionItem[] {
  const map = new Map<string, StatusDistributionItem>();
  for (const list of lists) {
    for (const item of list) {
      const existing = map.get(item.status);
      if (existing) {
        existing.count += item.count;
        existing.amount += item.amount;
      } else {
        map.set(item.status, { ...item });
      }
    }
  }
  const total = [...map.values()].reduce((acc, i) => acc + i.count, 0);
  for (const item of map.values()) {
    item.percentage =
      total > 0 ? Math.round((item.count / total) * 10000) / 100 : 0;
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/**
 * Fetch every analytics dataset the dashboard needs for the given mode.
 * - monthly: single-month queries (trend = daily breakdown of that month).
 * - yearly: 12 parallel month queries aggregated into a year series.
 */
export async function fetchAnalytics(params: {
  mode: PeriodMode;
  year: number;
  month: number;
  merchantId?: string;
  signal?: AbortSignal;
}): Promise<AnalyticsBundle> {
  const { mode, year, month, merchantId, signal } = params;

  if (mode === "monthly") {
    const [summary, trend, methods, status, disbursementSummary, disbursementTrend, disbursementBanks] = await Promise.all([
      api.analytics.summary({ month, year, merchant_id: merchantId, signal }),
      api.analytics.trend({ month, year, merchant_id: merchantId, signal }),
      api.analytics.paymentMethods({ month, year, merchant_id: merchantId, signal }),
      api.analytics.statusDistribution({ month, year, merchant_id: merchantId, signal }),
      api.analytics.disbursementSummary({ month, year, merchant_id: merchantId, signal }),
      api.analytics.disbursementTrend({ month, year, merchant_id: merchantId, signal }),
      api.analytics.disbursementBanks({ month, year, merchant_id: merchantId, signal }),
    ]);

    return {
      summary,
      disbursementSummary,
      yearSeries: [],
      disbursementYearSeries: [],
      dailyTrend: trend,
      disbursementDailyTrend: disbursementTrend,
      disbursementBanks,
      paymentMethods: methods,
      statusDistribution: status,
      vaQrisSplit: buildVaQrisSplit(methods),
    };
  }

  // Yearly: query each of the 12 months in parallel and aggregate.
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const perMonth = await Promise.all(
    months.map(async (m) => {
      const [summary, methods, status, disbursementSummary, disbursementBanks] = await Promise.all([
        api.analytics.summary({ month: m, year, merchant_id: merchantId, signal }),
        api.analytics.paymentMethods({ month: m, year, merchant_id: merchantId, signal }),
        api.analytics.statusDistribution({ month: m, year, merchant_id: merchantId, signal }),
        api.analytics.disbursementSummary({ month: m, year, merchant_id: merchantId, signal }),
        api.analytics.disbursementBanks({ month: m, year, merchant_id: merchantId, signal }),
      ]);
      return { month: m, summary, methods, status, disbursementSummary, disbursementBanks };
    }),
  );

  const aggregated = { ...EMPTY_SUMMARY, year, month: 0 };
  const aggregatedDisbursements = { ...EMPTY_DISBURSEMENT_SUMMARY, year, month: 0 };
  const yearSeries: YearPoint[] = [];
  const disbursementYearSeries: DisbursementYearPoint[] = [];
  const methodLists: PaymentMethodDistributionItem[][] = [];
  const statusLists: StatusDistributionItem[][] = [];
  const disbursementBankLists: DisbursementBankDistributionItem[][] = [];

  for (const item of perMonth) {
    sumInto(aggregated, item.summary);
    sumDisbursementsInto(aggregatedDisbursements, item.disbursementSummary);
    methodLists.push(item.methods);
    statusLists.push(item.status);
    disbursementBankLists.push(item.disbursementBanks);
    yearSeries.push({
      label: MONTH_SHORT[item.month - 1],
      month: item.month,
      volume: item.summary.total_volume_amount,
      count: item.summary.total_transaction_count,
      success: item.summary.success_count,
      pending: item.summary.pending_count,
      expired: item.summary.expired_count,
      adminFee: item.summary.total_admin_fee,
    });
    disbursementYearSeries.push({
      label: MONTH_SHORT[item.month - 1],
      month: item.month,
      volume: item.disbursementSummary.total_volume_amount,
      count: item.disbursementSummary.total_disbursement_count,
      success: item.disbursementSummary.success_count,
      waitingSettlement: item.disbursementSummary.waiting_settlement_count,
      processing: item.disbursementSummary.processing_count,
      failed: item.disbursementSummary.failed_count,
      cancelled: item.disbursementSummary.cancelled_count,
      adminFee: item.disbursementSummary.total_admin_fee,
    });
  }

  aggregated.success_rate =
    aggregated.total_transaction_count > 0
      ? Math.round(
          (aggregated.success_count / aggregated.total_transaction_count) * 10000,
        ) / 100
      : 0;
  aggregatedDisbursements.success_rate =
    aggregatedDisbursements.total_disbursement_count > 0
      ? Math.round(
          (aggregatedDisbursements.success_count /
            aggregatedDisbursements.total_disbursement_count) *
            10000,
        ) / 100
      : 0;

  const mergedMethods = mergeMethods(methodLists);

  return {
    summary: aggregated,
    disbursementSummary: aggregatedDisbursements,
    yearSeries,
    disbursementYearSeries,
    dailyTrend: [],
    disbursementDailyTrend: [],
    disbursementBanks: mergeDisbursementBanks(disbursementBankLists),
    paymentMethods: mergedMethods,
    statusDistribution: mergeStatus(statusLists),
    vaQrisSplit: buildVaQrisSplit(mergedMethods),
  };
}
