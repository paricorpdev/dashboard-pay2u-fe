"use client";

import { X } from "lucide-react";
import type { TransactionDetail } from "@/lib/types";
import { Badge, statusTone } from "@/components/ui";
import {
  formatCurrency,
  formatDateTime,
  formatPaymentMethod,
} from "@/lib/utils";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right text-sm text-foreground">{value}</span>
    </div>
  );
}

export function TransactionDrawer({
  open,
  onClose,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  transaction: TransactionDetail | null;
}) {
  if (!open || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Detail Transaksi</h3>
            <p className="font-mono text-xs text-muted-foreground">
              {transaction.request_id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-3">
            <Badge tone={statusTone(transaction.status)}>{transaction.status}</Badge>
            <Badge tone="info">
              {formatPaymentMethod(transaction.payment_method)}
            </Badge>
            <span className="text-lg font-semibold text-foreground">
              {formatCurrency(transaction.amount_total)}
            </span>
          </div>

          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Informasi Pembayaran
            </h4>
            <Row label="Provider" value={transaction.provider} />
            <Row label="Kode Pembayaran" value={transaction.payment_code ?? "-"} />
            <Row label="Payment Ref" value={transaction.payment_reff ?? "-"} />
            <Row label="Merchant" value={transaction.merchant?.name ?? "-"} />
            <Row label="Merchant Ref" value={transaction.merchant_reff} />
          </section>

          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rincian Nilai
            </h4>
            <Row label="Jumlah" value={formatCurrency(transaction.amount)} />
            <Row label="Admin Fee" value={formatCurrency(transaction.amount_admin)} />
            <Row
              label="Diskon"
              value={formatCurrency(transaction.amount_discount)}
            />
            <Row
              label="Total"
              value={
                <span className="font-semibold">
                  {formatCurrency(transaction.amount_total)} {transaction.currency}
                </span>
              }
            />
          </section>

          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Customer
            </h4>
            <Row label="Nama" value={transaction.customer_name ?? "-"} />
            <Row label="Telepon" value={transaction.customer_phone ?? "-"} />
            <Row label="Email" value={transaction.customer_email ?? "-"} />
          </section>

          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Waktu
            </h4>
            <Row label="Dibuat" value={formatDateTime(transaction.created_at)} />
            <Row label="Dibayar" value={formatDateTime(transaction.paid_at)} />
            <Row label="Kedaluwarsa" value={formatDateTime(transaction.expired_at)} />
          </section>

          {transaction.webhook_dispatches?.length > 0 ? (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Webhook Dispatches
              </h4>
              <div className="space-y-2">
                {transaction.webhook_dispatches.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-xl border border-border bg-muted/40 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {w.event_type}
                      </span>
                      <Badge tone={statusTone(w.status)}>{w.status}</Badge>
                    </div>
                    <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                      {w.target_url}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Attempt {w.attempts}/{w.max_attempts}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
