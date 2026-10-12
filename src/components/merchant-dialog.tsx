"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Merchant } from "@/lib/types";
import { Button, Input, Label } from "@/components/ui";

/** Create / edit merchant modal. */
export function MerchantDialog({
  open,
  merchant,
  onClose,
  onSaved,
}: {
  open: boolean;
  merchant: Merchant | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(merchant);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setCode(merchant?.code ?? "");
      setName(merchant?.name ?? "");
      setWebhookUrl(merchant?.webhook_url ?? "");
      setIsActive(merchant?.is_active ?? true);
    }
  }, [open, merchant]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit && merchant) {
        await api.merchants.update(merchant.id, {
          name: name.trim(),
          webhook_url: webhookUrl.trim() || null,
          is_active: isActive,
        });
      } else {
        await api.merchants.create({
          code: code.trim(),
          name: name.trim(),
          webhook_url: webhookUrl.trim() || null,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan merchant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            {isEdit ? "Edit Merchant" : "Tambah Merchant"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="code">Kode</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isEdit}
              placeholder="MERCHANT01"
              required
              minLength={3}
              maxLength={50}
            />
          </div>
          <div>
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Merchant"
              required
              minLength={3}
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="webhook">Webhook URL (opsional)</Label>
            <Input
              id="webhook"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://example.com/webhook"
            />
          </div>

          {isEdit ? (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Merchant aktif
            </label>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Simpan Perubahan" : "Buat Merchant"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
