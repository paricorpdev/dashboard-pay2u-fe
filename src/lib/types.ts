// TypeScript types mirroring the Go backend payloads (dashboard-pay2u-be).

// ── Generic response envelope ───────────────────────────────────────────────
export interface ApiEnvelope<T> {
  status_code: number;
  status: string;
  response_data: T;
}

export interface ApiErrorEnvelope {
  status_code: number;
  status: string;
  error: unknown;
  request_id?: string;
}

// ── Auth ────────────────────────────────────────────────────────────────────
export interface Role {
  id: string;
  code: string;
  name: string;
  description: string;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
  description: string;
}

export interface PermissionGroup {
  resource: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  full_name: string;
  status: string;
  last_login_at: string | null;
  roles: Role[];
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token_type: string;
  access_token: string;
  expired_at: number;
  refresh_token: string;
  user?: User;
}

// ── Merchants ─────────────────────────────────────────────────────────────
export interface Merchant {
  id: string;
  code: string;
  name: string;
  api_key: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMerchantRequest {
  code: string;
  name: string;
  webhook_url?: string | null;
}

export interface UpdateMerchantRequest {
  name: string;
  webhook_url?: string | null;
  is_active: boolean;
}

export interface RegenerateSecretRequest {
  rotate_api_key: boolean;
  rotate_webhook_secret: boolean;
}

export interface PageMetadata {
  page: number;
  per_page: number;
  total_data: number;
  total_page: number;
}

export interface PagedResponse<T> {
  data: T[];
  paging: PageMetadata;
}

// ── Analytics ─────────────────────────────────────────────────────────────
export interface AnalyticSummary {
  month: number;
  year: number;
  total_volume_amount: number;
  total_transaction_count: number;
  success_count: number;
  pending_count: number;
  expired_count: number;
  success_rate: number;
  total_admin_fee: number;
}

export interface DailyTrendItem {
  date: string;
  day: number;
  total_amount: number;
  total_count: number;
  success_count: number;
  pending_count: number;
  expired_count: number;
}

export interface PaymentMethodDistributionItem {
  payment_method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
  amount: number;
  percentage: number;
}

// ── Transactions ──────────────────────────────────────────────────────────
export interface MerchantSummary {
  id: string;
  code: string;
  name: string;
}

export interface WebhookDispatch {
  id: string;
  target_url: string;
  event_type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  request_id: string;
  provider: string;
  provider_token: string | null;
  merchant_reff: string;
  payment_method: string;
  payment_code: string | null;
  status: string;
  is_paid: boolean;
  amount: number;
  amount_admin: number;
  amount_discount: number;
  amount_total: number;
  currency: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  bill_title: string | null;
  bill_description: string | null;
  payment_reff: string | null;
  expired_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  merchant: MerchantSummary | null;
}

export interface TransactionDetail extends Transaction {
  provider_callback: string | null;
  webhook_dispatches: WebhookDispatch[];
}

export interface TransactionQuery {
  page?: number;
  limit?: number;
  name?: string;
  phone?: string;
  email?: string;
  payment_method?: string;
  status?: string;
  merchant_reff?: string;
  bill_title?: string;
  status_paid?: boolean;
  merchant_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: string;
  sort_dir?: string;
}

// ── Shared filter model ─────────────────────────────────────────────────────
export type PeriodMode = "monthly" | "yearly";
