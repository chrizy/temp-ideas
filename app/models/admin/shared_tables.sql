-- Shared platform D1 — all tables for app/models/admin/*.ts
-- Relational DDL (not JSON body pattern). Create order respects foreign keys.
--
--   customers  →  accounts (customer_id)
--   providers  (marketplace, no FK to accounts)

-- ---------------------------------------------------------------------------
-- customers (CustomerSchema)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  billing_status TEXT NOT NULL DEFAULT 'active'
    CHECK (billing_status IN (
      'active',
      'active_trial',
      'active_free',
      'suspended',
      'closed'
    )),
  seats_count INTEGER NOT NULL DEFAULT 0 CHECK (seats_count >= 0),
  billing_email TEXT NOT NULL,
  tax_reference TEXT,
  billing_address TEXT,
  external_billing_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_billing_email ON customers(billing_email);
CREATE INDEX IF NOT EXISTS idx_customers_billing_status ON customers(billing_status);

-- ---------------------------------------------------------------------------
-- accounts (AccountSchema) — tenant registry; one row per Worker + D1 stack
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisioning'
    CHECK (status IN (
      'provisioning',
      'active',
      'suspended',
      'migration_failed',
      'provisioning_failed'
    )),
  account_kind TEXT,
  stack_label TEXT,
  db_shard_id TEXT,
  d1_database_id TEXT,
  config_worker_name TEXT,
  app_worker_name TEXT,
  hostname TEXT,
  docs_size_mb REAL NOT NULL DEFAULT 0 CHECK (docs_size_mb >= 0),
  db_size_mb REAL NOT NULL DEFAULT 0 CHECK (db_size_mb >= 0),
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_slug ON accounts(slug);
CREATE INDEX IF NOT EXISTS idx_accounts_customer_id ON accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_hostname ON accounts(hostname);

-- ---------------------------------------------------------------------------
-- providers (ProviderSchema) — marketplace lenders / insurers
-- business_types: JSON array of { "type": "<business_type_key>", "active": true|false }
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_types TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);

-- ---------------------------------------------------------------------------
-- schema_migrations (Shared D1 DDL versioning — ADR 0001)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (1, '0001_shared_platform');
