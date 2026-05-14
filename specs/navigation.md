# UK CRM — global shell and navigation spec

This document describes the persistent chrome (header, main menu), top-level routes, and nested routes for **client** and **case** areas. URLs are path templates; `{id}` segments are dynamic. All URLS to be Kebab-case.

---

## Global header (all authenticated pages)

| Element | Behaviour |
|--------|-----------|
| **Main menu icon** | Opens a popup / drawer with **top-level navigation** (see below). |
| **App name** | Displays **CRM**; typically links to **Home** (`/`). |
| **Search** | **Global search**: either a **command-palette** pattern (keyboard: **Ctrl+K** on Windows/Linux, **⌘K** on macOS) that opens a focused overlay with scoped results and shortcuts, or a **standard header input** that filters / jumps as you type. Scope TBD (clients, cases, tasks, navigation, etc.); product may ship one pattern or offer both (palette for power users, input always visible). |
| **Global create** | **“+”** control in the header: opens a menu / modal with **quick-create** actions — **New client**, **New opportunity**, **New referral**. |
| **User name** | Right-aligned; shows signed-in user; entry point for profile / sign out (detail TBD). |

---

## Main menu (top-level navigation popup)

Items and target routes:

| Label | URL | Page covers |
|-------|-----|-------------|
| Home | `/` | CRM landing / dashboard: shortcuts, activity, key metrics (content TBD). |
| Clients | `/clients` | **Client list**: search, filter, create client, open client. |
| Cases | `/cases` | **Case list**: search, filter, create case, open case. |
| Applications | `/applications` | **Application list** (pipeline): applications across cases; status filters (content TBD). |
| Tasks | `/tasks` | **Task list**: user or team tasks, due dates, case/client links (content TBD). |
| Opportunities | `/opportunities` | **Opportunity list**: pipeline stages, value, linked client/case (content TBD). |
| Referrals | `/referrals` | **Referral list**: source, status, linked client/case (content TBD). |
| Compliance | `/compliance` | **Compliance** hub: checks, documents, statuses (content TBD). |
| Commissions — Written | `/commissions/written` | Commissions **written** / accrued (definitions TBD). |
| Commissions — Due | `/commissions/due` | Commissions **due** for payment. |
| Commissions — Received | `/commissions/received` | Commissions **received** (history). |

Parent **Commissions** is a group header only, no separate `/commissions` index required.

---

## Client area

| URL | Page covers |
|-----|-------------|
| `/client/{client_id}/overview` | **Client overview**: summary profile; **cases**, **opportunities**, and **referrals** linked to this client; navigation into case/client KYC where relevant. |

Optional list route is already covered by `/clients` (client list).

---

## Case shell (header + tabs)

**Case** pages share a **case header** (reference, status, parties, etc.) and **horizontal tabs** for major workstreams, for example:

| Tab (example) | URL | Page covers |
|---------------|-----|-------------|
| Overview | `/case/{case_id}/overview` | Case summary, milestones, linked clients, key dates. |
| Fact find | `/case/{case_id}/kyc` | Fact find (KYC) / needs analysis (structure TBD). |
| Applications | `/case/{case_id}/application` | Case application workflow (may align with global Applications list). |
| Requirements | `/case/{case_id}/requirements` | Requirement **types** (mortgage, protection, buildings & contents, ASU); each type has its own route under `/case/{case_id}/requirements/…` (see **Case — Requirements**). |
| Notes | `/case/{case_id}/notes` | Case notes, free text, pinned items, activity log (detail TBD). |
| Commission | `/case/{case_id}/commission` | Commissions for this case (written / due / received — may deep-link or summarise global Commissions). |
| Compliance | `/case/{case_id}/compliance` | Case-scoped compliance status, checks, documents (may align with global Compliance hub). |
| Referrals | `/case/{case_id}/referrals` | Referrals linked to this case (may align with global Referrals list). |
| *(other tabs)* | *(TBD)* | e.g. documents, timeline — add as product defines. |

---

## Case — Requirements

**Requirements** is **case-scoped**. Base path: `/case/{case_id}/requirements`.

The **Requirements** case tab lands on an index or default type (product choice); **each requirement type** has its **own URL segment** (no shared “generic” detail tree across types).

### Requirement types (top-level under `/case/{case_id}/requirements/`)

| Type (UI) | URL segment | Route | Page covers |
|-----------|-------------|-------|-------------|
| Mortgage | `mortgage` | `/case/{case_id}/requirements/mortgage` | Mortgage requirement workflow: entry, status, deep links into sub-areas below (left-hand nav). |
| Protection | `protection` | `/case/{case_id}/requirements/protection` | Protection / insurance requirement (structure TBD; may gain its own LHM later). |
| Buildings & contents | `buildings-contents` | `/case/{case_id}/requirements/buildings-contents` | Home insurance / buildings and contents requirement (structure TBD). |
| ASU | `asu` | `/case/{case_id}/requirements/asu` | **Accident, sickness, and unemployment** cover requirement (structure TBD). |

If the product later supports **multiple concurrent rows** per type (e.g. several mortgage requirements), routes may gain an instance id (e.g. `…/mortgage/{mortgage_requirement_id}/quotes`); until then, treat **`…/mortgage/…`** as the single active mortgage requirement area or redirect to the current instance.

### Mortgage requirement — routes and left-hand menu

Under **`/case/{case_id}/requirements/mortgage`**, the app uses **left-hand navigation** for the sections below (same labels in the nav and in URLs). Optional **completion** affordance (e.g. tick / incomplete) per row may match the KYC pattern (product decision).

| Section (LHM + route) | URL | Page covers |
|----------------------|-----|-------------|
| Quotes | `…/mortgage/quotes` | Lender / product quotes tied to this mortgage requirement (content TBD). |
| Property | `…/mortgage/property` | Subject **property** for the mortgage (facts, valuation links — detail TBD). |
| Security property | `…/mortgage/security-property` | **Security** property (charges, ranking, additional security — if distinct from subject property). |
| Preferences | `…/mortgage/preferences` | Borrower / adviser preferences (term, rate type, fees, product filters — TBD). |
| Tasks | `…/mortgage/tasks` | Tasks checklist for this mortgage requirement (may link to global **Tasks**). |
| Amendment history | `…/mortgage/amendment-history` | Change log / versions for requirement amendments. |
| Documents | `…/mortgage/documents` | Documents for this mortgage requirement (uploads, pack, lender docs). |
| Notes | `…/mortgage/notes` | Notes scoped to this mortgage requirement (distinct from case-level **Notes** tab if both exist). |

Full paths are kebab-case, for example: `/case/{case_id}/requirements/mortgage/quotes`, `…/mortgage/security-property`, `…/mortgage/amendment-history`.

---

## Case — KYC (left-hand nav under KYC routes)

KYC is a **case-scoped** area with its own **left-hand navigation**. Base path: `/case/{case_id}/kyc`.
for each menu section a right justified tick will be show tick or X to indicate if the screen is completed

### List and detail pattern (all KYC collections)

Every **KYC data collection** (properties, mortgages, etc.) uses the same routing shape:

1. **List** — plural (or natural collection) segment: browse, add, remove, reorder, bulk actions.
2. **Detail** — **same plural segment** as the list + **`{id}`**: full form for one row, validation, history/audit (if any).

Example: **`…/properties`** (list) → **`…/properties/{property_id}`** (detail).

The tables below list **List URL**, **Detail URL**, and what each screen covers.

---

### Case-level KYC

case/{case_id}/kyc/...

| List URL | Detail URL | List page covers | Detail page covers |
|----------|------------|------------------|---------------------|
| Clients | `./clients` | `./clients/{client_id}` | Clients on the case: **add**, **remove**, roles/order, jump into a client’s KYC. | **KYC client hub** — identity / profile for that client on this case; entry point to all per-client KYC sections below. |
| Dependants | `…/dependants` | `…/dependants/{dependant_id}` | All dependants: add/remove, sort, quick status. | One dependant: names, DOB, relationship, dependency flags, notes. |
| Employment and income | `…/employment-and-income` | `…/employment-and-income/{employment_and_income_id}` | Employers, self-employment, and other income lines; add new. | One employment or income record: amounts, dates, evidence links (TBD). |
| Credit history | `…/credit-history` | `…/credit-history/{credit_history_id}` | Searches, events, arrangements, CCJs as rows in a list. | One credit-history entry: detail, documents, disposition. |
| Commitments | `…/commitments` | `…/commitments/{commitment_id}` | Loans, HP, childcare, maintenance, other fixed outgoings. | One commitment: lender, balance, term, payment, linked security (TBD). |
| Properties | `…/properties` | `…/properties/{property_id}` | Owned / intended properties; values, tenancy summary. | One property: full facts, charges, rental, evidence. |
| Mortgages | `…/mortgages` | `…/mortgages/{mortgage_id}` | All mortgage rows for the client on the case. | One mortgage: lender, balance, rate, term, porting/redemption. |
| Policies | `…/policies` | `…/policies/{policy_id}` | Life, CI, IP, etc. | One policy: cover, premiums, beneficiaries, docs. |
| Savings and investments | `…/savings-and-investments` | `…/savings-and-investments/{savings_and_investment_id}` | Accounts, ISAs, pensions (accumulation), other wrappers. | One holding: valuations, contributions, risk (TBD). |
| Budget planner | `…/budget-planner` | `…/budget-planner/{budget_plan_id}` | Saved budgets / scenarios (or versions) for the client on the case. | One plan: income vs expenditure lines, disposable income, assumptions. |


---
---

## Spelling / naming (for UI copy)

Use **Opportunities**, **Referrals**, **Received**, **Dependants** vs **dependents** (match legal/product), **Credit history**, **Policies** (insurance), **Budget planner**, unless the codebase already fixes different spellings.

---
