# Architecture Decision Records (ADR)

We record significant architecture choices here so future work has context on **why** a design was chosen, not only **what** the code does.

## Format

Each ADR is a numbered markdown file:

| Field | Meaning |
|-------|---------|
| **Status** | `Proposed` → `Accepted` → `Superseded` / `Deprecated` |
| **Context** | Problem and constraints |
| **Decision** | What we chose |
| **Consequences** | Pros, cons, and how we mitigate downsides |

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-one-d1-database-per-account.md) | One D1 database per customer (account) | Accepted |

## Related docs

- [README.md](../../README.md) — platform overview and provisioning summary
- [db-diagrams.md](../skills/db-setup/db-diagrams.md) — Shared vs Account D1 trees
- [db-tables.md](../skills/db-setup/db-tables.md) — model → table mapping
- [.cursor/rules/d1-sql-json-body.mdc](../../../.cursor/rules/d1-sql-json-body.mdc) — JSON `body` + generated columns
