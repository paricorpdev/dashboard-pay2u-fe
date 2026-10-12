"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Receipt,
  Search,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { PagedResponse, Transaction, TransactionDetail } from "@/lib/types";
import { useMerchants } from "@/lib/use-merchants";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  LoadingBlock,
  Select,
  statusTone,
} from "@/components/ui";
import { TransactionDrawer } from "@/components/transaction-drawer";
import {
  formatCurrency,
  formatDateTime,
  formatPaymentMethod,
} from "@/lib/utils";

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const { merchants } = useMerchants();

  const [rows, setRows] = useState<Transaction[]>([]);
  const [paging, setPaging] = useState({ page: 1, totalPage: 1, totalData: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<TransactionDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: PagedResponse<Transaction> = await api.transactions.list({
        page,
        limit: PAGE_SIZE,
        name: search || undefined,
        status: status || undefined,
        payment_method: paymentMethod || undefined,
        merchant_id: merchantId || undefined,
        sort_by: "created_at",
        sort_dir: "desc",
      });
      setRows(res.data);
      setPaging({
        page: res.paging.page,
        totalPage: res.paging.total_page || 1,
        totalData: res.paging.total_data,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat transaksi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, paymentMethod, merchantId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset to first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [search, status, paymentMethod, merchantId]);

  async function openDetail(id: string) {
    try {
      const detail = await api.transactions.get(id);
      setSelected(detail);
      setDrawerOpen(true);
    } catch {
      /* keep silent; could add toast */
    }
  }

  function resetFilters() {
    setSearch("");
    setStatus("");
    setPaymentMethod("");
    setMerchantId("");
  }

  const hasFilters = search || status || paymentMethod || merchantId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">Daftar Transaksi</h2>
        <p className="text-sm text-muted-foreground">
          Telusuri dan filter seluruh transaksi pembayaran.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <Label>Pencarian (nama customer)</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari nama customer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="EXPIRED">Expired</option>
            </Select>
          </div>
          <div>
            <Label>Metode</Label>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="">Semua Metode</option>
              <option value="QRIS">QRIS</option>
              <option value="VA_BCA">VA BCA</option>
              <option value="VA_BNI">VA BNI</option>
              <option value="VA_BRI">VA BRI</option>
              <option value="VA_MANDIRI">VA Mandiri</option>
              <option value="VA_PERMATA">VA Permata</option>
            </Select>
          </div>
          <div>
            <Label>Merchant</Label>
            <Select
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
            >
              <option value="">Semua Merchant</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {hasFilters ? (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" onClick={resetFilters}>
              <X className="h-4 w-4" /> Reset Filter
            </Button>
          </div>
        ) : null}
      </Card>

      {error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <Card>
        {loading && rows.length === 0 ? (
          <LoadingBlock label="Memuat transaksi…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-6 w-6" />}
            title="Tidak ada transaksi"
            description="Ubah filter atau kata pencarian untuk melihat transaksi lain."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Request ID</th>
                    <th className="pb-3 pr-4 font-medium">Customer</th>
                    <th className="pb-3 pr-4 font-medium">Metode</th>
                    <th className="pb-3 pr-4 font-medium">Merchant</th>
                    <th className="pb-3 pr-4 text-right font-medium">Nilai</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => void openDetail(t.id)}
                      className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                        {t.request_id}
                      </td>
                      <td className="py-3 pr-4 text-foreground">
                        {t.customer_name ?? "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone="info">
                          {formatPaymentMethod(t.payment_method)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {t.merchant?.name ?? "-"}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-foreground">
                        {formatCurrency(t.amount_total)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {formatDateTime(t.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Total {paging.totalData} transaksi · Halaman {paging.page} dari{" "}
                {paging.totalPage}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= paging.totalPage || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <TransactionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        transaction={selected}
      />
    </div>
  );
}
