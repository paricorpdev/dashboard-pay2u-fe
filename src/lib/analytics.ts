import { api } from "./api";
import type {
  AnalyticSummary,
  DailyTrendItem,
  PaymentMethodDistributionItem,
  PeriodMode,
  StatusDistributionItem,
} from "./types";
import { MONTH_SHORT, paymentMethodCategory, paymentMethodVendor } from "./utils";

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

export interface CategorySlice {
  name: string;
  value: number;
  amount: number;
}

export interface VendorSlice {
  name: string;
  value: number;
  amount: number;
  category: "VA" | "QRIS" | "Other";
}

export interface AnalyticsBundle {
  summary: AnalyticSummary;
  yearSeries: YearPoint[];
  dailyTrend: DailyTrendItem[];
  paymentMethods: PaymentMethodDistributionItem[];
  statusDistribution: StatusDistributionItem[];
  vaQrisSplit: CategorySlice[];
  vendorSplit: VendorSlice[];
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

function sumInto(target: AnalyticSummary, s: AnalyticSummary) {
  target.total_volume_amount += s.total_volume_amount;
  target.total_transaction_count += s.total_transaction_count;
  target.success_count += s.success_count;
  target.pending_count += s.pending_count;
  target.expired_count += s.expired_count;
  target.total_admin_fee += s.total_admin_fee;
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

/** Aggregate payment-method rows into per-vendor (bank) buckets. */
function buildVendorSplit(
  methods: PaymentMethodDistributionItem[],
): VendorSlice[] {
  const map = new Map<string, VendorSlice>();
  for (const m of methods) {
    const vendor = paymentMethodVendor(m.payment_method);
    const existing = map.get(vendor);
    if (existing) {
      existing.value += m.count;
      existing.amount += m.amount;
    } else {
      map.set(vendor, {
        name: vendor,
        value: m.count,
        amount: m.amount,
        category: paymentMethodCategory(m.payment_method),
      });
    }
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
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
    const [summary, trend, methods, status] = await Promise.all([
      api.analytics.summary({ month, year, merchant_id: merchantId, signal }),
      api.analytics.trend({ month, year, merchant_id: merchantId, signal }),
      api.analytics.paymentMethods({ month, year, merchant_id: merchantId, signal }),
      api.analytics.statusDistribution({ month, year, merchant_id: merchantId, signal }),
    ]);

    return {
      summary,
      yearSeries: [],
      dailyTrend: trend,
      paymentMethods: methods,
      statusDistribution: status,
      vaQrisSplit: buildVaQrisSplit(methods),
      vendorSplit: buildVendorSplit(methods),
    };
  }

  // Yearly: query each of the 12 months in parallel and aggregate.
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const perMonth = await Promise.all(
    months.map(async (m) => {
      const [summary, methods, status] = await Promise.all([
        api.analytics.summary({ month: m, year, merchant_id: merchantId, signal }),
        api.analytics.paymentMethods({ month: m, year, merchant_id: merchantId, signal }),
        api.analytics.statusDistribution({ month: m, year, merchant_id: merchantId, signal }),
      ]);
      return { month: m, summary, methods, status };
    }),
  );

  const aggregated = { ...EMPTY_SUMMARY, year, month: 0 };
  const yearSeries: YearPoint[] = [];
  const methodLists: PaymentMethodDistributionItem[][] = [];
  const statusLists: StatusDistributionItem[][] = [];

  for (const item of perMonth) {
    sumInto(aggregated, item.summary);
    methodLists.push(item.methods);
    statusLists.push(item.status);
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
  }

  aggregated.success_rate =
    aggregated.total_transaction_count > 0
      ? Math.round(
          (aggregated.success_count / aggregated.total_transaction_count) * 10000,
        ) / 100
      : 0;

  const mergedMethods = mergeMethods(methodLists);

  return {
    summary: aggregated,
    yearSeries,
    dailyTrend: [],
    paymentMethods: mergedMethods,
    statusDistribution: mergeStatus(statusLists),
    vaQrisSplit: buildVaQrisSplit(mergedMethods),
    vendorSplit: buildVendorSplit(mergedMethods),
  };
}
