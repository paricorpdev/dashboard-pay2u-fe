import type { AnalyticsBundle } from "./analytics";
import type { OperationScope } from "@/components/operation-scope-filter";
import type { PeriodValue } from "@/components/period-filter";
import { MONTH_NAMES, formatCurrency, formatNumber, formatPaymentMethod } from "./utils";

interface PdfLine {
  text: string;
  size?: number;
  bold?: boolean;
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

function wrapText(text: string, maxLength = 88): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildReportLines(
  bundle: AnalyticsBundle,
  period: PeriodValue,
  scope: OperationScope,
  merchantName: string,
): PdfLine[] {
  const lines: PdfLine[] = [];
  const periodLabel = period.mode === "monthly"
    ? `${MONTH_NAMES[period.month - 1]} ${period.year}`
    : `Tahun ${period.year}`;
  const scopeLabel = scope === "all" ? "Semua alur" : scope === "payment" ? "Payment" : "Disbursement";

  lines.push({ text: "PAYGATE | LAPORAN OPERASIONAL", size: 19, bold: true });
  lines.push({ text: "Ringkasan payment dan disbursement", size: 11 });
  lines.push({ text: `Periode: ${periodLabel}   |   Aktivitas: ${scopeLabel}`, size: 10 });
  lines.push({ text: `Merchant: ${merchantName || "Semua merchant"}`, size: 10 });
  lines.push({ text: `Dibuat: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`, size: 9 });
  lines.push({ text: "" });

  if (scope !== "disbursement") {
    const summary = bundle.summary;
    lines.push({ text: "PAYMENT MASUK", size: 13, bold: true });
    lines.push({ text: `Volume sukses: ${formatCurrency(summary.total_volume_amount)}` });
    lines.push({ text: `Total transaksi: ${formatNumber(summary.total_transaction_count)}   |   Sukses: ${formatNumber(summary.success_count)}   |   Success rate: ${summary.success_rate.toFixed(1)}%` });
    lines.push({ text: `Pending: ${formatNumber(summary.pending_count)}   |   Expired: ${formatNumber(summary.expired_count)}   |   Admin fee sukses: ${formatCurrency(summary.total_admin_fee)}` });
    lines.push({ text: "" });
  }

  if (scope !== "payment") {
    const summary = bundle.disbursementSummary;
    const pending = summary.waiting_settlement_count + summary.processing_count;
    const failed = summary.failed_count + summary.cancelled_count;
    lines.push({ text: "DISBURSEMENT KELUAR", size: 13, bold: true });
    lines.push({ text: `Dana terkirim sukses: ${formatCurrency(summary.total_volume_amount)}` });
    lines.push({ text: `Total transfer: ${formatNumber(summary.total_disbursement_count)}   |   Sukses: ${formatNumber(summary.success_count)}   |   Success rate: ${summary.success_rate.toFixed(1)}%` });
    lines.push({ text: `Menunggu settlement: ${formatNumber(summary.waiting_settlement_count)}   |   Diproses: ${formatNumber(summary.processing_count)}` });
    lines.push({ text: `Gagal: ${formatNumber(summary.failed_count)}   |   Dibatalkan: ${formatNumber(summary.cancelled_count)}   |   Admin fee sukses: ${formatCurrency(summary.total_admin_fee)}` });
    lines.push({ text: `Transfer pending: ${formatNumber(pending)}   |   Gagal/dibatalkan: ${formatNumber(failed)}` });
    lines.push({ text: "" });
  }

  lines.push({ text: period.mode === "monthly" ? "TREN HARIAN" : "TREN BULANAN", size: 13, bold: true });
  const trendColumns = ["Tanggal / periode"];
  if (scope !== "disbursement") trendColumns.push("Payment: jumlah / nilai sukses");
  if (scope !== "payment") trendColumns.push("Disbursement: jumlah / nilai terkirim");
  lines.push({ text: trendColumns.join(" | "), size: 9, bold: true });
  if (period.mode === "monthly") {
    const dailyRows = bundle.dailyTrend.map((payment, index) => ({
      label: `${payment.day}`,
      paymentCount: payment.total_count,
      paymentAmount: payment.total_amount,
      disbursementCount: bundle.disbursementDailyTrend[index]?.total_count ?? 0,
      disbursementAmount: bundle.disbursementDailyTrend[index]?.total_amount ?? 0,
    }));
    for (const row of dailyRows) {
      const parts = [row.label.padStart(2, "0")];
      if (scope !== "disbursement") parts.push(`Pay ${formatNumber(row.paymentCount)} / ${formatCurrency(row.paymentAmount)}`);
      if (scope !== "payment") parts.push(`Disb ${formatNumber(row.disbursementCount)} / ${formatCurrency(row.disbursementAmount)}`);
      lines.push({ text: parts.join("   |   "), size: 9 });
    }
  } else {
    for (const row of bundle.yearSeries) {
      const disbursement = bundle.disbursementYearSeries.find((item) => item.month === row.month);
      const parts = [row.label];
      if (scope !== "disbursement") parts.push(`Pay ${formatNumber(row.count)} / ${formatCurrency(row.volume)}`);
      if (scope !== "payment") parts.push(`Disb ${formatNumber(disbursement?.count ?? 0)} / ${formatCurrency(disbursement?.volume ?? 0)}`);
      lines.push({ text: parts.join("   |   "), size: 9 });
    }
  }

  if (scope !== "disbursement" && bundle.paymentMethods.length > 0) {
    lines.push({ text: "" });
    lines.push({ text: "METODE PAYMENT", size: 13, bold: true });
    for (const method of bundle.paymentMethods) {
      lines.push({
        text: `${formatPaymentMethod(method.payment_method)}: ${formatNumber(method.count)} transaksi, ${formatCurrency(method.amount)} (${method.percentage.toFixed(1)}%)`,
        size: 9,
      });
    }
  }

  if (scope !== "payment" && bundle.disbursementBanks.length > 0) {
    lines.push({ text: "" });
    lines.push({ text: "BANK TUJUAN DISBURSEMENT", size: 13, bold: true });
    for (const bank of bundle.disbursementBanks) {
      lines.push({
        text: `${bank.bank_name}: ${formatNumber(bank.count)} transfer, ${formatCurrency(bank.amount)} terkirim sukses (${bank.percentage.toFixed(1)}%)`,
        size: 9,
      });
    }
  }

  lines.push({ text: "" });
  lines.push({
    text: "Nilai payment adalah total amount transaksi sukses; nilai disbursement adalah dana amount yang berhasil dikirim.",
    size: 8,
  });
  return lines.flatMap((line) => wrapText(line.text).map((text, index) => ({
    ...line,
    text: index === 0 ? text : `  ${text}`,
  })));
}

function makePdf(lines: PdfLine[]): string {
  const linesPerPage = 48;
  const chunks: PdfLine[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    chunks.push(lines.slice(i, i + linesPerPage));
  }
  if (chunks.length === 0) chunks.push([]);

  const objects: string[] = [];
  const pageRefs: number[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  let nextObject = 5;
  for (const [pageIndex, chunk] of chunks.entries()) {
    const contentId = nextObject++;
    const pageId = nextObject++;
    pageRefs.push(pageId);

    const commands = ["BT"];
    commands.push("/F2 8 Tf 50 815 Td (PAYGATE ANALYTICS) Tj ET");
    commands.push("0.75 w 50 805 m 545 805 l S");
    let y = 784;
    for (const line of chunk) {
      const size = line.size ?? 10;
      commands.push(`BT /${line.bold ? "F2" : "F1"} ${size} Tf 50 ${y} Td (${cleanPdfText(line.text)}) Tj ET`);
      y -= Math.max(14, size + 4);
    }
    commands.push(`BT /F1 8 Tf 50 30 Td (Halaman ${pageIndex + 1} dari ${chunks.length}) Tj ET`);
    const stream = commands.join("\n");
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
  }

  objects[2] = `<< /Type /Pages /Kids [${pageRefs.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`;
  let document = "%PDF-1.4\n%PAYGATE\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = document.length;
    document += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = document.length;
  document += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
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
  const pdf = makePdf(buildReportLines(bundle, period, scope, merchantName));
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
