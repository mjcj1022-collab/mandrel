import { DatabaseSync } from 'node:sqlite'

// Embedded SQLite — no external database to provision. The file lives beside
// the server. For production scale, swap to Postgres (schema.sql mirrors this).
export const db = new DatabaseSync(process.env.DB_FILE ?? 'blueflame.db')

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS tenants (
    id text PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    markup real NOT NULL DEFAULT 1.35,
    created_at text NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL DEFAULT 'associate',
    created_at text NOT NULL DEFAULT (datetime('now')),
    UNIQUE (tenant_id, email)
  );

  CREATE TABLE IF NOT EXISTS designs (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    owner_id text,
    name text NOT NULL,
    spec text NOT NULL,
    parent_id text,
    created_at text NOT NULL DEFAULT (datetime('now')),
    updated_at text NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    design_id text NOT NULL,
    version integer NOT NULL DEFAULT 1,
    total_cents integer NOT NULL,
    breakdown text NOT NULL,
    expires_at text,
    created_at text NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id text PRIMARY KEY,
    tenant_id text NOT NULL,
    design_id text NOT NULL,
    quote_id text,
    stage text NOT NULL DEFAULT 'designed',
    approved_at text,
    stripe_payment_intent text,
    deposit_cents integer,
    balance_cents integer,
    created_at text NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id integer PRIMARY KEY AUTOINCREMENT,
    tenant_id text NOT NULL,
    actor_id text,
    action text NOT NULL,
    target text,
    detail text,
    created_at text NOT NULL DEFAULT (datetime('now'))
  );
`)

export const uid = (): string => globalThis.crypto.randomUUID()

export function audit(tenantId: string, actorId: string | null, action: string, target?: string, detail?: unknown): void {
  db.prepare('INSERT INTO audit_log (tenant_id, actor_id, action, target, detail) VALUES (?,?,?,?,?)')
    .run(tenantId, actorId, action, target ?? null, detail ? JSON.stringify(detail) : null)
}
