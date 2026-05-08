import { finance } from '../api/client';
import type { BalancesResponse, TransactionResponse, CategoryResponse, ConfigResponse } from '../types/finance';
import { upsertBalances, upsertTransactions, upsertCategories, upsertConfig, setCacheTimestamp } from './queries';

export async function syncBalances(): Promise<BalancesResponse> {
  const balances = await finance.getBalances();
  upsertBalances(balances);
  setCacheTimestamp('balances');
  return balances;
}

export async function syncHistory(filter?: string): Promise<TransactionResponse[]> {
  const transactions = await finance.getHistory(filter);
  upsertTransactions(transactions);
  setCacheTimestamp('history');
  return transactions;
}

export async function syncCategories(): Promise<CategoryResponse[]> {
  const categories = await finance.getCategories();
  upsertCategories(categories);
  setCacheTimestamp('categories');
  return categories;
}

export async function syncConfig(): Promise<ConfigResponse> {
  const config = await finance.getConfig();
  upsertConfig(config);
  setCacheTimestamp('config');
  return config;
}

export async function syncAll(): Promise<void> {
  await Promise.all([
    syncBalances(),
    syncHistory('all'),
    syncCategories(),
    syncConfig(),
  ]);
}
