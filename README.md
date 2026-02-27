# Architecture Summary

Multi-tenant SaaS on Cloudflare: **multiple tenants (accounts) are batched into a single deployed instance** (one Worker + one D1 database per shard). The **account DB is a separate D1 used by all tenants**; it holds the account table (including `db_shard_id`) and routes each account to the correct data shard. Each shard stores groups, users, clients, and other shared data for all tenants on that shard. Larger customers can be given a **dedicated Worker + dedicated D1** (their own shard) for isolation and scale.

## Key requirements

- **Up to 4000 concurrent UK-only users per tenant**
- **~5 GB per tenant over 10 years** (document-centric client management)
- **Low cost** — shared instances for small/medium tenants; dedicated only where needed
- **High isolation** — per-tenant data keyed by `account_id`; large customers get dedicated Worker + D1
- **UK data residency** — compute in UK PoPs; D1 replication limited to EU region group; GDPR compliant; data does not leave Europe

## Tenancy and Sharding

- **Account DB (single D1, all tenants)**: Holds the account table (`id`, `name`, `db_shard_id`, `is_active`, etc.). Used by every tenant to resolve which data shard to use. No tenant data (groups, users, clients) lives here.
- **Data shards**: Many tenants (`account_id`) share one Worker and one D1 per shard. Tables are multi-tenant (e.g. `account_id` in every table; see composite keys in the DB rules).
- **Shared shard contents**: On a given shard, groups, users, clients, and related data live together; rows are distinguished by `account_id`.
- **Dedicated instances**: Larger or high-touch customers get their own Worker + D1 (and thus their own `db_shard_id`), with no sharing.

This supports:

- Cost-effective density for small/medium tenants
- Strong isolation and dedicated resources for large accounts
- Document-style JSON storage with indexed fields (see rules below)
- UK data residency and GDPR (see Key requirements above)

## Storage and Schema (D1)

Primary store is **D1 (SQLite)**. Schema pattern: JSON document in `body`, with generated columns and indexes only for fields you query/filter/sort. Multitenancy uses composite keys (e.g. `account_id` + entity id).

**Do not duplicate the full schema rules here.** See:

- **`.cursor/rules/d1-sql-json-body.mdc`** — JSON body, generated columns, indexes, and multitenancy (e.g. `UNIQUE (account_id, <entity_id>)`). All D1 table design should follow that rule.

## Caching (Optional)

A KV namespace can be used as a **safe read cache** (e.g. invalidated on writes, used only when consistent with D1). Durable Objects are **not** used in this design.

## Consistency

Strong consistency can be achieved using D1 session bookmarks: writes return a bookmark; readers send it so replicas serve read-after-write. Important for financial and compliance workloads.

## High-Level Picture

```
                    UK Users (up to 4000 concurrent per tenant)
                        │
              Tenant / Custom Domain
                        │
              ┌─────────────────────┐
              │  Worker (shared or  │
              │  dedicated per tier) │
              └─────────────────────┘
                        │
         ┌──────────────┼──────────────┬──────────────┐
         │              │              │              │
   Account D1      Shard A         Shard B      Shard C (e.g. large customer)
   (D1, all        (D1)            (D1)         (D1)
    tenants)       account_id      account_id   single account_id
   account table   ├ groups        ├ groups     ├ groups
   db_shard_id →   ├ users         ├ users      ├ users
                   ├ clients       ├ clients    ├ clients
                   └ ...           └ ...        └ ...
```

**Account D1** (single DB, all tenants): `account` table with `id`, `name`, `db_shard_id`, `is_active`, etc. — routes each account to the correct data shard. **Data shards** hold groups, users, clients keyed by `account_id`.

## Summary

- **No Durable Objects**; optional KV for safe read caching.
- **Account DB**: separate D1 used by all tenants; account table holds `db_shard_id`. **Multi-tenant data**: many `account_id`s per Worker + data shard D1.
- **Shared shard**: groups, users, clients (and related data) in one D1, keyed by `account_id`.
- **Dedicated path**: larger customers get their own Worker + D1.
- **D1 schema**: follow `.cursor/rules/d1-sql-json-body.mdc` (JSON body, generated columns, indexes, composite keys).

Optimized for document-centric, compliance-aware SaaS with flexible tenant density and scale.
