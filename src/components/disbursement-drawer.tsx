"use client";

import { X } from "lucide-react";
import type { DisbursementDetail } from "@/lib/types";
import { Badge, LoadingBlock, statusTone } from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/utils";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[65%] break-all text-right text-sm text-foreground">{value}</span>
    </div>
  );
}

export function DisbursementDrawer({
  open,
  onClose,
  disbursement,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  disbursement: DisbursementDetail | null;
  loading: boolean;
  error: string | null;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Detail Disbursement</h3>
            <p className="font-mono text-xs text-muted-foreground">
              {disbursement?.request_id ?? "Memuat detail transfer…"}
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

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? <LoadingBlock label="Memuat detail disbursement…" /> : null}
          {!loading && error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}
          {!loading && !error && disbursement ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={statusTone(disbursement.status)}>{disbursement.status}</Badge>
                <span className="text-lg font-semibold text-foreground">
                  {formatCurrency(disbursement.amount_total)}
                </span>
              </div>

              <section>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Informasi Transfer
                </h4>
                <Row label="Merchant" value={disbursement.merchant?.name ?? "-"} />
                <Row label="Merchant Ref" value={disbursement.merchant_ref} />
                <Row label="Provider" value={disbursement.provider} />
                <Row label="Channel" value={disbursement.channel_code} />
                <Row label="Provider Ref" value={disbursement.provider_disbursement_ref ?? "-"} />
                <Row label="Transaksi sumber" value={disbursement.transaction_id} />
              </section>

              <section>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Penerima
                </h4>
                <Row label="Nama" value={disbursement.beneficiary_name} />
                <Row
                  label="Bank tujuan"
                  value={`${disbursement.beneficiary_bank_name || disbursement.beneficiary_bank_code} (${disbursement.beneficiary_bank_code})`}
                />
                <Row label="Nomor rekening" value={disbursement.beneficiary_account_number} />
                <Row label="Catatan" value={disbursement.note || "-"} />
              </section>

              <section>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rincian Nilai
                </h4>
                <Row label="Jumlah transfer" value={formatCurrency(disbursement.amount)} />
                <Row label="Biaya admin" value={formatCurrency(disbursement.amount_admin)} />
                <Row label="Diskon" value={formatCurrency(disbursement.amount_discount)} />
                <Row
                  label="Total"
                  value={<span className="font-semibold">{formatCurrency(disbursement.amount_total)} {disbursement.currency}</span>}
                />
              </section>

              <section>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Waktu dan Proses
                </h4>
                <Row label="Dibuat" value={formatDateTime(disbursement.created_at)} />
                <Row label="Eligible" value={formatDateTime(disbursement.eligible_at)} />
                <Row label="Inquiry" value={formatDateTime(disbursement.inquiry_at)} />
                <Row label="Ditransfer" value={formatDateTime(disbursement.transferred_at)} />
                <Row label="Selesai" value={formatDateTime(disbursement.paid_at)} />
                <Row label="Percobaan transfer" value={`${disbursement.attempts}/${disbursement.max_attempts}`} />
              </section>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
