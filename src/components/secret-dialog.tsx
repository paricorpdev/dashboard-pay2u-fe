"use client";

import { useEffect, useState } from "react";
import { Copy, RefreshCw, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Merchant } from "@/lib/types";
import { Badge, Button } from "@/components/ui";

function CopyField({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-border bg-background/60 px-3 py-2 font-mono text-xs text-foreground">
          {value ?? "-"}
        </code>
        <Button
          type="button"
          variant="secondary"
          onClick={copy}
          disabled={!value}
          title="Salin"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Tersalin" : ""}
        </Button>
      </div>
    </div>
  );
}

/** View merchant credentials + rotate API key / webhook secret. */
export function SecretDialog({
  open,
  merchant,
  onClose,
}: {
  open: boolean;
  merchant: Merchant | null;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState<Merchant | null>(merchant);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(merchant);
    setError(null);
  }, [merchant, open]);

  if (!open || !merchant) return null;

  async function rotate(apiKey: boolean, webhookSecret: boolean) {
    if (!merchant) return;
    if (
      !confirm(
        `Regenerate kredensial? Kredensial lama akan langsung tidak valid.`,
      )
    ) {
      return;
    }
    setRotating(true);
    setError(null);
    try {
      const updated = await api.merchants.regenerateSecret(merchant.id, {
        rotate_api_key: apiKey,
        rotate_webhook_secret: webhookSecret,
      });
      setCurrent(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal regenerate secret.");
    } finally {
      setRotating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Kredensial</h3>
            <p className="text-xs text-muted-foreground">
              {current?.name} · {current?.code}
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

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <Badge tone={current?.is_active ? "success" : "danger"}>
              {current?.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>

          <CopyField label="API Key" value={current?.api_key ?? null} />
          <CopyField label="Webhook Secret" value={current?.webhook_secret ?? null} />

          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              loading={rotating}
              onClick={() => rotate(true, false)}
            >
              <RefreshCw className="h-4 w-4" /> Regenerate API Key
            </Button>
            <Button
              variant="outline"
              loading={rotating}
              onClick={() => rotate(false, true)}
            >
              <RefreshCw className="h-4 w-4" /> Regenerate Webhook Secret
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
