import db from './index';
import type {
  BalancesResponse,
  TransactionResponse,
  CategoryResponse,
  ConfigResponse,
  PendingWrite,
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

// ── Pending writes ──

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function insertPendingWrite(op: string, payload: object): string {
  const id = `pw_${generateId()}`;
  db.runSync(
    'INSERT INTO pending_writes (id, operation, payload, created_at) VALUES (?, ?, ?, ?)',
    id, op, JSON.stringify(payload), new Date().toISOString(),
  );
  return id;
}

export function getPendingWrites(): PendingWrite[] {
  return db.getAllSync<PendingWrite>(
    "SELECT id, operation, payload, created_at, attempts, last_error, status FROM pending_writes WHERE status = 'pending' ORDER BY created_at ASC",
  );
}

export function updatePendingStatus(id: string, status: string, error?: string): void {
  db.runSync(
    'UPDATE pending_writes SET status = ?, attempts = attempts + 1, last_error = ? WHERE id = ?',
    status, error ?? null, id,
  );
}

export function deletePendingWrite(id: string): void {
  db.runSync('DELETE FROM pending_writes WHERE id = ?', id);
}

export function getPendingCount(): number {
  const row = db.getFirstSync<{ cnt: number }>("SELECT COUNT(*) as cnt FROM pending_writes WHERE status IN ('pending', 'syncing')");
  return row?.cnt ?? 0;
}

export function clearFailedWrites(): void {
  db.runSync("DELETE FROM pending_writes WHERE status = 'failed'");
}

// ── Optimistic local writes ──

export function applyLocalExpense(category: string, amountUah: number, envelope: string): void {
  // Deduct from envelope
  db.runSync('UPDATE envelopes SET balance = balance - ? WHERE name = ?', amountUah, envelope);

  // Insert temp transaction
  const id = `local_${generateId()}`;
  const now = new Date().toISOString();
  db.runSync(
    'INSERT INTO transactions (id, date, type, category, amount_uah, original_amount, original_currency, envelope, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id, now, 'expense', category, amountUah, null, null, envelope, 'pending sync',
  );
}

export function applyLocalIncome(amountUah: number): void {
  // Distribute across envelopes
  for (const [name, pct] of Object.entries(ENVELOPE_PCTS)) {
    const share = (amountUah * pct) / 100;
    db.runSync('UPDATE envelopes SET balance = balance + ? WHERE name = ?', share, name);
  }

  // Insert temp transaction
  const id = `local_${generateId()}`;
  const now = new Date().toISOString();
  db.runSync(
    'INSERT INTO transactions (id, date, type, category, amount_uah, original_amount, original_currency, envelope, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id, now, 'income', 'income', amountUah, null, null, 'mandatory', 'pending sync',
  );
}

// ── Clear all ──

export function clearAllData(): void {
  db.execSync('DELETE FROM envelopes');
  db.execSync('DELETE FROM transactions');
  db.execSync('DELETE FROM categories');
  db.execSync('DELETE FROM config');
  db.execSync('DELETE FROM cache_meta');
  db.execSync('DELETE FROM pending_writes');
}
