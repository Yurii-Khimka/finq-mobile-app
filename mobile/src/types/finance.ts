// Request types

export interface IncomeRequest {
  amount: number;
  currency?: string;
  original_amount?: number | null;
}

export interface ExpenseRequest {
  category: string;
  amount: number;
  currency?: string;
}

export interface SyncRequest {
  target_total: number;
}

export interface ImpactRequest {
  amount: number;
  category?: string | null;
}

export interface CategoryRequest {
  name: string;
  envelope_name: string;
}

export interface ConfigRequest {
  base_currency: string;
}

// Response types

export interface BalancesResponse {
  mandatory: number;
  non_mandatory: number;
  investments: number;
  dreams: number;
}

export interface ExpenseResponse {
  balances: BalancesResponse;
  breach_note: string | null;
}

export interface FlushResponse {
  flushed_total: number;
  balances: BalancesResponse;
}

export interface RateResponse {
  currency: string;
  rate: number;
}

export interface TransactionResponse {
  id: string;
  date: string;
  type: string;
  category: string;
  amount_uah: number;
  original_amount: number | null;
  original_currency: string | null;
  envelope: string;
  details: string;
}

export interface StatsEnvelope {
  total: number;
  categories: Record<string, number>;
}

export interface StatsResponse {
  mandatory: StatsEnvelope;
  non_mandatory: StatsEnvelope;
  investments: StatsEnvelope;
  dreams: StatsEnvelope;
}

export interface AuditResponse {
  breach_count: number;
  breach_total_uah: number;
  breach_by_envelope: Record<string, number>;
  top_breaches: Record<string, unknown>[];
  total_spent_uah: number;
  burn_rate_daily: number;
  days_remaining: number;
  days_to_zero: number | null;
  safe_daily_limit: number;
  spendable_balance: number;
  health_signal: string;
}

export interface SustainabilityResponse {
  mandatory_burn: number;
  non_mandatory_burn: number;
  combined_burn: number;
  days_to_zero_mandatory: number | null;
  days_to_zero_non_mandatory: number | null;
  days_to_zero_combined: number | null;
  safe_daily_mandatory: number;
  safe_daily_non_mandatory: number;
  safe_daily_combined: number;
  days_remaining: number;
  mandatory_spent: number;
  non_mandatory_spent: number;
}

export interface AnomalyItem {
  category: string;
  last_7d: number;
  avg_7d: number;
  ratio: number;
}

export interface AdvisorResponse {
  text: string;
}

export interface ImpactResponse {
  amount: number;
  category: string | null;
  spendable_before: number;
  spendable_after: number;
  daily_limit_before: number;
  daily_limit_after: number;
  days_remaining: number;
  waterfall_triggered: boolean;
  risk_score: string;
  category_valid: boolean;
}

export interface CategoryResponse {
  name: string;
  envelope_name: string;
}

export interface ConfigResponse {
  base_currency: string;
}

// Pending writes (offline queue)

export interface PendingWrite {
  id: string;
  operation: 'addExpense' | 'addIncome' | 'removeTransaction';
  payload: string;
  created_at: string;
  attempts: number;
  last_error: string | null;
  status: 'pending' | 'syncing' | 'failed';
}

// Auth types

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
