import type { AnalyticsBundle, CategorySlice } from "./analytics";
import type { OperationScope } from "@/components/operation-scope-filter";
import type { PeriodValue } from "@/components/period-filter";
import type { DisbursementBankDistributionItem } from "./types";
import {
  MONTH_NAMES,
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPaymentMethod,
} from "./utils";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

type Color = readonly [number, number, number];

const COLOR = {
  ink: [0.09, 0.13, 0.22] as Color,
  muted: [0.39, 0.45, 0.55] as Color,
  faint: [0.91, 0.93, 0.96] as Color,
  panel: [0.97, 0.98, 0.99] as Color,
  white: [1, 1, 1] as Color,
  indigo: [0.31, 0.27, 0.90] as Color,
  cyan: [0.05, 0.64, 0.83] as Color,
  green: [0.06, 0.62, 0.45] as Color,
  amber: [0.91, 0.55, 0.12] as Color,
  red: [0.86, 0.24, 0.29] as Color,
  slate: [0.43, 0.50, 0.60] as Color,
  violet: [0.56, 0.36, 0.86] as Color,
} as const;

const CHART_COLORS: Color[] = [
  COLOR.indigo,
  COLOR.cyan,
  COLOR.green,
  COLOR.amber,
  COLOR.violet,
  COLOR.red,
  COLOR.slate,
];

function pdfNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, "") : "0";
}

function pdfRgb(color: Color, operator: "rg" | "RG"): string {
  return `${pdfNumber(color[0])} ${pdfNumber(color[1])} ${pdfNumber(color[2])} ${operator}`;
}

function cleanPdfText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function truncate(value: string, maxLength: number): string {
  const text = cleanPdfText(value).replace(/[\\()]/g, "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

class PdfPage {
  readonly commands: string[] = [];

  text(
    value: string,
    x: number,
    top: number,
    size = 9,
    color: Color = COLOR.ink,
    bold = false,
    align: "left" | "right" | "center" = "left",
  ) {
    const text = cleanPdfText(value);
    const estimatedWidth = text.length * size * (bold ? 0.54 : 0.5);
    const left = align === "right" ? x - estimatedWidth : align === "center" ? x - estimatedWidth / 2 : x;
    const baseline = PAGE_HEIGHT - top - size;
    this.commands.push(
      `BT /${bold ? "F2" : "F1"} ${pdfNumber(size)} Tf ${pdfRgb(color, "rg")} ${pdfNumber(left)} ${pdfNumber(baseline)} Td (${text}) Tj ET`,
    );
  }

  rect(x: number, top: number, width: number, height: number, fill: Color, stroke?: Color) {
    const y = PAGE_HEIGHT - top - height;
    this.commands.push(`${pdfRgb(fill, "rg")} ${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re f`);
    if (stroke) {
      this.commands.push(`q ${pdfRgb(stroke, "RG")} 0.65 w ${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re S Q`);
    }
  }

  line(x1: number, top1: number, x2: number, top2: number, color: Color = COLOR.faint, width = 0.7) {
    this.commands.push(
      `q ${pdfRgb(color, "RG")} ${pdfNumber(width)} w ${pdfNumber(x1)} ${pdfNumber(PAGE_HEIGHT - top1)} m ${pdfNumber(x2)} ${pdfNumber(PAGE_HEIGHT - top2)} l S Q`,
    );
  }

  polyline(points: Array<{ x: number; top: number }>, color: Color, width = 2) {
    if (points.length < 2) return;
    const [first, ...rest] = points;
    const path = [
      `${pdfNumber(first.x)} ${pdfNumber(PAGE_HEIGHT - first.top)} m`,
      ...rest.map((point) => `${pdfNumber(point.x)} ${pdfNumber(PAGE_HEIGHT - point.top)} l`),
    ].join(" ");
    this.commands.push(`q ${pdfRgb(color, "RG")} ${pdfNumber(width)} w 1 J 1 j ${path} S Q`);
  }

  circle(x: number, centerTop: number, radius: number, fill: Color, stroke?: Color) {
    const cy = PAGE_HEIGHT - centerTop;
    const k = radius * 0.55228475;
    const path = [
      `${pdfNumber(x + radius)} ${pdfNumber(cy)} m`,
      `${pdfNumber(x + radius)} ${pdfNumber(cy + k)} ${pdfNumber(x + k)} ${pdfNumber(cy + radius)} ${pdfNumber(x)} ${pdfNumber(cy + radius)} c`,
      `${pdfNumber(x - k)} ${pdfNumber(cy + radius)} ${pdfNumber(x - radius)} ${pdfNumber(cy + k)} ${pdfNumber(x - radius)} ${pdfNumber(cy)} c`,
      `${pdfNumber(x - radius)} ${pdfNumber(cy - k)} ${pdfNumber(x - k)} ${pdfNumber(cy - radius)} ${pdfNumber(x)} ${pdfNumber(cy - radius)} c`,
      `${pdfNumber(x + k)} ${pdfNumber(cy - radius)} ${pdfNumber(x + radius)} ${pdfNumber(cy - k)} ${pdfNumber(x + radius)} ${pdfNumber(cy)} c h`,
    ].join(" ");
    this.commands.push(`${pdfRgb(fill, "rg")} ${path} f`);
    if (stroke) this.commands.push(`q ${pdfRgb(stroke, "RG")} 0.7 w ${path} S Q`);
  }

  sector(x: number, centerTop: number, radius: number, startDegrees: number, endDegrees: number, fill: Color) {
    const cx = x;
    const cy = PAGE_HEIGHT - centerTop;
    const pointAt = (degrees: number) => {
      const radians = (degrees * Math.PI) / 180;
      return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
    };
    const start = pointAt(startDegrees);
    const segments = Math.max(1, Math.ceil((endDegrees - startDegrees) / 90));
    const commands = [`${pdfNumber(cx)} ${pdfNumber(cy)} m`, `${pdfNumber(start.x)} ${pdfNumber(start.y)} l`];
    for (let index = 0; index < segments; index += 1) {
      const a0 = startDegrees + ((endDegrees - startDegrees) * index) / segments;
      const a1 = startDegrees + ((endDegrees - startDegrees) * (index + 1)) / segments;
      const delta = ((a1 - a0) * Math.PI) / 180;
      const k = (4 / 3) * Math.tan(delta / 4) * radius;
      const p0 = pointAt(a0);
      const p1 = pointAt(a1);
      const tangent0 = { x: -Math.sin((a0 * Math.PI) / 180), y: Math.cos((a0 * Math.PI) / 180) };
      const tangent1 = { x: -Math.sin((a1 * Math.PI) / 180), y: Math.cos((a1 * Math.PI) / 180) };
      const c1 = { x: p0.x + k * tangent0.x, y: p0.y + k * tangent0.y };
      const c2 = { x: p1.x - k * tangent1.x, y: p1.y - k * tangent1.y };
      commands.push(
        `${pdfNumber(c1.x)} ${pdfNumber(c1.y)} ${pdfNumber(c2.x)} ${pdfNumber(c2.y)} ${pdfNumber(p1.x)} ${pdfNumber(p1.y)} c`,
      );
    }
    this.commands.push(`${pdfRgb(fill, "rg")} ${commands.join(" ")} h f`);
  }
}

interface TrendRow {
  label: string;
  paymentCount: number;
  paymentAmount: number;
  disbursementCount: number;
  disbursementAmount: number;
}

interface DistributionRow {
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

interface StatusChartSeries {
  name: string;
  color: Color;
  values: number[];
}

interface StatusChartData {
  labels: string[];
  series: StatusChartSeries[];
}

interface StatusDetailRow {
  status: string;
  label: string;
  count: number;
  amount: number;
}

function periodLabel(period: PeriodValue): string {
  return period.mode === "monthly"
    ? `${MONTH_NAMES[period.month - 1]} ${period.year}`
    : `Tahun ${period.year}`;
}

function scopeLabel(scope: OperationScope): string {
  return scope === "all" ? "Semua alur" : scope === "payment" ? "Payment" : "Disbursement";
}

function buildTrendRows(bundle: AnalyticsBundle, period: PeriodValue): TrendRow[] {
  if (period.mode === "monthly") {
    return bundle.dailyTrend.map((payment, index) => ({
      label: String(payment.day).padStart(2, "0"),
      paymentCount: payment.total_count,
      paymentAmount: payment.total_amount,
      disbursementCount: bundle.disbursementDailyTrend[index]?.total_count ?? 0,
      disbursementAmount: bundle.disbursementDailyTrend[index]?.total_amount ?? 0,
    }));
  }
  return bundle.yearSeries.map((payment) => {
    const disbursement = bundle.disbursementYearSeries.find((row) => row.month === payment.month);
    return {
      label: payment.label,
      paymentCount: payment.count,
      paymentAmount: payment.volume,
      disbursementCount: disbursement?.count ?? 0,
      disbursementAmount: disbursement?.volume ?? 0,
    };
  });
}

function buildStatusChartData(
  bundle: AnalyticsBundle,
  period: PeriodValue,
  activity: "payment" | "disbursement",
): StatusChartData {
  if (activity === "payment") {
    const rows = period.mode === "monthly"
      ? bundle.dailyTrend.map((row) => ({
          label: String(row.day).padStart(2, "0"),
          values: [row.success_count, row.pending_count, row.expired_count],
        }))
      : bundle.yearSeries.map((row) => ({
          label: row.label,
          values: [row.success, row.pending, row.expired],
        }));
    return {
      labels: rows.map((row) => row.label),
      series: [
        { name: "Sukses", color: COLOR.green, values: rows.map((row) => row.values[0]) },
        { name: "Pending", color: COLOR.amber, values: rows.map((row) => row.values[1]) },
        { name: "Expired", color: COLOR.red, values: rows.map((row) => row.values[2]) },
      ],
    };
  }

  const rows = period.mode === "monthly"
    ? bundle.disbursementDailyTrend.map((row) => ({
        label: String(row.day).padStart(2, "0"),
        values: [row.success_count, row.waiting_settlement_count, row.processing_count, row.failed_count, row.cancelled_count],
      }))
    : bundle.disbursementYearSeries.map((row) => ({
        label: row.label,
        values: [row.success, row.waitingSettlement, row.processing, row.failed, row.cancelled],
      }));
  return {
    labels: rows.map((row) => row.label),
    series: [
      { name: "Sukses", color: COLOR.green, values: rows.map((row) => row.values[0]) },
      { name: "Menunggu", color: COLOR.amber, values: rows.map((row) => row.values[1]) },
      { name: "Diproses", color: COLOR.cyan, values: rows.map((row) => row.values[2]) },
      { name: "Gagal", color: COLOR.red, values: rows.map((row) => row.values[3]) },
      { name: "Dibatalkan", color: COLOR.slate, values: rows.map((row) => row.values[4]) },
    ],
  };
}

function paymentDistribution(bundle: AnalyticsBundle): DistributionRow[] {
  const total = bundle.vaQrisSplit.reduce((sum, row) => sum + row.value, 0);
  return bundle.vaQrisSplit.map((row: CategorySlice) => ({
    label: row.name,
    count: row.value,
    amount: row.amount,
    percentage: total > 0 ? (row.value / total) * 100 : 0,
  }));
}

function bankDistribution(bundle: AnalyticsBundle): DistributionRow[] {
  return bundle.disbursementBanks.map((row: DisbursementBankDistributionItem) => ({
    label: row.bank_name,
    count: row.count,
    amount: row.amount,
    percentage: row.percentage,
  }));
}

function drawPageFooter(page: PdfPage, index: number, total: number) {
  page.line(PAGE_MARGIN, 812, PAGE_WIDTH - PAGE_MARGIN, 812, COLOR.faint, 0.8);
  page.text("PAYGATE  |  Laporan analitik operasional", PAGE_MARGIN, 820, 7, COLOR.muted);
  page.text(`Halaman ${index + 1} dari ${total}`, PAGE_WIDTH - PAGE_MARGIN, 820, 7, COLOR.muted, false, "right");
}

function drawReportPageHeader(page: PdfPage, title: string, subtitle: string, continuation = false) {
  page.text("PAYGATE ANALYTICS", PAGE_MARGIN, 30, 8, COLOR.indigo, true);
  page.text(continuation ? `${title} (lanjutan)` : title, PAGE_MARGIN, 48, 19, COLOR.ink, true);
  page.text(subtitle, PAGE_MARGIN, 73, 9, COLOR.muted);
  page.line(PAGE_MARGIN, 94, PAGE_WIDTH - PAGE_MARGIN, 94, COLOR.faint, 0.8);
}

function drawMetricCard(
  page: PdfPage,
  x: number,
  top: number,
  width: number,
  title: string,
  amount: number,
  color: Color,
  lines: string[],
) {
  page.rect(x, top, width, 108, COLOR.white, COLOR.faint);
  page.rect(x, top, 4, 108, color);
  page.text(title.toUpperCase(), x + 14, top + 11, 8, color, true);
  page.text(formatCurrency(amount), x + 14, top + 26, 18, COLOR.ink, true);
  lines.slice(0, 3).forEach((line, index) => {
    page.text(truncate(line, Math.floor((width - 28) / 3.8)), x + 14, top + 55 + index * 15, 7.2, COLOR.muted);
  });
}

function drawFlowChart(
  page: PdfPage,
  top: number,
  rows: TrendRow[],
  period: PeriodValue,
  showPayment: boolean,
  showDisbursement: boolean,
) {
  const x = PAGE_MARGIN;
  const width = CONTENT_WIDTH;
  const height = 246;
  page.rect(x, top, width, height, COLOR.white, COLOR.faint);
  page.text("Pergerakan nilai transaksi", x + 15, top + 12, 11, COLOR.ink, true);
  page.text(
    period.mode === "yearly" ? `Nilai sukses per bulan selama ${period.year}` : `Nilai transaksi harian pada ${periodLabel(period)}`,
    x + 15,
    top + 28,
    8,
    COLOR.muted,
  );

  const plotLeft = x + 58;
  const plotTop = top + 52;
  const plotWidth = width - 76;
  const plotHeight = 145;
  const maxValue = Math.max(
    1,
    ...rows.map((row) => Math.max(showPayment ? row.paymentAmount : 0, showDisbursement ? row.disbursementAmount : 0)),
  );
  for (let tick = 0; tick <= 4; tick += 1) {
    const ratio = tick / 4;
    const y = plotTop + plotHeight - ratio * plotHeight;
    page.line(plotLeft, y, plotLeft + plotWidth, y, COLOR.faint, 0.55);
    const value = maxValue * ratio;
    const label = `Rp ${formatCurrencyCompact(value)}`;
    page.text(label, plotLeft - 7, y - 4, 6.5, COLOR.muted, false, "right");
  }

  const pointFor = (value: number, index: number) => ({
    x: plotLeft + (rows.length <= 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth),
    top: plotTop + plotHeight - (value / maxValue) * plotHeight,
  });
  if (showPayment) page.polyline(rows.map((row, index) => pointFor(row.paymentAmount, index)), COLOR.indigo, 2.2);
  if (showDisbursement) page.polyline(rows.map((row, index) => pointFor(row.disbursementAmount, index)), COLOR.cyan, 2.2);

  const labelStep = Math.max(1, Math.ceil(rows.length / 7));
  rows.forEach((row, index) => {
    if (index % labelStep !== 0 && index !== rows.length - 1) return;
    const p = pointFor(0, index);
    page.text(row.label, p.x, plotTop + plotHeight + 5, 6.5, COLOR.muted, false, "center");
  });

  let legendX = x + 16;
  const legendTop = top + 222;
  if (showPayment) {
    page.rect(legendX, legendTop + 2, 7, 7, COLOR.indigo);
    page.text("Payment masuk", legendX + 12, legendTop, 7.5, COLOR.muted);
    legendX += 98;
  }
  if (showDisbursement) {
    page.rect(legendX, legendTop + 2, 7, 7, COLOR.cyan);
    page.text("Disbursement keluar", legendX + 12, legendTop, 7.5, COLOR.muted);
  }
}

function drawStatusPanel(
  page: PdfPage,
  x: number,
  top: number,
  width: number,
  title: string,
  data: StatusChartData,
) {
  const height = 280;
  page.rect(x, top, width, height, COLOR.white, COLOR.faint);
  page.text(title, x + 13, top + 11, 10, COLOR.ink, true);
  page.text("Jumlah transaksi per periode", x + 13, top + 26, 7, COLOR.muted);

  const plotLeft = x + 37;
  const plotTop = top + 49;
  const plotWidth = width - 49;
  const plotHeight = 150;
  const totals = data.labels.map((_, index) => data.series.reduce((sum, series) => sum + (series.values[index] ?? 0), 0));
  const maxValue = Math.max(1, ...totals);
  for (let tick = 0; tick <= 3; tick += 1) {
    const ratio = tick / 3;
    const y = plotTop + plotHeight - ratio * plotHeight;
    page.line(plotLeft, y, plotLeft + plotWidth, y, COLOR.faint, 0.5);
    page.text(formatNumber(Math.round(maxValue * ratio)), plotLeft - 5, y - 4, 6, COLOR.muted, false, "right");
  }

  if (data.labels.length > 0) {
    const slotWidth = plotWidth / data.labels.length;
    const barWidth = Math.max(2, Math.min(13, slotWidth * 0.64));
    data.labels.forEach((label, index) => {
      const centerX = plotLeft + slotWidth * (index + 0.5);
      let currentBottom = plotTop + plotHeight;
      data.series.forEach((series) => {
        const value = series.values[index] ?? 0;
        const segmentHeight = (value / maxValue) * plotHeight;
        if (segmentHeight > 0.5) {
          page.rect(centerX - barWidth / 2, currentBottom - segmentHeight, barWidth, segmentHeight, series.color);
        }
        currentBottom -= segmentHeight;
      });
      const step = Math.max(1, Math.ceil(data.labels.length / 6));
      if (index % step === 0 || index === data.labels.length - 1) {
        page.text(label, centerX, plotTop + plotHeight + 5, 5.8, COLOR.muted, false, "center");
      }
    });
  }

  const columns = 3;
  const legendTop = top + 221;
  data.series.forEach((series, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const legendX = x + 13 + column * ((width - 26) / columns);
    const total = series.values.reduce((sum, value) => sum + value, 0);
    page.rect(legendX, legendTop + row * 18 + 2, 6, 6, series.color);
    page.text(`${series.name} ${formatNumber(total)}`, legendX + 10, legendTop + row * 18, 6.4, COLOR.muted);
  });
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    SUCCESS: "Sukses",
    PENDING: "Pending",
    EXPIRED: "Expired",
    FAILED: "Gagal",
    CANCELLED: "Dibatalkan",
    WAITING_SETTLEMENT: "Menunggu settlement",
    PROCESSING: "Diproses",
  };
  return labels[status.toUpperCase()] ?? status.replaceAll("_", " ");
}

function paymentStatusDetails(bundle: AnalyticsBundle): StatusDetailRow[] {
  const statusMap = new Map(bundle.statusDistribution.map((row) => [row.status.toUpperCase(), row]));
  const defaults = [
    { status: "SUCCESS", count: bundle.summary.success_count },
    { status: "PENDING", count: bundle.summary.pending_count },
    { status: "EXPIRED", count: bundle.summary.expired_count },
  ];
  const rows = defaults.map(({ status, count }) => {
    const source = statusMap.get(status);
    return { status, label: statusLabel(status), count: source?.count ?? count, amount: source?.amount ?? 0 };
  });
  for (const source of bundle.statusDistribution) {
    if (defaults.some((item) => item.status === source.status.toUpperCase())) continue;
    rows.push({
      status: source.status.toUpperCase(),
      label: statusLabel(source.status),
      count: source.count,
      amount: source.amount,
    });
  }
  return rows;
}

function disbursementStatusDetails(bundle: AnalyticsBundle): StatusDetailRow[] {
  const summary = bundle.disbursementSummary;
  return [
    { status: "SUCCESS", label: "Sukses", count: summary.success_count, amount: summary.total_volume_amount },
    { status: "WAITING_SETTLEMENT", label: "Menunggu settlement", count: summary.waiting_settlement_count, amount: summary.waiting_settlement_amount },
    { status: "PROCESSING", label: "Diproses", count: summary.processing_count, amount: summary.processing_amount },
    { status: "FAILED", label: "Gagal", count: summary.failed_count, amount: summary.failed_amount },
    { status: "CANCELLED", label: "Dibatalkan", count: summary.cancelled_count, amount: summary.cancelled_amount },
  ];
}

function drawStatusDetailPanel(page: PdfPage, x: number, top: number, width: number, title: string, rows: StatusDetailRow[], totalCount: number) {
  const innerX = x + 9;
  const innerWidth = width - 18;
  const columnWidths = [innerWidth * 0.43, innerWidth * 0.22, innerWidth * 0.35];
  const rowHeight = 18;
  const panelHeight = 53 + (rows.length + 1) * rowHeight;
  page.rect(x, top, width, panelHeight, COLOR.white, COLOR.faint);
  page.text(title, x + 11, top + 9, 8.5, COLOR.ink, true);
  drawTableHeader(page, innerX, top + 26, columnWidths, ["Status", "Jumlah", "Nilai transaksi"]);

  let rowTop = top + 51;
  rows.forEach((row, index) => {
    if (index % 2 === 1) page.rect(innerX, rowTop, innerWidth, rowHeight, COLOR.panel);
    const values = [row.label, formatNumber(row.count), formatCurrency(row.amount)];
    let cellX = innerX;
    values.forEach((value, columnIndex) => {
      const rightAligned = columnIndex > 0;
      page.text(
        truncate(value, columnIndex === 0 ? 22 : 22),
        rightAligned ? cellX + columnWidths[columnIndex] - 6 : cellX + 6,
        rowTop + 5,
        6.5,
        COLOR.ink,
        false,
        rightAligned ? "right" : "left",
      );
      cellX += columnWidths[columnIndex];
    });
    page.line(innerX, rowTop + rowHeight, innerX + innerWidth, rowTop + rowHeight, COLOR.faint, 0.35);
    rowTop += rowHeight;
  });

  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
  page.rect(innerX, rowTop, innerWidth, rowHeight, [0.93, 0.94, 1]);
  page.text("TOTAL", innerX + 6, rowTop + 5, 6.5, COLOR.ink, true);
  page.text(formatNumber(totalCount), innerX + columnWidths[0] + columnWidths[1] - 6, rowTop + 5, 6.5, COLOR.ink, true, "right");
  page.text(formatCurrency(totalAmount), innerX + innerWidth - 6, rowTop + 5, 6.5, COLOR.ink, true, "right");
  return panelHeight;
}

function buildStatusPage(bundle: AnalyticsBundle, period: PeriodValue, scope: OperationScope): PdfPage {
  const page = new PdfPage();
  const showPayment = scope !== "disbursement";
  const showDisbursement = scope !== "payment";
  drawReportPageHeader(
    page,
    "Status transaksi",
    `${period.mode === "monthly" ? "Rincian harian" : "Rincian bulanan"}  |  ${periodLabel(period)}  |  ${scopeLabel(scope)}`,
  );

  if (showPayment && showDisbursement) {
    const gap = 12;
    const width = (CONTENT_WIDTH - gap) / 2;
    drawStatusPanel(page, PAGE_MARGIN, 112, width, "Status payment", buildStatusChartData(bundle, period, "payment"));
    drawStatusPanel(page, PAGE_MARGIN + width + gap, 112, width, "Status disbursement", buildStatusChartData(bundle, period, "disbursement"));
  } else if (showPayment) {
    drawStatusPanel(page, PAGE_MARGIN, 112, CONTENT_WIDTH, "Status payment", buildStatusChartData(bundle, period, "payment"));
  } else {
    drawStatusPanel(page, PAGE_MARGIN, 112, CONTENT_WIDTH, "Status disbursement", buildStatusChartData(bundle, period, "disbursement"));
  }

  const detailHeadingTop = 410;
  page.text("Rincian jumlah dan nilai per status", PAGE_MARGIN, detailHeadingTop, 10, COLOR.ink, true);
  const detailTop = detailHeadingTop + 20;
  const gap = 12;
  if (showPayment && showDisbursement) {
    const width = (CONTENT_WIDTH - gap) / 2;
    drawStatusDetailPanel(page, PAGE_MARGIN, detailTop, width, "Payment", paymentStatusDetails(bundle), bundle.summary.total_transaction_count);
    drawStatusDetailPanel(page, PAGE_MARGIN + width + gap, detailTop, width, "Disbursement", disbursementStatusDetails(bundle), bundle.disbursementSummary.total_disbursement_count);
  } else if (showPayment) {
    drawStatusDetailPanel(page, PAGE_MARGIN, detailTop, CONTENT_WIDTH, "Payment", paymentStatusDetails(bundle), bundle.summary.total_transaction_count);
  } else {
    drawStatusDetailPanel(page, PAGE_MARGIN, detailTop, CONTENT_WIDTH, "Disbursement", disbursementStatusDetails(bundle), bundle.disbursementSummary.total_disbursement_count);
  }

  return page;
}

function drawDonut(
  page: PdfPage,
  centerX: number,
  centerTop: number,
  radius: number,
  rows: DistributionRow[],
  centerLabel: string,
) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total <= 0) {
    page.circle(centerX, centerTop, radius, COLOR.faint);
  } else {
    let angle = 90;
    rows.forEach((row, index) => {
      if (row.count <= 0) return;
      const endAngle = angle + (row.count / total) * 360;
      page.sector(centerX, centerTop, radius, angle, endAngle, CHART_COLORS[index % CHART_COLORS.length]);
      angle = endAngle;
    });
  }
  page.circle(centerX, centerTop, radius * 0.57, COLOR.white);
  page.text(formatNumber(total), centerX, centerTop - 5, 10, COLOR.ink, true, "center");
  page.text(centerLabel, centerX, centerTop + 9, 6.5, COLOR.muted, false, "center");
}

function drawDistributionCard(
  page: PdfPage,
  x: number,
  top: number,
  width: number,
  title: string,
  subtitle: string,
  rows: DistributionRow[],
  unit: string,
) {
  const height = 222;
  page.rect(x, top, width, height, COLOR.white, COLOR.faint);
  page.text(title, x + 13, top + 11, 10, COLOR.ink, true);
  page.text(subtitle, x + 13, top + 26, 7, COLOR.muted);

  const compact = width < 350;
  const centerX = x + (compact ? 61 : 112);
  const listX = x + (compact ? 116 : 220);
  const radius = compact ? 49 : 57;
  drawDonut(page, centerX, top + 127, radius, rows, unit);

  if (rows.length === 0) {
    page.text("Belum ada data", listX, top + 112, 8, COLOR.muted);
    return;
  }

  const visible = rows.slice(0, 5);
  visible.forEach((row, index) => {
    const rowTop = top + 45 + index * 33;
    page.rect(listX, rowTop + 2, 6, 6, CHART_COLORS[index % CHART_COLORS.length]);
    page.text(truncate(row.label, compact ? 19 : 35), listX + 10, rowTop, 7.5, COLOR.ink, true);
    page.text(`${formatNumber(row.count)} ${unit}  |  ${row.percentage.toFixed(1)}%`, listX + 10, rowTop + 10, 6.6, COLOR.muted);
    page.text(formatCurrency(row.amount), listX + 10, rowTop + 20, 6.6, COLOR.muted);
  });
  if (rows.length > visible.length) {
    page.text(`+ ${rows.length - visible.length} kategori lain; rincian lengkap di halaman berikutnya`, x + 13, top + 207, 6.2, COLOR.muted);
  }
}

function buildOverviewPage(
  bundle: AnalyticsBundle,
  period: PeriodValue,
  scope: OperationScope,
  merchantName: string,
): PdfPage {
  const page = new PdfPage();
  const showPayment = scope !== "disbursement";
  const showDisbursement = scope !== "payment";
  const paymentRows = paymentDistribution(bundle);
  const bankRows = bankDistribution(bundle);

  page.rect(0, 0, PAGE_WIDTH, 6, COLOR.indigo);
  page.text("PAYGATE ANALYTICS", PAGE_MARGIN, 20, 8, COLOR.indigo, true);
  page.text("Laporan operasional", PAGE_MARGIN, 38, 22, COLOR.ink, true);
  page.text("Ringkasan payment masuk dan disbursement keluar", PAGE_MARGIN, 66, 9, COLOR.muted);

  page.rect(PAGE_MARGIN, 87, CONTENT_WIDTH, 51, COLOR.panel);
  const metaColumns = [PAGE_MARGIN + 13, PAGE_MARGIN + 185, PAGE_MARGIN + 355];
  page.text("PERIODE", metaColumns[0], 97, 6.5, COLOR.muted, true);
  page.text(periodLabel(period), metaColumns[0], 109, 8.5, COLOR.ink, true);
  page.text("AKTIVITAS", metaColumns[1], 97, 6.5, COLOR.muted, true);
  page.text(scopeLabel(scope), metaColumns[1], 109, 8.5, COLOR.ink, true);
  page.text("MERCHANT", metaColumns[2], 97, 6.5, COLOR.muted, true);
  page.text(truncate(merchantName || "Semua merchant", 29), metaColumns[2], 109, 8.5, COLOR.ink, true);
  page.text(`Dibuat ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date())} WIB`, PAGE_MARGIN + 13, 125, 6.5, COLOR.muted);

  const visibleMetricCount = Number(showPayment) + Number(showDisbursement);
  const gap = 12;
  const metricWidth = visibleMetricCount === 2 ? (CONTENT_WIDTH - gap) / 2 : CONTENT_WIDTH;
  const metricTop = 151;
  let metricX = PAGE_MARGIN;

  if (showPayment) {
    const summary = bundle.summary;
    drawMetricCard(page, metricX, metricTop, metricWidth, "Payment masuk", summary.total_volume_amount, COLOR.indigo, [
      `${formatNumber(summary.total_transaction_count)} transaksi  |  ${formatNumber(summary.success_count)} sukses  |  ${summary.success_rate.toFixed(1)}% sukses`,
      `Pending ${formatNumber(summary.pending_count)}  |  Expired ${formatNumber(summary.expired_count)}`,
      `Admin fee sukses ${formatCurrency(summary.total_admin_fee)}`,
    ]);
    metricX += metricWidth + gap;
  }
  if (showDisbursement) {
    const summary = bundle.disbursementSummary;
    drawMetricCard(page, metricX, metricTop, metricWidth, "Disbursement keluar", summary.total_volume_amount, COLOR.cyan, [
      `${formatNumber(summary.total_disbursement_count)} transfer  |  ${formatNumber(summary.success_count)} sukses  |  ${summary.success_rate.toFixed(1)}% sukses`,
      `Menunggu ${formatNumber(summary.waiting_settlement_count)}  |  Diproses ${formatNumber(summary.processing_count)}`,
      `Gagal ${formatNumber(summary.failed_count)}  |  Batal ${formatNumber(summary.cancelled_count)}  |  Fee ${formatCurrency(summary.total_admin_fee)}`,
    ]);
  }

  drawFlowChart(page, 271, buildTrendRows(bundle, period), period, showPayment, showDisbursement);

  const distributionTop = 531;
  if (showPayment && showDisbursement) {
    const cardWidth = (CONTENT_WIDTH - gap) / 2;
    drawDistributionCard(page, PAGE_MARGIN, distributionTop, cardWidth, "Metode pembayaran", "Komposisi transaksi payment sukses", paymentRows, "trx");
    drawDistributionCard(page, PAGE_MARGIN + cardWidth + gap, distributionTop, cardWidth, "Bank tujuan disbursement", "Transfer sukses berdasarkan beneficiary_bank_name", bankRows, "transfer");
  } else if (showPayment) {
    drawDistributionCard(page, PAGE_MARGIN, distributionTop, CONTENT_WIDTH, "Metode pembayaran", "Komposisi transaksi payment sukses", paymentRows, "trx");
  } else {
    drawDistributionCard(page, PAGE_MARGIN, distributionTop, CONTENT_WIDTH, "Bank tujuan disbursement", "Transfer sukses berdasarkan beneficiary_bank_name", bankRows, "transfer");
  }
  
  return page;
}

function drawTableHeader(page: PdfPage, x: number, top: number, widths: number[], labels: string[]) {
  const height = 25;
  page.rect(x, top, widths.reduce((sum, width) => sum + width, 0), height, COLOR.indigo);
  let currentX = x;
  labels.forEach((label, index) => {
    const rightAligned = index > 0;
    page.text(label, rightAligned ? currentX + widths[index] - 8 : currentX + 8, top + 8, 7, COLOR.white, true, rightAligned ? "right" : "left");
    currentX += widths[index];
  });
}

function drawTrendDetailPage(
  bundle: AnalyticsBundle,
  period: PeriodValue,
  scope: OperationScope,
): PdfPage {
  const page = new PdfPage();
  const showPayment = scope !== "disbursement";
  const showDisbursement = scope !== "payment";
  drawReportPageHeader(page, "Rincian periode", `${period.mode === "monthly" ? "Rincian harian" : "Rincian bulanan"}  |  ${periodLabel(period)}  |  ${scopeLabel(scope)}`);

  const labels = ["Periode"];
  const widths = showPayment && showDisbursement ? [80, 76, 126, 76, 153] : [112, 100, 299];
  if (showPayment) labels.push("Pay trx", "Pay nilai sukses");
  if (showDisbursement) labels.push("Disb trx", "Disb terkirim");
  drawTableHeader(page, PAGE_MARGIN, 112, widths, labels);

  const rows = buildTrendRows(bundle, period);
  const rowHeight = 19;
  rows.forEach((row, index) => {
    const top = 137 + index * rowHeight;
    if (index % 2 === 1) page.rect(PAGE_MARGIN, top, CONTENT_WIDTH, rowHeight, COLOR.panel);
    const values = [row.label];
    if (showPayment) values.push(formatNumber(row.paymentCount), formatCurrency(row.paymentAmount));
    if (showDisbursement) values.push(formatNumber(row.disbursementCount), formatCurrency(row.disbursementAmount));
    let x = PAGE_MARGIN;
    values.forEach((value, columnIndex) => {
      const rightAligned = columnIndex > 0;
      page.text(value, rightAligned ? x + widths[columnIndex] - 8 : x + 8, top + 5, 7.4, COLOR.ink, false, rightAligned ? "right" : "left");
      x += widths[columnIndex];
    });
    page.line(PAGE_MARGIN, top + rowHeight, PAGE_MARGIN + CONTENT_WIDTH, top + rowHeight, COLOR.faint, 0.35);
  });

  const totalTop = 141 + rows.length * rowHeight;
  if (totalTop < 780) {
    page.rect(PAGE_MARGIN, totalTop, CONTENT_WIDTH, 30, [0.93, 0.94, 1]);
    page.text("TOTAL PERIODE", PAGE_MARGIN + 8, totalTop + 9, 7.5, COLOR.ink, true);
    const totalParts: string[] = [];
    if (showPayment) totalParts.push(`${formatNumber(bundle.summary.total_transaction_count)} trx  |  ${formatCurrency(bundle.summary.total_volume_amount)} sukses`);
    if (showDisbursement) totalParts.push(`${formatNumber(bundle.disbursementSummary.total_disbursement_count)} transfer  |  ${formatCurrency(bundle.disbursementSummary.total_volume_amount)} terkirim`);
    page.text(
      totalParts.join("     "),
      PAGE_MARGIN + CONTENT_WIDTH - 9,
      totalTop + 9,
      7,
      COLOR.ink,
      true,
      "right",
    );
  }
  return page;
}

function drawDistributionTableHeader(page: PdfPage, top: number) {
  drawTableHeader(page, PAGE_MARGIN, top, [235, 82, 122, 96], ["Metode / bank tujuan", "Jumlah sukses", "Nilai sukses", "Porsi"]);
}

function drawDistributionDetailsPage(
  bundle: AnalyticsBundle,
  scope: OperationScope,
): PdfPage[] {
  const pages: PdfPage[] = [];
  const startPage = () => {
    const page = new PdfPage();
    drawReportPageHeader(page, "Rincian distribusi", scopeLabel(scope));
    pages.push(page);
    return page;
  };

  let page = startPage();
  let top = 111;
  const drawSection = (title: string, rows: DistributionRow[], unit: string) => {
    if (top + 65 > 790) {
      page = startPage();
      top = 111;
    }
    page.text(title, PAGE_MARGIN, top, 11, COLOR.ink, true);
    page.text(`Jumlah dan nilai hanya dihitung dari transaksi sukses (${unit})`, PAGE_MARGIN, top + 15, 7, COLOR.muted);
    top += 27;
    drawDistributionTableHeader(page, top);
    top += 25;

    if (rows.length === 0) {
      page.text("Tidak ada data pada periode ini.", PAGE_MARGIN + 8, top + 7, 8, COLOR.muted);
      top += 25;
      return;
    }

    rows.forEach((row, index) => {
      if (top + 20 > 790) {
        page = startPage();
        top = 111;
        page.text(`${title} (lanjutan)`, PAGE_MARGIN, top, 11, COLOR.ink, true);
        top += 25;
        drawDistributionTableHeader(page, top);
        top += 25;
      }
      if (index % 2 === 1) page.rect(PAGE_MARGIN, top, CONTENT_WIDTH, 20, COLOR.panel);
      const values = [truncate(row.label, 48), formatNumber(row.count), formatCurrency(row.amount), `${row.percentage.toFixed(1)}%`];
      const widths = [235, 82, 122, 96];
      let x = PAGE_MARGIN;
      values.forEach((value, columnIndex) => {
        const rightAligned = columnIndex > 0;
        page.text(value, rightAligned ? x + widths[columnIndex] - 8 : x + 8, top + 6, 7.5, COLOR.ink, false, rightAligned ? "right" : "left");
        x += widths[columnIndex];
      });
      page.line(PAGE_MARGIN, top + 20, PAGE_MARGIN + CONTENT_WIDTH, top + 20, COLOR.faint, 0.35);
      top += 20;
    });
    top += 24;
  };

  if (scope !== "disbursement") {
    const rows = bundle.paymentMethods.map((row) => ({
      label: formatPaymentMethod(row.payment_method),
      count: row.count,
      amount: row.amount,
      percentage: row.percentage,
    }));
    drawSection("Metode payment", rows, "transaksi");
  }
  if (scope !== "payment") drawSection("Bank tujuan disbursement", bankDistribution(bundle), "transfer");
  return pages;
}

function makePdf(pages: PdfPage[]): string {
  pages.forEach((page, index) => drawPageFooter(page, index, pages.length));
  const objects: string[] = [];
  const pageRefs: number[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  let nextObject = 5;
  for (const page of pages) {
    const contentId = nextObject++;
    const pageId = nextObject++;
    pageRefs.push(pageId);
    const stream = page.commands.join("\n");
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
  }

  objects[2] = `<< /Type /Pages /Kids [${pageRefs.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;
  let document = "%PDF-1.4\n%PAYGATE\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = document.length;
    document += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = document.length;
  document += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    document += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  document += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return document;
}

export function downloadAnalyticsPdf(
  bundle: AnalyticsBundle,
  period: PeriodValue,
  scope: OperationScope,
  merchantName: string,
) {
  const pages = [
    buildOverviewPage(bundle, period, scope, merchantName),
    buildStatusPage(bundle, period, scope),
    drawTrendDetailPage(bundle, period, scope),
    ...drawDistributionDetailsPage(bundle, scope),
  ];
  const pdf = makePdf(pages);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const periodSuffix = period.mode === "monthly"
    ? `${period.year}-${String(period.month).padStart(2, "0")}`
    : String(period.year);
  anchor.href = objectUrl;
  anchor.download = `paygate-analytics-${scope}-${periodSuffix}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
