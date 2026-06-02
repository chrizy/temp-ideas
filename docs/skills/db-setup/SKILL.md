---
name: db-setup
description: >-
  Maps TypeScript models to Shared D1 vs per-account D1 tables. Use when provisioning
  account Workers/D1, adding migrations, or locating admin/client/case/document data.
---

# Database setup

**Shared D1** (all tenants): `accounts`, `providers`.

**Account D1** (one per customer, dedicated Worker): admin (`users`, `groups`), client, cases, documents, contacts.

Full tables, model paths, and nested client fields: **[db-tables.md](./db-tables.md)**.

ASCII trees (DBs + client tables): **[db-diagrams.md](./db-diagrams.md)**.

Architecture and provisioning: **[README.md](../../../README.md)**.
