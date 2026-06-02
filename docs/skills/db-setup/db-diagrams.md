# Database tree view

Plain ASCII trees for [Shared D1 vs Account D1](../../../README.md) and [client tables](./db-tables.md).

**Naming:** entity tables are plural nouns (`client_properties`). Many-to-many join tables use **`{entity}_links`** (not `_clients`). Example: `client_dependant_links` replaces `client_dependant_clients`.

---

## Databases

```
Platform
├── Shared Worker
│   └── Shared D1
│       ├── accounts
│       └── providers
│
└── Per account
    ├── Account A Worker → Account A D1
    ├── Account B Worker → Account B D1
    └── …

accounts  ──routes──►  account Worker + D1
```

---

## Account D1 (per customer)

```
Account D1
├── Admin
│   ├── users
│   └── groups
├── Client                          see “Client tables” below
├── Case                    (planned)
│   ├── cases
│   └── case_tasks
├── Documents
│   └── documents  →  R2
└── Contacts                (planned)
    ├── contact_companies
    └── contact_individuals
```

---

## Client tables (target)

Each **entity** row is JSON in `body` (document-style). **`_links`** tables connect entities to one or more `clients` (joint owners, couples, etc.).

```
Client (Account D1)
│
├── Entity tables
│   ├── clients
│   ├── client_dependants
│   ├── client_properties
│   ├── client_mortgages
│   ├── client_policies
│   ├── client_savings
│   ├── client_liabilities
│   ├── client_expenditures
│   ├── client_credit_histories
│   └── client_credit_summaries
│
└── Link tables (_links)
    ├── client_dependant_links         dependant       ↔ clients
    ├── client_credit_history_links    credit history  ↔ clients
    ├── client_property_links          property        ↔ clients
    ├── client_mortgage_links          mortgage        ↔ clients
    ├── client_policy_links            policy          ↔ clients
    ├── client_savings_links           savings         ↔ clients
    ├── client_liability_links         liability       ↔ clients
    ├── client_expenditure_links       expenditure     ↔ clients
    └── client_credit_summary_links    credit summary  ↔ clients
```

**Today in repo:** `clients`, `client_dependants`, `client_dependant_clients` (rename → `client_dependant_links`), `client_credit_histories`, `client_credit_history_links`. Incomes still embedded in `clients.body` until `client_incomes` + `client_income_links` exist.

---

## Link pattern

```
client_properties          client_property_links          clients
     │                            │                        │
     └────────────────────────────┴────────────────────────┘
              one property → many clients (and vice versa)
```

Same shape for mortgages, policies, assets, liabilities, expenditures, incomes, dependants, credit histories.

---

## `clients` (JSON in body)

Core client record only. Financial / shareable facts move to entity tables above (linked via `_links`).

```
clients
├── individual
│   ├── contact_details
│   ├── consent
│   ├── marketing_consent_preferences
│   ├── health_and_lifestyle
│   ├── vulnerability_info
│   ├── income
│   ├── addresses                    (until client_addresses table)
│   └── client_relationships         (client ↔ client, not _links)
│
└── company
    ├── financials                   (until promoted to table)
    ├── business_address
    ├── correspondence_address
    ├── professional_advisors
    └── client_relationships
```

**Moving out of `clients.body` (target tables):**

```
client_incomes[]           →  client_incomes           +  client_income_links
linked_clients (credit)    →  client_credit_histories  +  client_credit_history_links
(properties, etc.)       →  client_*                   +  client_*_links
```

DDL (current): `app/models/client/client_tables.sql`
