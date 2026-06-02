---
name: db-setup
description: >-
  Maps TypeScript models under app/models to Cloudflare D1 tables and describes
  what each stores. Use when adding entities, migrations, server CRUD, provisioning
  account Workers/D1, or answering where data lives (shared vs per-account).
---

# Database setup (typeed-forms)

## Two-tier storage

| Tier | Deployment | D1 | What lives here |
|------|------------|-----|-----------------|
| **Shared platform** | One Worker + one D1 for all tenants | **Shared D1** | `accounts`, `providers` |
| **Per account (customer)** | One Worker + one D1 **per account** (provisioned on account create) | **Account D1** | Admin, client, case, documents, contacts |

See [README.md](../../../README.md) for provisioning flow and routing.

**Diagrams:** [db-diagrams.md](./db-diagrams.md) (ASCII trees — DBs and client tables).

- **Isolation**: Customer data is never co-mingled in one D1; each account has its own database and Worker binding.
- **Routing**: Shared `accounts` row stores metadata to reach that account’s Worker/D1 (e.g. `db_shard_id` on `AccountSchema` until renamed).
- **Row shape** (account D1): `id`, `body` (JSON), optional generated columns. `account_id` may still appear inside `body` via `TrackingSchema` for audit; it is not used to separate tenants in SQL.
- **File bytes**: R2 (`r2_key` in document `body`); account D1 holds metadata + links.
- **Schema rules**: `.cursor/rules/d1-sql-json-body.mdc`
- **CRUD table union** (account D1 only today): `TableName` in `app/server/db-utils.ts` — `accounts` will move out of this union when split is implemented.

```ts
// app/server/db-utils.ts (account D1 — transitional; includes accounts until refactored)
type TableName = "clients" | "client_dependants" | "users" | "groups" | "accounts" | "documents";
```

SQL DDL for account tables: `app/models/**/**/*_tables.sql`.

---

## Shared platform (Shared D1)

Global data used by every tenant. **Not** stored in an account’s D1.

| Model (.ts) | DB table | What is stored |
|-------------|----------|----------------|
| `admin/account.ts` → `AccountSchema` | `accounts` | Tenant registry: id, name, routing/binding id for dedicated Worker+D1 (`db_shard_id`), active flag, timestamps |
| `admin/provider.ts` → `ProviderSchema` | `providers` *(planned DDL)* | Marketplace lenders/insurers: name, active business types |

**Account provisioning** (platform Worker): create `accounts` row → deploy account Worker + account D1 → migrate schema → update account with binding metadata.

---

## Admin (Account D1)

Firm structure and staff — **per account only**.

| Model (.ts) | DB table | What is stored |
|-------------|----------|----------------|
| `admin/user.ts` → `UserSchema` | `users` | Advisor/staff: login, group membership, client access rules, advisor settings, roles, calendar sync |
| `admin/group.ts` → `GroupSchema` | `groups` | Org hierarchy (linkage, parent), branch settings, task configs, section field requirements, address |

**Not in account D1:** `AccountSchema`, `ProviderSchema` (shared tier only).

**Supporting schemas** (nested in `UserSchema` / `GroupSchema`, not separate tables): `LoginDetailSchema`, `AdvisorSchema`, `ClientAccessCapabilitiesSchema`, `GroupTaskConfigurationSchema`, etc.

**Note:** `app/models/admin/admin_tables.sql` has legacy relational `groups` DDL. Runtime expects document-style `groups` with `body` (like `users`). Align DDL with `client_tables.sql` / `document_tables.sql`.

---

## Client (Account D1)

Fact-find data: **entity tables** (JSON `body` per row) plus **`_links`** tables where one record can belong to **multiple clients** (joint property, couple incomes, etc.).

**Convention:** join tables are named `{entity}_links`, not `{entity}_clients`. See [db-diagrams.md](./db-diagrams.md).

### Entity tables

| DB table | Status | What is stored |
|----------|--------|----------------|
| `clients` | implemented | Individual or company: identity, advisor/group, contact, consent, health, client-to-client relationships |
| `client_dependants` | implemented | Dependant person (DOB, relationship, dependency) |
| `client_incomes` | planned | Income sources (employed, pensions, rental, …) — today in `clients.body` as `client_incomes[]` |
| `client_properties` | planned | Properties: ownership, value, charges, tenure |
| `client_mortgages` | planned | Existing mortgages: lender, balance, terms |
| `client_policies` | planned | Protection / insurance policies |
| `client_assets` | planned | Savings, investments, other assets |
| `client_liabilities` | planned | Loans, cards, commitments |
| `client_expenditures` | planned | Household / committed spend |
| `client_credit_summaries` | planned | Credit summary (may overlap with documents) |

Models today: `client/client.ts`, `client/dependant.ts`, `client/client_income.ts` (schema only for incomes until table exists).

### Link tables (`_links`)

| DB table | Status | Links |
|----------|--------|--------|
| `client_dependant_links` | rename from `client_dependant_clients` | `client_dependants` ↔ `clients` |
| `client_income_links` | planned | `client_incomes` ↔ `clients` |
| `client_property_links` | planned | `client_properties` ↔ `clients` |
| `client_mortgage_links` | planned | `client_mortgages` ↔ `clients` |
| `client_policy_links` | planned | `client_policies` ↔ `clients` |
| `client_asset_links` | planned | `client_assets` ↔ `clients` |
| `client_liability_links` | planned | `client_liabilities` ↔ `clients` |
| `client_expenditure_links` | planned | `client_expenditures` ↔ `clients` |
| `client_credit_summary_links` | planned | `client_credit_summaries` ↔ `clients` |

Typical link row: `client_id`, `{entity}_id`, `created_at` (plus `account_id` if kept for audit consistency).

DDL (current): `app/models/client/client_tables.sql`.

### Still in `clients.body` (until promoted)

| Model / schema | Parent field | Notes |
|----------------|--------------|--------|
| Individual variant fields | root | Personal details, nationality, retirement, … |
| `ClientContactDetailsSchema` | `contact_details` | |
| Consent / marketing | `consent`, `marketing_consent_preferences` | |
| `ClientHealthLifestyleSchema` | `health_and_lifestyle` | |
| `VulnerableInfoSchema` | `vulnerability_info` | |
| `ClientAddressSchema` | `addresses` | → `client_addresses` + links when split |
| `ClientIncomeSchema` | `client_incomes` | → `client_incomes` + `client_income_links` |
| `ClientRelationshipSchema` | `client_relationships` | Client ↔ client (stays on `clients`; not `_links`) |
| `CompanyFinancialsSchema` | `financials` | |
| Company addresses / advisors | various | |

Income variants: see `client/client_income.ts`.

---

## Case (Account D1)

Mortgage/advice workflow — schemas exist; tables **planned**.

| Model (.ts) | DB table (planned) | What is stored |
|-------------|-------------------|----------------|
| `case/case.ts` → `CaseSchema` | `cases` | Case shell: `client_ids`, section completion flags |
| `case/case.ts` → `CaseConsumerConsentSchema` | embedded or case row | Per-client consent on a case |
| `case/tasks.ts` → `CaseTaskSchema` | `case_tasks` or embedded | Compliance, chase, housekeeping, review tasks |

Config (not DB): `config/tasks.ts`, `config/isCompleteSections.ts`.

---

## Documents (Account D1 + R2)

| Model (.ts) | DB table | What is stored |
|-------------|----------|----------------|
| `documents/document.ts` → `DocumentSchema` | `documents` | Metadata in `body`: type, `client_ids`, optional case/requirement/application ids, file info, `r2_key` |
| `documents/document_types.ts` | in `body` | Category + sub_type |
| `documents/document_metadata.ts` | in `body` / scanner | Extracted fields per sub_type |
| `documents/document-scanner.ts` | service | AI classification — not a table |

DDL: `app/models/documents/document_tables.sql`. Bytes in **R2**.

---

## Contacts (Account D1)

Third-party firms and people — schemas exist; tables **planned**.

| Model (.ts) | DB table (planned) | What is stored |
|-------------|-------------------|----------------|
| `contacts/company.ts` → `CompanySchema` | `contact_companies` | External company: type, address, phones, referral/introducer, branches |
| `contacts/individual.ts` → `IndividualSchema` | `contact_individuals` | Person: name, role, contact, `company_id`, `branch_id` |

---

## Shared building blocks (not tables)

| Path | Purpose |
|------|---------|
| `common/tracking.ts` | `id`, `account_id`, audit, `version`, soft delete (account D1 rows) |
| `common/address.ts` | UK / non-UK addresses |
| `common/PhoneEmail.ts` | Phone and email |
| `common/import.ts` | Legacy import metadata |
| `common/table.ts` | `parseTableRow` / `serializeEntity` |
| `base_schema_types.ts` | Schema → TypeScript types |

---

## SQL files → tables (by tier)

| SQL file | Tier | Tables |
|----------|------|--------|
| *(planned)* shared DDL | Shared D1 | `accounts`, `providers` |
| `admin/admin_tables.sql` | Account D1 | `groups` (legacy shape — align to JSON `body`) |
| `client/client_tables.sql` | Account D1 | `clients`, `client_dependants`, `client_dependant_clients` (→ `client_dependant_links`) |
| `documents/document_tables.sql` | Account D1 | `documents` |

---

## Agent checklist

1. **Shared vs account D1** — `accounts` and `providers` only on shared; everything else on account D1.
2. New **account** → provision Worker + D1; do not add tenant rows to shared D1 except `accounts`.
3. Prefer **JSON `body` + generated columns** on account tables; index only filtered fields.
4. Extend account `TableName` and `*_tables.sql` together for new top-level entities.
5. Client financial domains (properties, mortgages, policies): embed vs separate table based on query needs within **that account’s** D1 only.
