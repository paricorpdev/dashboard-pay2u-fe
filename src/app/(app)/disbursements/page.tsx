"use client";

import { useCallback, useEffect, useState } from "react";
import { BanknoteArrowDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { DisbursementDrawer } from "@/components/disbursement-drawer";
import { Badge, Button, Card, EmptyState, Input, Label, LoadingBlock, Select, statusTone } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Disbursement, DisbursementDetail, PagedResponse } from "@/lib/types";
import { useMerchants, useYearOptions } from "@/lib/use-merchants";
import { formatCurrency, formatDateTime, MONTH_NAMES } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function DisbursementsPage() {
  const { merchants } = useMerchants();
  const years = useYearOptions();
  const [rows, setRows] = useState<Disbursement[]>([]);
  const [paging, setPaging] = useState({ page: 1, totalPage: 1, totalData: 0 });
  const [loading, setLoading] = useState(true);
  const [periodReady, setPeriodReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(2000);
  const [currentPeriod, setCurrentPeriod] = useState({ month: 1, year: 2000 });
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<DisbursementDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const current = { month: now.getMonth() + 1, year: now.getFullYear() };
    setMonth(current.month);
    setYear(current.year);
    setCurrentPeriod(current);
    setPeriodReady(true);
  }, []);

  const load = useCallback(async (signal: AbortSignal) => {
    if (!periodReady) return;
    setLoading(true);
    setError(null);
    try {
      const res: PagedResponse<Disbursement> = await api.disbursements.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
        merchant_id: merchantId || undefined,
        month,
        year,
        signal,
      });
      if (signal.aborted) return;
      setRows(res.data);
      setPaging({
        page: res.paging.page,
        totalPage: res.paging.total_page || 1,
        totalData: res.paging.total_data,
      });
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof ApiError ? err.message : "Gagal memuat disbursement.");
      setRows([]);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [periodReady, page, search, status, merchantId, month, year]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, status, merchantId, month, year]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    setSelected(null);
    setDetailError(null);
    setDetailLoading(true);
    void api.disbursements.get(selectedId, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) setSelected(detail);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setDetailError(err instanceof ApiError ? err.message : "Gagal memuat detail disbursement.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [selectedId]);

  function resetFilters() {
    setSearch("");
    setStatus("");
    setMerchantId("");
    setMonth(currentPeriod.month);
    setYear(currentPeriod.year);
  }

  const hasFilters = search || status || merchantId || month !== currentPeriod.month || year !== currentPeriod.year;
  const yearOptions = years.length > 0 ? years : [year];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">Detail Disbursement</h2>
        <p className="text-sm text-muted-foreground">
          Telusuri transfer keluar dan buka satu baris untuk melihat rincian penerima dan statusnya.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <Label>Pencarian (referensi / penerima)</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari ref, nama, rekening, atau bank…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="WAITING_SETTLEMENT">Menunggu Settlement</option>
              <option value="PROCESSING">Diproses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </div>
          <div>
            <Label>Bulan</Label>
            <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((name, index) => (
                <option key={index + 1} value={index + 1}>{name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Tahun</Label>
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {yearOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Merchant</Label>
            <Select value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
              <option value="">Semua Merchant</option>
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>{merchant.name}</option>
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
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
      ) : null}

      <Card>
        {loading && rows.length === 0 ? (
          <LoadingBlock label="Memuat disbursement…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<BanknoteArrowDown className="h-6 w-6" />}
            title="Tidak ada disbursement"
            description="Ubah periode atau filter untuk melihat transfer lainnya."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Request ID</th>
                    <th className="pb-3 pr-4 font-medium">Merchant Ref</th>
                    <th className="pb-3 pr-4 font-medium">Penerima</th>
                    <th className="pb-3 pr-4 font-medium">Merchant</th>
                    <th className="pb-3 pr-4 text-right font-medium">Nilai</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{row.request_id}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-foreground">{row.merchant_ref}</td>
                      <td className="py-3 pr-4 text-foreground">
                        <p>{row.beneficiary_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.beneficiary_bank_name || row.beneficiary_bank_code}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.merchant?.name ?? "-"}</td>
                      <td className="py-3 pr-4 text-right tabular-nums text-foreground">{formatCurrency(row.amount_total)}</td>
                      <td className="py-3 pr-4"><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                      <td className="py-3 text-xs text-muted-foreground">{formatDateTime(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Total {paging.totalData} disbursement · Halaman {paging.page} dari {paging.totalPage}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" disabled={page >= paging.totalPage || loading} onClick={() => setPage((value) => value + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <DisbursementDrawer
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        disbursement={selected}
        loading={detailLoading}
        error={detailError}
      />
    </div>
  );
}
