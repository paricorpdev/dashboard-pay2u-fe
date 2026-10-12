import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names intelligently (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an integer amount (rupiah, no decimals) into a compact IDR string. */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact currency for axis labels: 1.2jt, 3.4M, 900rb. */
export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Plain thousands separator for counts. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

/** Format an ISO timestamp into a readable local date-time. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/** Format an ISO timestamp into a short date only. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d);
}

/** Human-friendly label for a payment method (e.g. "VA_BCA" → "Virtual Account BCA"). */
export function formatPaymentMethod(method: string): string {
  if (!method) return "-";
  const upper = method.toUpperCase();
  if (upper.startsWith("VA")) {
    const bank = method.slice(2).replace(/^_/, "");
    return bank ? `Virtual Account ${bank}` : "Virtual Account";
  }
  if (upper.includes("QRIS")) return "QRIS";
  return method;
}

/** Group a payment method into the top-level category used for the VA/QRIS pie. */
export function paymentMethodCategory(method: string): "VA" | "QRIS" | "Other" {
  const upper = (method ?? "").toUpperCase();
  if (upper.startsWith("VA") || upper.includes("VIRTUAL")) return "VA";
  if (upper.includes("QRIS")) return "QRIS";
  return "Other";
}

/** Extract a readable vendor/bank name from a payment method string. */
export function paymentMethodVendor(method: string): string {
  const cleaned = (method ?? "").replace(/_/g, " ").trim();
  const upper = cleaned.toUpperCase();
  if (upper === "QRIS") return "QRIS";
  if (upper.startsWith("VA")) {
    const bank = cleaned.slice(2).trim();
    return bank || "Virtual Account";
  }
  return cleaned || "Unknown";
}

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
