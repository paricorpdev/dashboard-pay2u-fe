"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_COLOR, CATEGORY_COLOR, GRID_COLOR, SERIES_COLORS } from "@/lib/chart-colors";
import type { CategorySlice } from "@/lib/analytics";
import type { DisbursementBankDistributionItem } from "@/lib/types";
import { formatCurrency, formatCurrencyCompact, formatNumber } from "@/lib/utils";

const tooltipStyle = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid #e3e8f0",
    borderRadius: 12,
    fontSize: 12,
    color: "#1a2233",
    boxShadow: "0 8px 24px rgba(16, 24, 40, 0.12)",
  },
  labelStyle: { color: "#64748b" },
  itemStyle: { color: "#1a2233" },
};

// Recharts v3 passes tooltip values as a readonly union that may include undefined.
type FormatterValue = number | string | readonly (number | string)[] | undefined;

interface TrendPoint {
  label: string;
  volume: number;
  count: number;
}

/** Area chart for volume over time — used for daily (monthly) and monthly (yearly) series. */
export function VolumeTrendChart({
  data,
  seriesName = "Volume",
}: {
  data: TrendPoint[];
  seriesName?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID_COLOR }}
        />
        <YAxis
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrencyCompact(Number(v))}
          width={64}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value: FormatterValue) => [formatCurrency(Number(value)), seriesName]}
        />
        <Area
          type="monotone"
          dataKey="volume"
          name={seriesName}
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#volumeFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FlowTrendChart({
  data,
  showPayment = true,
  showDisbursement = true,
}: {
  data: { label: string; payment: number; disbursement: number }[];
  showPayment?: boolean;
  showDisbursement?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="paymentFlowFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.34} />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="disbursementFlowFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID_COLOR }}
        />
        <YAxis
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatCurrencyCompact(Number(value))}
          width={70}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value: FormatterValue, name) => [
            formatCurrency(Number(value)),
            String(name),
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }}
          iconType="circle"
          iconSize={8}
        />
        {showPayment ? (
          <Area
            type="monotone"
            dataKey="payment"
            name="Payment masuk"
            stroke="#4f46e5"
            strokeWidth={2.5}
            fill="url(#paymentFlowFill)"
          />
        ) : null}
        {showDisbursement ? (
          <Area
            type="monotone"
            dataKey="disbursement"
            name="Disbursement keluar"
            stroke="#0ea5e9"
            strokeWidth={2.5}
            fill="url(#disbursementFlowFill)"
          />
        ) : null}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface CountTrendPoint {
  label: string;
  count: number;
  success: number;
  pending: number;
  expired: number;
}

/** Stacked bar chart of transaction counts by status over time. */
export function StatusTrendChart({ data }: { data: CountTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID_COLOR }}
        />
        <YAxis
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatNumber(Number(v))}
          width={40}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value: FormatterValue) => formatNumber(Number(value))}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="success" name="Sukses" stackId="s" fill="#34d399" />
        <Bar dataKey="pending" name="Pending" stackId="s" fill="#fbbf24" />
        <Bar dataKey="expired" name="Expired" stackId="s" fill="#f87171" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface DisbursementStatusTrendPoint {
  label: string;
  success: number;
  waiting: number;
  processing: number;
  failed: number;
  cancelled: number;
}

export function DisbursementStatusTrendChart({
  data,
}: {
  data: DisbursementStatusTrendPoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID_COLOR }}
        />
        <YAxis
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatNumber(Number(value))}
          width={42}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value: FormatterValue) => formatNumber(Number(value))}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }}
          iconType="circle"
          iconSize={7}
        />
        <Bar dataKey="success" name="Sukses" stackId="disb" fill="#10b981" />
        <Bar dataKey="waiting" name="Menunggu settlement" stackId="disb" fill="#f59e0b" />
        <Bar dataKey="processing" name="Diproses" stackId="disb" fill="#0ea5e9" />
        <Bar dataKey="failed" name="Gagal" stackId="disb" fill="#ef4444" />
        <Bar dataKey="cancelled" name="Dibatalkan" stackId="disb" fill="#94a3b8" />
      </BarChart>
    </ResponsiveContainer>
  );
}


/** Donut chart splitting transactions into Virtual Account vs QRIS. */
export function VaQrisDonut({ data }: { data: CategorySlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={62}
          outerRadius={96}
          paddingAngle={3}
          stroke="#ffffff"
          strokeWidth={2}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={
                entry.name === "Virtual Account"
                  ? CATEGORY_COLOR.VA
                  : entry.name === "QRIS"
                    ? CATEGORY_COLOR.QRIS
                    : CATEGORY_COLOR.Other
              }
            />
          ))}
        </Pie>
        <Tooltip
          {...tooltipStyle}
          formatter={(value: FormatterValue, _n, payload) => {
            const total = data.reduce((a, b) => a + b.value, 0);
            const num = Number(value);
            const pct = total > 0 ? ((num / total) * 100).toFixed(1) : "0";
            return [
              `${formatNumber(num)} trx (${pct}%)`,
              (payload as { name?: string })?.name ?? "",
            ];
          }}
        />
        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DisbursementBankDonut({
  data,
}: {
  data: DisbursementBankDistributionItem[];
}) {
  const chartData = data.map((item) => ({
    name: item.bank_name,
    value: item.count,
    percentage: item.percentage,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={58}
          outerRadius={94}
          paddingAngle={3}
          stroke="#ffffff"
          strokeWidth={2}
        >
          {chartData.map((entry, index) => (
            <Cell key={entry.name} fill={SERIES_COLORS[index % SERIES_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          {...tooltipStyle}
          formatter={(value: FormatterValue, _name, payload) => {
            const count = Number(value);
            const percentage = (payload as { payload?: { percentage?: number } })?.payload?.percentage ?? 0;
            return [`${formatNumber(count)} transfer (${percentage.toFixed(1)}%)`, "Jumlah"];
          }}
        />
        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface StatusSlice {
  status: string;
  count: number;
}

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: "#34d399",
  PAID: "#34d399",
  WAITING_SETTLEMENT: "#f59e0b",
  PROCESSING: "#0ea5e9",
  PENDING: "#fbbf24",
  EXPIRED: "#f87171",
  FAILED: "#f87171",
  CANCELLED: "#94a3b8",
};

const STATUS_LABEL: Record<string, string> = {
  SUCCESS: "Sukses",
  PAID: "Dibayar",
  WAITING_SETTLEMENT: "Menunggu settlement",
  PROCESSING: "Diproses",
  PENDING: "Pending",
  EXPIRED: "Kedaluwarsa",
  FAILED: "Gagal",
  CANCELLED: "Dibatalkan",
  REFUND: "Refund",
  PROCESS: "Diproses",
};

/** Horizontal bar chart of status distribution. */
export function StatusBar({ data }: { data: StatusSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
      >
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatNumber(Number(v))}
        />
        <YAxis
          type="category"
          dataKey="status"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={80}
          tickFormatter={(value) => STATUS_LABEL[String(value).toUpperCase()] ?? value}
        />
        <Tooltip
          {...tooltipStyle}
          labelFormatter={(value) => STATUS_LABEL[String(value).toUpperCase()] ?? String(value)}
          formatter={(value: FormatterValue) => formatNumber(Number(value))}
        />
        <Bar dataKey="count" name="Jumlah" radius={[0, 6, 6, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={STATUS_COLOR[entry.status?.toUpperCase()] ?? "#6366f1"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
