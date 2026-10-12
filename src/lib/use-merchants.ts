"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Merchant } from "@/lib/types";

/** Load the merchant list (used by filters + the merchants page). */
export function useMerchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await api.merchants.list({ limit: 100 });
        if (!controller.signal.aborted) setMerchants(res.data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Gagal memuat merchant");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  return { merchants, loading, error };
}

/** Available year options for the period filter (current year back 5 years). */
export function useYearOptions(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => current - i);
}
