import type {
  ApiEnvelope,
  AnalyticSummary,
  CreateMerchantRequest,
  DailyTrendItem,
  LoginResponse,
  Merchant,
  PagedResponse,
  PaymentMethodDistributionItem,
  Permission,
  PermissionGroup,
  RegenerateSecretRequest,
  Role,
  StatusDistributionItem,
  Transaction,
  TransactionDetail,
  TransactionQuery,
  UpdateMerchantRequest,
  User,
} from "./types";

const BASE = "/api/v1";

// ── Token storage (client-side only) ─────────────────────────────────────────
const ACCESS_KEY = "pay2u_access_token";
const REFRESH_KEY = "pay2u_refresh_token";

export const tokenStore = {
  get access(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCESS_KEY, access);
    window.localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined> | object;
  auth?: boolean;
  signal?: AbortSignal;
}

/** Build a query string, dropping undefined/null/empty values. */
function buildQuery(query?: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function rawRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const { method = "GET", body, query, auth = true, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && tokenStore.access) {
    headers.Authorization = `Bearer ${tokenStore.access}`;
  }

  const res = await fetch(`${BASE}${path}${buildQuery(query)}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }
  }

  if (!res.ok) {
    const err = (json ?? {}) as { error?: unknown; message?: string };
    const message =
      (typeof err.error === "string" ? err.error : undefined) ??
      err.message ??
      `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, json);
  }

  if (json === null) {
    return { status_code: res.status, status: "success", response_data: null as T };
  }
  return json as ApiEnvelope<T>;
}

/** Authenticated request that unwraps `response_data` and retries once on 401. */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    const env = await rawRequest<T>(path, options);
    return env.response_data;
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      tokenStore.refresh &&
      !path.startsWith("/auth/refresh")
    ) {
      try {
        await api.auth.refresh(tokenStore.refresh);
        const env = await rawRequest<T>(path, options);
        return env.response_data;
      } catch {
        tokenStore.clear();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("pay2u:unauthorized"));
        }
      }
    }
    throw err;
  }
}


export const api = {
  auth: {
    async login(username: string, password: string): Promise<LoginResponse> {
      const env = await rawRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: { username, password },
        auth: false,
      });
      return env.response_data;
    },
    async refresh(refreshToken: string): Promise<LoginResponse> {
      const env = await rawRequest<LoginResponse>("/auth/refresh", {
        method: "POST",
        body: { refresh_token: refreshToken },
        auth: false,
      });
      tokenStore.set(env.response_data.access_token, env.response_data.refresh_token);
      return env.response_data;
    },
    async logout(): Promise<void> {
      await request("/auth/logout", { method: "POST" });
    },
    async current(): Promise<User> {
      return request<User>("/users/current");
    },
  },

  merchants: {
    async options(): Promise<{ id: string; name: string }[]> {
      return request<{ id: string; name: string }[]>("/merchants/options");
    },
    async list(params: {
      page?: number;
      limit?: number;
      search?: string;
      is_active?: boolean;
      sort_by?: string;
      sort_dir?: string;
    }): Promise<PagedResponse<Merchant>> {
      return request<PagedResponse<Merchant>>("/merchants", { query: params });
    },
    async get(id: string): Promise<Merchant> {
      return request<Merchant>(`/merchants/${id}`);
    },
    async create(body: CreateMerchantRequest): Promise<Merchant> {
      return request<Merchant>("/merchants", { method: "POST", body });
    },
    async update(id: string, body: UpdateMerchantRequest): Promise<Merchant> {
      return request<Merchant>(`/merchants/${id}`, { method: "PUT", body });
    },
    async remove(id: string): Promise<unknown> {
      return request(`/merchants/${id}`, { method: "DELETE" });
    },
    async regenerateSecret(
      id: string,
      body: RegenerateSecretRequest,
    ): Promise<Merchant> {
      return request<Merchant>(`/merchants/${id}/regenerate-secret`, {
        method: "PATCH",
        body,
      });
    },
  },

  rbac: {
    async roles(): Promise<Role[]> {
      return request<Role[]>("/roles");
    },
    async role(id: string): Promise<Role> {
      return request<Role>(`/roles/${id}`);
    },
    async permissions(grouped = true): Promise<PermissionGroup[] | Permission[]> {
      return request<PermissionGroup[] | Permission[]>("/permissions", {
        query: { grouped },
      });
    },
  },

  analytics: {
    async summary(params: {
      month: number;
      year: number;
      merchant_id?: string;
      signal?: AbortSignal;
    }): Promise<AnalyticSummary> {
      return request<AnalyticSummary>("/analytics/summary", {
        query: {
          month: params.month,
          year: params.year,
          merchant_id: params.merchant_id,
        },
        signal: params.signal,
      });
    },
    async trend(params: {
      month: number;
      year: number;
      merchant_id?: string;
      signal?: AbortSignal;
    }): Promise<DailyTrendItem[]> {
      return request<DailyTrendItem[]>("/analytics/trend", {
        query: {
          month: params.month,
          year: params.year,
          merchant_id: params.merchant_id,
        },
        signal: params.signal,
      });
    },
    async paymentMethods(params: {
      month: number;
      year: number;
      merchant_id?: string;
      signal?: AbortSignal;
    }): Promise<PaymentMethodDistributionItem[]> {
      return request<PaymentMethodDistributionItem[]>("/analytics/payment-methods", {
        query: {
          month: params.month,
          year: params.year,
          merchant_id: params.merchant_id,
        },
        signal: params.signal,
      });
    },
    async statusDistribution(params: {
      month: number;
      year: number;
      merchant_id?: string;
      signal?: AbortSignal;
    }): Promise<StatusDistributionItem[]> {
      return request<StatusDistributionItem[]>("/analytics/status-distribution", {
        query: {
          month: params.month,
          year: params.year,
          merchant_id: params.merchant_id,
        },
        signal: params.signal,
      });
    },
  },

  transactions: {
    async list(params: TransactionQuery): Promise<PagedResponse<Transaction>> {
      return request<PagedResponse<Transaction>>("/transactions", { query: params });
    },
    async get(id: string): Promise<TransactionDetail> {
      return request<TransactionDetail>(`/transactions/${id}`);
    },
  },
};

export type Api = typeof api;
