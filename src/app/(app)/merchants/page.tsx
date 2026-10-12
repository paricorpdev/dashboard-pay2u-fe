"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Store,
  Trash2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Merchant, PagedResponse } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  LoadingBlock,
  Select,
} from "@/components/ui";
import { MerchantDialog } from "@/components/merchant-dialog";
import { SecretDialog } from "@/components/secret-dialog";
import { formatDate } from "@/lib/utils";

export default function MerchantsPage() {
  const [rows, setRows] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Merchant | null>(null);
  const [secretOpen, setSecretOpen] = useState(false);
  const [secretMerchant, setSecretMerchant] = useState<Merchant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: PagedResponse<Merchant> = await api.merchants.list({
        limit: 100,
        search: search || undefined,
        is_active:
          statusFilter === "" ? undefined : statusFilter === "active",
      });
      setRows(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat merchant.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(m: Merchant) {
    if (!confirm(`Hapus merchant "${m.name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      await api.merchants.remove(m.id);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal menghapus merchant.");
    }
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(m: Merchant) {
    setEditing(m);
    setDialogOpen(true);
  }

  function openSecret(m: Merchant) {
    setSecretMerchant(m);
    setSecretOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">Manajemen Merchant</h2>
        <p className="text-sm text-muted-foreground">
          Kelola merchant, kredensial API, dan status aktif.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-1 flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Label>Pencarian</Label>
              <Input
                placeholder="Cari nama atau kode merchant…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </Select>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Tambah Merchant
          </Button>
        </div>
      </Card>

      {error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <Card>
        {loading && rows.length === 0 ? (
          <LoadingBlock label="Memuat merchant…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Store className="h-6 w-6" />}
            title="Belum ada merchant"
            description="Tambahkan merchant pertama untuk mulai memantau transaksinya."
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> Tambah Merchant
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Kode</th>
                  <th className="pb-3 pr-4 font-medium">Nama</th>
                  <th className="pb-3 pr-4 font-medium">Webhook</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Dibuat</th>
                  <th className="pb-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      {m.code}
                    </td>
                    <td className="py-3 pr-4 font-medium text-foreground">{m.name}</td>
                    <td className="max-w-[180px] truncate py-3 pr-4 text-xs text-muted-foreground">
                      {m.webhook_url ?? "-"}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone={m.is_active ? "success" : "danger"}>
                        {m.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {formatDate(m.created_at)}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          title="Regenerate Secret"
                          onClick={() => openSecret(m)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          title="Lihat Kredensial"
                          onClick={() => openSecret(m)}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          title="Edit"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          title="Hapus"
                          onClick={() => void handleDelete(m)}
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <MerchantDialog
        open={dialogOpen}
        merchant={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => void load()}
      />
      <SecretDialog
        open={secretOpen}
        merchant={secretMerchant}
        onClose={() => setSecretOpen(false)}
      />
    </div>
  );
}

