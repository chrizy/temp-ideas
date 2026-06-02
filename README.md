# Architecture Summary

Multi-tenant SaaS on Cloudflare with **two database tiers**:

1. **Shared platform** — single Worker + single D1 used by all tenants. Holds global registry data only.
2. **Per-account (customer) stack** — when an account is created, the platform **deploys a dedicated D1 database and a dedicated Worker** bound to that D1. All firm-specific data (admin, clients, cases, documents, contacts) lives only in that account’s D1.

This gives **maximum isolation**: no other tenant shares the same database or compute binding.

## Key requirements

- **Up to 4000 concurrent UK-only users per account**
- **~5 GB per account over 10 years** (document-centric client management)
- **Strong isolation** — one D1 + one Worker per account; no cross-tenant rows in customer data
- **UK data residency** — compute in UK PoPs; D1 replication limited to EU region group; GDPR compliant; data does not leave Europe

## Shared platform (all tenants)

Single deployment, shared by every account:

| What | Where |
|------|--------|
| Account registry | Shared D1 → `accounts` |
| Marketplace providers | Shared D1 → `providers` |

The shared Worker handles account provisioning, provider lookups, and **routing** authenticated requests to the correct account Worker (using binding metadata stored on the account row).

**No client, user, group, case, or document data** lives in the shared D1.

## Per-account stack (one per customer)

**On account creation:**

1. Insert row in shared `accounts` (name, status, routing metadata).
2. Provision **dedicated D1** for that account.
3. Deploy **dedicated Worker** with a binding to that D1 only.
4. Run migrations / seed schema on the new D1.
5. Store Worker URL and D1 binding id on the account record (today: `db_shard_id` on `AccountSchema` — identifier for that account’s stack).

Each account Worker serves only that account’s users. Its D1 holds:

| Domain | Tables (representative) |
|--------|-------------------------|
| Admin | `users`, `groups` |
| Client | `clients`, `client_dependants`, `client_dependant_clients` |
| Case | `cases`, case tasks *(planned)* |
| Documents | `documents` (metadata; file bytes in R2) |
| Contacts | contact companies / individuals *(planned)* |

Rows may still include `account_id` in JSON for audit and schema consistency (`TrackingSchema`), but **tenant isolation is enforced by the database boundary**, not by filtering a shared table.

## Storage and Schema (D1)

Primary store is **D1 (SQLite)**. Schema pattern: JSON document in `body`, with generated columns and indexes only for fields you query/filter/sort.

**Do not duplicate the full schema rules here.** See:

- **`.cursor/rules/d1-sql-json-body.mdc`** — JSON body, generated columns, indexes. Distinguishes **shared** vs **account** D1 usage.
- **`docs/skills/db-setup/db-tables.md`** — model file → table mapping by domain.
- **`docs/skills/db-setup/db-diagrams.md`** — ASCII trees (Shared vs Account D1, client tables).

## Caching (Optional)

A KV namespace can be used as a **safe read cache** (e.g. invalidated on writes, used only when consistent with D1). Durable Objects are **not** used in this design.

## Consistency

Strong consistency can be achieved using D1 session bookmarks: writes return a bookmark; readers send it so replicas serve read-after-write. Important for financial and compliance workloads.

## High-Level Picture

```
                    UK Users
                        │
              Tenant / Custom Domain
                        │
              ┌─────────────────────┐
              │  Shared platform     │
              │  Worker + Shared D1    │
              │  • accounts            │
              │  • providers           │
              │  • provision + route   │
              └──────────┬────────────┘
                         │ route by account
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
  │ Account A    │ │ Account B    │ │ Account C    │
  │ Worker + D1  │ │ Worker + D1  │ │ Worker + D1  │
  ├─────────────┤ ├─────────────┤ ├─────────────┤
  │ users        │ │ users        │ │ users        │
  │ groups       │ │ groups       │ │ groups       │
  │ clients      │ │ clients      │ │ clients      │
  │ cases        │ │ cases        │ │ cases        │
  │ documents    │ │ documents    │ │ documents    │
  │ contacts…    │ │ contacts…    │ │ contacts…    │
  └─────────────┘ └─────────────┘ └─────────────┘
         │               │               │
         └───────────────┴───────────────┘
                    R2 (per-account buckets or prefixes)
```

## Summary

- **Shared D1**: `accounts`, `providers` — platform-wide, all tenants.
- **Account D1**: admin, client, case, documents, contacts — **one D1 per account**, no sharing.
- **Account creation** provisions dedicated D1 + Worker and records routing metadata on the account row.
- **D1 schema**: follow `.cursor/rules/d1-sql-json-body.mdc` (JSON body, generated columns, indexes).

Optimized for document-centric, compliance-aware SaaS with per-customer isolation.
