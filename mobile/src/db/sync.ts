import { finance } from '../api/client';
import type { BalancesResponse, TransactionResponse, CategoryResponse, ConfigResponse } from '../types/finance';
import {
  upsertBalances, upsertTransactions, upsertCategories, upsertConfig, setCacheTimestamp,
  getPendingWrites, updatePendingStatus, deletePendingWrite,
} from './queries';

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

let isReplaying = false;

export async function replayPendingWrites(): Promise<void> {
  if (isReplaying) return;
  isReplaying = true;

  try {
    const pending = getPendingWrites();
    if (pending.length === 0) return;

    for (const write of pending) {
      if (write.attempts >= 5) {
        updatePendingStatus(write.id, 'failed', 'Max retries exceeded');
        continue;
      }

      updatePendingStatus(write.id, 'syncing');

      try {
        const payload = JSON.parse(write.payload);

        switch (write.operation) {
          case 'addExpense':
            await finance.addExpense(payload);
            break;
          case 'addIncome':
            await finance.addIncome(payload);
            break;
          case 'removeTransaction':
            await finance.removeTransaction(payload.id);
            break;
        }

        deletePendingWrite(write.id);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        updatePendingStatus(write.id, 'pending', msg);
        break; // Stop on first failure — preserve order
      }
    }

    // After replaying, full sync to reconcile
    await syncAll();
  } finally {
    isReplaying = false;
  }
}
