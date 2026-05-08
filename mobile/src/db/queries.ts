import db from './index';
import type {
  BalancesResponse,
  TransactionResponse,
  CategoryResponse,
  ConfigResponse,
} from '../types/finance';

const ENVELOPE_PCTS: Record<string, number> = {
  mandatory: 50,
  non_mandatory: 30,
  investments: 10,
  dreams: 10,
};

// ── Balances ──

export function getBalances(): BalancesResponse | null {
  const rows = db.getAllSync<{ name: string; balance: number }>('SELECT name, balance FROM envelopes');
  if (rows.length === 0) return null;
  const result: Record<string, number> = {};
  for (const r of rows) result[r.name] = r.balance;
  return {
    mandatory: result.mandatory ?? 0,
    non_mandatory: result.non_mandatory ?? 0,
    investments: result.investments ?? 0,
    dreams: result.dreams ?? 0,
  };
}

export function upsertBalances(balances: BalancesResponse): void {
  const stmt = db.prepareSync('INSERT OR REPLACE INTO envelopes (name, percentage, balance) VALUES (?, ?, ?)');
  try {
    for (const [name, balance] of Object.entries(balances)) {
      stmt.executeSync(name, ENVELOPE_PCTS[name] ?? 0, balance);
    }
  } finally {
    stmt.finalizeSync();
  }
}

// ── Transactions ──

export function getTransactions(filter?: string): TransactionResponse[] {
  let sql = 'SELECT id, date, type, category, amount_uah, original_amount, original_currency, envelope, details FROM transactions';
  const params: (string | number)[] = [];

  if (filter && filter !== 'all') {
    if (filter === 'current') {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      sql += ` WHERE date LIKE ?`;
      params.push(`${yyyy}-${mm}%`);
    } else if (/^\d{2}$/.test(filter)) {
      const yyyy = new Date().getFullYear();
      sql += ` WHERE date LIKE ?`;
      params.push(`${yyyy}-${filter}%`);
    }
  }

  sql += ' ORDER BY date DESC';
  return db.getAllSync<TransactionResponse>(sql, params);
}

export function upsertTransactions(transactions: TransactionResponse[]): void {
  if (transactions.length === 0) return;
  const stmt = db.prepareSync(
    'INSERT OR REPLACE INTO transactions (id, date, type, category, amount_uah, original_amount, original_currency, envelope, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  try {
    for (const t of transactions) {
      stmt.executeSync(t.id, t.date, t.type, t.category, t.amount_uah, t.original_amount, t.original_currency, t.envelope, t.details);
    }
  } finally {
    stmt.finalizeSync();
  }
}

export function deleteTransaction(id: string): void {
  db.runSync('DELETE FROM transactions WHERE id = ?', id);
}

// ── Categories ──

export function getCategories(): CategoryResponse[] {
  return db.getAllSync<CategoryResponse>('SELECT name, envelope_name FROM categories');
}

export function upsertCategories(categories: CategoryResponse[]): void {
  db.runSync('DELETE FROM categories');
  if (categories.length === 0) return;
  const stmt = db.prepareSync('INSERT INTO categories (name, envelope_name) VALUES (?, ?)');
  try {
    for (const c of categories) {
      stmt.executeSync(c.name, c.envelope_name);
    }
  } finally {
    stmt.finalizeSync();
  }
}

// ── Config ──

export function getConfig(): ConfigResponse {
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM config WHERE key = ?', 'base_currency');
  return { base_currency: row?.value ?? 'UAH' };
}

export function upsertConfig(config: ConfigResponse): void {
  db.runSync('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', 'base_currency', config.base_currency);
}

// ── Cache meta ──

export function getCacheTimestamp(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM cache_meta WHERE key = ?', key);
  return row?.value ?? null;
}

export function setCacheTimestamp(key: string): void {
  db.runSync('INSERT OR REPLACE INTO cache_meta (key, value) VALUES (?, ?)', key, new Date().toISOString());
}

// ── Clear all ──

export function clearAllData(): void {
  db.execSync('DELETE FROM envelopes');
  db.execSync('DELETE FROM transactions');
  db.execSync('DELETE FROM categories');
  db.execSync('DELETE FROM config');
  db.execSync('DELETE FROM cache_meta');
}
