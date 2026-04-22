-- Documents (document-style storage)
-- File bytes live in R2; D1 stores the record JSON in `body` plus indexed/generated columns.
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,

  body TEXT NOT NULL,

  -- Required link: at least one client must be present
  primary_client_id TEXT GENERATED ALWAYS AS (json_extract(body, '$.client_ids[0]')) STORED,

  -- Optional link fields (strings, may be UUID/ULID/etc.)
  case_id TEXT GENERATED ALWAYS AS (json_extract(body, '$.case_id')) STORED,
  requirement_id TEXT GENERATED ALWAYS AS (json_extract(body, '$.requirement_id')) STORED,
  application_id TEXT GENERATED ALWAYS AS (json_extract(body, '$.application_id')) STORED,

  -- Document type
  category TEXT GENERATED ALWAYS AS (json_extract(body, '$.document_type.category')) STORED,
  sub_type TEXT GENERATED ALWAYS AS (json_extract(body, '$.document_type.sub_type')) STORED,

  -- R2 reference and file metadata
  r2_key TEXT GENERATED ALWAYS AS (json_extract(body, '$.r2_key')) STORED,
  file_name TEXT GENERATED ALWAYS AS (json_extract(body, '$.file_name')) STORED,
  mime_type TEXT GENERATED ALWAYS AS (json_extract(body, '$.mime_type')) STORED,
  uploaded_at TEXT GENERATED ALWAYS AS (json_extract(body, '$.uploaded_at')) STORED,

  -- Soft-delete flag lives in body
  is_deleted INTEGER GENERATED ALWAYS AS (json_extract(body, '$.is_deleted')) STORED,

  -- Constraints
  CHECK (primary_client_id IS NOT NULL),
  CHECK (application_id IS NULL OR (case_id IS NOT NULL AND requirement_id IS NOT NULL))
);

-- Important indexes (tenant + common list filters/sorts)
CREATE INDEX IF NOT EXISTS idx_documents_account_deleted ON documents(account_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_documents_account_client ON documents(account_id, primary_client_id);
CREATE INDEX IF NOT EXISTS idx_documents_account_case ON documents(account_id, case_id);
CREATE INDEX IF NOT EXISTS idx_documents_account_requirement ON documents(account_id, requirement_id);
CREATE INDEX IF NOT EXISTS idx_documents_account_application ON documents(account_id, application_id);
CREATE INDEX IF NOT EXISTS idx_documents_account_type ON documents(account_id, category, sub_type);

