import { getToken, getRefreshToken, saveTokens } from '../store/auth';
import type {
  AuthTokens,
  BalancesResponse,
  ExpenseRequest,
  ExpenseResponse,
  FlushResponse,
  IncomeRequest,
  SyncRequest,
  RateResponse,
  TransactionResponse,
  StatsResponse,
  AuditResponse,
  SustainabilityResponse,
  AnomalyItem,
  AdvisorResponse,
  ImpactRequest,
  ImpactResponse,
  CategoryRequest,
  CategoryResponse,
  ConfigRequest,
  ConfigResponse,
} from '../types/finance';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

async function tryRefreshToken(): Promise<boolean> {
  const refresh = await getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as AuthTokens;
    await saveTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = await getToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      }
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// Auth
export const auth = {
  register: (email: string, password: string) =>
    request<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    request<{ status: string }>('/auth/logout', { method: 'POST' }),
};

// Finance
export const finance = {
  getRate: (currency: string) =>
    request<RateResponse>(`/finance/rate?currency=${currency}`),

  getBalances: () =>
    request<BalancesResponse>('/finance/balances'),

  addIncome: (data: IncomeRequest) =>
    request<BalancesResponse>('/finance/income', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addExpense: (data: ExpenseRequest) =>
    request<ExpenseResponse>('/finance/expense', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  flush: () =>
    request<FlushResponse>('/finance/flush', { method: 'POST' }),

  sync: (data: SyncRequest) =>
    request<BalancesResponse>('/finance/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getHistory: (filter = 'all', limit?: number) => {
    const params = new URLSearchParams({ filter });
    if (limit !== undefined) params.set('limit', String(limit));
    return request<TransactionResponse[]>(`/finance/history?${params}`);
  },

  getStats: (filter = 'current') =>
    request<StatsResponse>(`/finance/stats?filter=${filter}`),

  getAudit: () =>
    request<AuditResponse>('/finance/audit'),

  getSustainability: () =>
    request<SustainabilityResponse>('/finance/sustainability'),

  getAnomalies: () =>
    request<AnomalyItem[]>('/finance/anomalies'),

  getAdvisor: () =>
    request<AdvisorResponse>('/finance/advisor'),

  calculateImpact: (data: ImpactRequest) =>
    request<ImpactResponse>('/finance/impact', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeTransaction: (id: string) =>
    request<BalancesResponse>(`/finance/transactions/${id}`, {
      method: 'DELETE',
    }),

  getCategories: () =>
    request<CategoryResponse[]>('/finance/categories'),

  createCategory: (data: CategoryRequest) =>
    request<CategoryResponse>('/finance/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteCategory: (name: string) =>
    request<void>(`/finance/categories/${name}`, { method: 'DELETE' }),

  getConfig: () =>
    request<ConfigResponse>('/finance/config'),

  updateConfig: (data: ConfigRequest) =>
    request<ConfigResponse>('/finance/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
