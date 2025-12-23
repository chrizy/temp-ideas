# Architecture Summary

Each tenant receives:

- 1 Cloudflare Worker
- 1 D1 database (primary store)
- 1 KV namespace (safe read cache)
- (Optional) 1 Durable Object (in-memory hot cache)

This design supports:

- Up to 4000 concurrent UK-only users per tenant
- Document-style JSON storage
- Indexed fields via SQL computed columns
- Strong consistency using D1 session bookmarks
- Fast reads via replicas and KV-safe caching
- Low operational cost
- High isolation between tenants

## 2. Storage Model

### 2.1 Primary Store — D1 (SQLite)

- Every tenant gets a dedicated D1 instance.
- D1 is used as the authoritative, persistent data store.

### 2.2 Table-Per-Collection Structure

Each collection in the tenant’s document store maps to a dedicated SQL table. Example:

```
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,  -- JSON document

  -- Indexed fields as computed columns
  first_name TEXT GENERATED ALWAYS AS (json_extract(body, '$.name.first')) STORED,
  last_name  TEXT GENERATED ALWAYS AS (json_extract(body, '$.name.last')) STORED,
  postcode   TEXT GENERATED ALWAYS AS (json_extract(body, '$.address.postcode')) STORED,

  updated_at INTEGER NOT NULL,
  _version   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_clients_last_name ON clients(last_name);
CREATE INDEX idx_clients_postcode  ON clients(postcode);
```

Benefits:

- True document-style storage (JSON body)
- Automatic indexing using computed columns
- Very fast lookups and structured queries
- Ideal for consistent, schema-lite applications

## 3. Document Handling

### 3.1 Document Format

Documents are stored as JSON in the `body` column.

### 3.2 Indexed Fields

Indexed fields use SQLite generated columns:

- Always derived from JSON
- Automatically updated on insert/update
- Fully indexable
- Zero application logic required for extraction

### 3.3 Versioning

A `_version` counter increments on every write to support:

- Consistency checking
- Cache invalidation
- Optimistic UI flows

## 4. Consistency Model

Strong consistency is achieved using D1 Session Bookmarks.

**Write**  
Every write returns a bookmark header: `x-d1-bookmark: <opaque-token>`

**Subsequent reads**

- Reader includes the bookmark.
- D1 routes the query to a replica containing the write.
- Guarantees read-my-writes even across regions.

This is essential for financial and compliance workloads.

## 5. Caching Layer (Optional)

Each tenant receives a dedicated KV namespace for read caching.

KV-safe cache wrapper:

- KV is used only when consistent.
- KV is automatically invalidated on writes.
- Bookmarks override KV to avoid stale reads.
- Reads fall back to D1 if KV cannot guarantee freshness.

This improves performance without risking financial correctness.

## 6. Optional Durable Object Hot Cache

Durable Objects are not required but can be added later to provide:

- 0.3–1 ms hot in-memory reads
- Locking/coordination for complex multi-step writes
- Per-tenant in-memory session state
- Rate limiting or shared counters

DOs only store in-memory state—persistent data stays in D1.

## 7. Performance and Scaling

**Concurrency**

- Up to 4000 concurrent users per tenant
- Worker auto-scales without per-tenant contention
- D1 replica reads scale horizontally
- Per-tenant isolation ensures predictable performance

**Latency (UK-only usage)**

- Compute (Worker): 1–3 ms
- D1 read (replica): 1–4 ms
- D1 write: 5–10 ms
- KV safe read: 0.2–2 ms
- DO hot read (optional): 0.3–1 ms

**Storage**

- Designed for ~5GB per tenant over 10 years
- Ideal for document-centric client management workloads

## 8. Data Residency

- All compute runs in UK PoPs (LHR, MAN, EDI)
- D1 replication is limited to Cloudflare’s EU region group
- Fully GDPR compliant
- Data never leaves Europe

## 9. Querying a Collection

**Fetch by indexed field**

```
SELECT body FROM clients WHERE last_name = 'Smith';
```

**Prefix search**

```
SELECT body FROM clients WHERE postcode LIKE 'SW1%';
```

**Cross-collection join**

```
SELECT c.body, f.body
FROM clients c
JOIN finances f ON c.id = f.client_id
WHERE c.last_name = 'Smith';
```

This provides Mongo-like document flexibility with SQL query power.

## 10. Tenancy Model

Each tenant maps as follows:

```
Tenant → Worker → D1 Database → KV Namespace → (Optional DO)
```

Benefits:

- No noisy neighbors
- Independent schema evolution per tenant
- Guaranteed performance isolation
- Easy scaling with more tenants

## 11. High-Level Architecture Diagram

```
           UK Users (4000 concurrent)
                    │
            Tenant Custom Domain
                    │
            ┌───────────────────┐
            │ Tenant Worker     │
            └───────────────────┘
                 │        │
                 │        └── (optional) Durable Object
                 │
          KV Namespace (safe read cache)
                 │
            D1 Database (per tenant)
          ┌──────────────┬───────────────┬───────────────┐
          │ clients tbl   │ orders tbl    │ notes tbl      │ ...
          │ (computed cols│ (computed cols│ (computed cols │
          │  + indexes)   │   + indexes)  │   + indexes)   │
          └──────────────┴───────────────┴───────────────┘
```

## 12. Summary

This architecture provides:

- Mongo-style document storage
- SQL performance + indexing
- Tenant-level isolation
- Strong correctness (D1 bookmarks)
- Low latency for UK users
- Scalability to thousands of tenants
- Safe optional caching
- Future-proof extension via DOs

It is optimized for financial, compliance-heavy, and highly concurrent SaaS workloads.