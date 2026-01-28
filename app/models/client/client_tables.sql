-- Clients (document-style storage)
-- Rules:
-- - Store full record JSON in `body`
-- - Keep only query/sort/index fields as generated columns
-- - Keep tenant isolation via `account_id`
-- - Tracking fields (e.g. `updated_at`, `version`) live inside the JSON `body`
CREATE TABLE clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,

  body TEXT NOT NULL,

  -- Commonly queried fields (generated from JSON)
  client_type TEXT GENERATED ALWAYS AS (json_extract(body, '$.client_type')) STORED,
  first_name TEXT GENERATED ALWAYS AS (json_extract(body, '$.first_name')) STORED,
  last_name TEXT GENERATED ALWAYS AS (json_extract(body, '$.last_name')) STORED,
  business_name TEXT GENERATED ALWAYS AS (json_extract(body, '$.business_name')) STORED,
  primary_advisor_id TEXT GENERATED ALWAYS AS (json_extract(body, '$.primary_advisor_id')) STORED,
  group_id TEXT GENERATED ALWAYS AS (json_extract(body, '$.group_id')) STORED,
  is_deleted INTEGER GENERATED ALWAYS AS (json_extract(body, '$.is_deleted')) STORED
);

-- Important indexes (tenant + common list filters/sorts)
CREATE INDEX idx_clients_account_deleted ON clients(account_id, is_deleted);
CREATE INDEX idx_clients_account_type ON clients(account_id, client_type);
CREATE INDEX idx_clients_account_individual_name ON clients(account_id, last_name, first_name);
CREATE INDEX idx_clients_account_company_name ON clients(account_id, business_name);
CREATE INDEX idx_clients_account_group ON clients(account_id, group_id);
CREATE INDEX idx_clients_account_advisor ON clients(account_id, primary_advisor_id);


-- Client Dependants (document-style storage)
-- A dependant can be linked to multiple parent clients.
CREATE TABLE client_dependants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,

  body TEXT NOT NULL,

  -- Commonly queried fields (generated from JSON)
  is_deleted INTEGER GENERATED ALWAYS AS (json_extract(body, '$.is_deleted')) STORED
);

CREATE INDEX idx_client_dependants_account ON client_dependants(account_id);
CREATE INDEX idx_client_dependants_account_deleted ON client_dependants(account_id, is_deleted);
CREATE INDEX idx_client_dependants_account_name ON client_dependants(account_id, last_name, first_name);

-- Join table: dependant ↔ client (many-to-many)
CREATE TABLE client_dependant_clients (
  account_id INTEGER NOT NULL,
  dependant_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, dependant_id, client_id),
  FOREIGN KEY (dependant_id) REFERENCES client_dependants(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX idx_dependant_clients_account_client ON client_dependant_clients(account_id, client_id);
CREATE INDEX idx_dependant_clients_account_dependant ON client_dependant_clients(account_id, dependant_id);

