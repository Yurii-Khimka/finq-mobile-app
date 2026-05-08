import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('finq.db');

export function initDB(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS envelopes (
      name TEXT PRIMARY KEY,
      percentage REAL NOT NULL,
      balance REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_uah REAL NOT NULL,
      original_amount REAL,
      original_currency TEXT,
      envelope TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT 'OK'
    );

    CREATE TABLE IF NOT EXISTS categories (
      name TEXT PRIMARY KEY,
      envelope_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cache_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_writes (
      id TEXT PRIMARY KEY,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
    );
  `);
}

export default db;
