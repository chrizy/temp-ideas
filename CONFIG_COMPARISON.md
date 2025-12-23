# Task Configuration Comparison Report

## Overview
This document compares the new TypeScript task configuration (`tasks.ts`) against the old JSON configuration.

## Key Mapping Differences

### Event/Stage Mapping
- **Old Config**: `event: "create" | "recommend"`
- **New Config**: `creation_event: "create_case" | "create_requirement" | "create_application" | "recommend_product"`
- **Old Config**: `workflow_stage_keys` (e.g., `["requirement_creation", "apply", "recommend", "application_submission"]`)
- **New Config**: `required_at_stages` (e.g., `["create_case", "create_requirement", "recommend_product", "create_application", "application_submission"]`)

### Business Type Mapping
- **Old Config**: `business_type_keys` uses values like `"residential"`, `"btl"`, `"asu"`, `"protection"`, `"household"`, `"personal_pmi"`, `"personal_accident_plan"`, `"equity_release"`, `"bridging_finance"`
- **New Config**: `business_types` uses values like `"residential_mortgage"`, `"btl_mortgage"`, `"protection_personal"`, `"protection_business"`, `"household"`, `"pmi"`, `"pap"`, `"equity_release"`, `"bridging"`

### Task Properties
- **Old Config**: `task_per_client` (boolean) → **New Config**: `per_client` (boolean, optional)
- **Old Config**: `check_for_existing` (boolean) → **New Config**: Not directly mapped (might be `one_per_case`)
- **Old Config**: `one_per_case` → **New Config**: `one_per_case` (optional boolean)
- **Old Config**: `is_active` (boolean) → **New Config**: Not present (all tasks are active)
- **Old Config**: `enabled_business_types` (array) → **New Config**: Not present (all business types in array are enabled)

## Missing Tasks from New Config

The following tasks from the old config are **NOT FOUND** in the new config:

### 1. Terms of Business (Account-specific, inactive)
- **Old ID**: `67ceb714be032f4e1c049765`
- **Status**: `is_active: false`
- **Document**: `firm_disclosure` / `terms_of_business`
- **Event**: `create`, **Type**: `case`
- **Business Types**: `asu`, `btl`, `household`, `protection`, `residential`
- **Note**: New config has a similar task but for all business types

### 2. Bank Statements (Account-specific, inactive)
- **Old ID**: `68762991958d49d4e80747c3`
- **Status**: `is_active: false`
- **Document**: `general_client` / `bank_statements`
- **Event**: `create`, **Type**: `requirement`
- **Has ignore condition**: Product switch exclusion
- **Note**: New config has this task but may have different business types

### 3. Disclosure (Account-specific, inactive)
- **Old ID**: `6912f3c819a3315efe0d65f2`
- **Status**: `is_active: false`
- **Document**: `firm_disclosure` / `disclosure`
- **Event**: `create`, **Type**: `case`
- **Business Types**: `asu` only
- **Has ignore conditions**: Two product switch exclusions

### 4. Bank Statements (Default, inactive)
- **Old ID**: `66c755e3220573b4b502d10b`
- **Status**: `is_active: false`
- **Document**: `general_client` / `bank_statements`
- **Event**: `create`, **Type**: `requirement`
- **Note**: New config has this task but it's active

### 5. Protection Product Research (Default, active)
- **Old ID**: `66c75361220573b4b502d0f6`
- **Status**: `is_active: true`
- **Document**: `protection_advice` / `product_research`
- **Event**: `create`, **Type**: `application`
- **Note**: **MISSING** from new config

### 6. ID&V, PEPs and Sanctions check (Default, active)
- **Old ID**: `6874f012eb513473970a5e32`
- **Status**: `is_active: true`
- **Document**: `general_client` / `idv_peps_sanctions_check`
- **Event**: `create`, **Type**: `requirement`
- **Business Types**: `asu`, `btl`, `protection`, `residential` (but only `asu`, `btl` enabled)
- **Note**: New config has this as `fact_find` with `text_field: "ID&V, PEPs and Sanctions check"`

### 7. Protection Discontinued Plan (Default, inactive)
- **Old ID**: `687625d300a5233cd9023753`
- **Status**: `is_active: false`
- **Document**: `protection_advice` / `protection_discontinued_plan`
- **Event**: `create`, **Type**: `application`
- **Note**: New config has this task

### 8. Terms of Business (Default, active)
- **Old ID**: `6924218d861b02251e0b6c22`
- **Status**: `is_active: true`
- **Document**: `firm_disclosure` / `terms_of_business`
- **Event**: `create`, **Type**: `case`
- **Business Types**: Many, but only `asu`, `btl` enabled
- **Note**: New config has this but all business types are enabled

### 9. Credit Report (Default, inactive)
- **Old ID**: `69244d60861b02251e0b6c25`
- **Status**: `is_active: false`
- **Document**: `general_client` / `credit_report`
- **Event**: `create`, **Type**: `application`
- **Note**: New config has this as `credit_report` category

### 10. Statement of Debts (Default, inactive)
- **Old ID**: `6924b56be845c085ab0f7ca4`
- **Status**: `is_active: false`
- **Note**: New config has this

### 11. Right to Reside (Default, inactive)
- **Old ID**: `6924bd03861b02251e0b6c29`
- **Status**: `is_active: false`
- **Note**: New config has this

### 12. Debt Consolidation Calculation (Default, inactive)
- **Old ID**: `6924c1916c4f535664009593`
- **Status**: `is_active: false`
- **Note**: New config has this

### 13. Gifted Deposit Letter (Default, inactive)
- **Old ID**: `6924c3f4861b02251e0b6c2b`
- **Status**: `is_active: false`
- **Note**: New config has this

### 14. Power of Attorney (Default, inactive)
- **Old ID**: `6924c5de861b02251e0b6c2d`
- **Status**: `is_active: false`
- **Note**: New config has this

### 15. Evidence of Expected Rental Income (Default, inactive)
- **Old ID**: `6924c6c1e845c085ab0f7ca6`
- **Status**: `is_active: false`
- **Note**: New config has this

### 16. Right to Buy Document (Default, inactive)
- **Old ID**: `6924d751861b02251e0b6c2f`
- **Status**: `is_active: false`
- **Note**: New config has this

### 17. Repayment Vehicle (Default, inactive)
- **Old ID**: `6924d9c9861b02251e0b6c31`
- **Status**: `is_active: false`
- **Note**: New config has this

### 18. Lender Rate Sheet (Mortgage, Default, inactive)
- **Old ID**: `6924dcad861b02251e0b6c33`
- **Status**: `is_active: false`
- **Note**: New config has this

### 19. Comparison ESIS/Illustration (Default, inactive)
- **Old ID**: `6924e061861b02251e0b6c3a`
- **Status**: `is_active: false`
- **Note**: New config has this as `comparison_illustration`

### 20. Trust documentation (Default, inactive)
- **Old ID**: `6929bf4ae3e8d9abbd06f1c8`
- **Status**: `is_active: false`
- **Note**: New config has this as `in_trust_policy`

### 21-26. Equity Release tasks (Default, all inactive)
- All equity release advice documents
- **Note**: New config has these

### 27-32. Bridging Finance tasks (Default, all inactive)
- All bridging advice documents
- **Note**: New config has these

## Configuration Differences

### 1. Protection Product Research
- **Old Config**: Present and active
- **New Config**: **MISSING**
- **Impact**: High - This is an active task in production

### 2. Business Type Enablement
- **Old Config**: Uses `enabled_business_types` to filter which business types are actually active
- **New Config**: All business types in the array are considered enabled
- **Impact**: Medium - May enable tasks for business types that should be disabled

### 3. Task Activation Status
- **Old Config**: Many tasks have `is_active: false`
- **New Config**: No activation flag - all tasks are active
- **Impact**: High - Inactive tasks from old config will be active in new config

### 4. Terms of Business - Business Type Filtering
- **Old Config**: All business types listed, but only `asu`, `btl` enabled
- **New Config**: All business types listed and all enabled
- **Impact**: Medium - May create tasks for business types that shouldn't have them

### 5. ID&V Task - Business Type Filtering
- **Old Config**: Business types: `asu`, `btl`, `protection`, `residential`, but only `asu`, `btl` enabled
- **New Config**: All listed business types enabled
- **Impact**: Medium

### 6. Bank Statements - Per Client Flag
- **Old Config**: `task_per_client: true` for account-specific version
- **New Config**: `one_per_case: true` (different semantics)
- **Impact**: Low - Need to verify if `one_per_case` means the same as `task_per_client: false`

## Recommendations

1. **Add Missing Task**: Protection Product Research (`product_research` for protection applications)
2. **Review Business Type Enablement**: Consider adding an `enabled_business_types` field or filtering mechanism
3. **Review Inactive Tasks**: Decide if inactive tasks from old config should be:
   - Removed from new config
   - Added with an `is_active: false` flag
   - Left as-is (all active)
4. **Verify Per-Client Logic**: Ensure `one_per_case` and `per_client` correctly map to old `task_per_client` behavior
5. **Verify Condition Logic**: Old config uses complex `applies_to` conditions - ensure new `creation_conditions` strings are equivalent

## Detailed Task-by-Task Comparison

### Firm Disclosure / Terms of Business
- ✅ Present in new config
- ⚠️ All business types enabled (old config had filtering)

### Firm Disclosure / Disclosure
- ✅ Present in new config
- ⚠️ All business types enabled (old config had account-specific version with only `asu`)

### Client Document / Proof of Address
- ✅ Present in new config
- ✅ Business types match

### Client Document / Bank Statements
- ✅ Present in new config
- ⚠️ Ignore condition present
- ⚠️ Old config had both active and inactive versions

### Client Document / Proof of Deposit
- ✅ Present in new config
- ✅ Creation condition matches

### Client Document / Proof of Identity
- ✅ Present in new config
- ✅ Business types match

### Client Document / Electronic Identity Check
- ✅ Present in new config
- ✅ Business types match

### Client Document / ID&V, PEPs and Sanctions
- ✅ Present in new config (as `fact_find` with `text_field`)
- ⚠️ Business type filtering differs

### Client Document / Proof of Income
- ✅ Present in new config
- ✅ Ignore condition present

### Client Document / Right to Reside
- ✅ Present in new config
- ✅ Creation condition matches

### Client Document / Evidence of Expected Rental Income
- ✅ Present in new config
- ✅ Business types match

### Credit Report
- ✅ Present in new config
- ✅ Creation condition matches

### Client Document / Statement of Debts
- ✅ Present in new config
- ✅ Creation condition matches

### Client Document / Debt Consolidation Calculation
- ✅ Present in new config
- ✅ Creation condition matches

### Client Document / State Benefits Report
- ✅ Present in new config (as `fact_find` with `text_field`)
- ✅ Creation condition matches

### Client Document / Power of Attorney
- ✅ Present in new config
- ✅ Creation condition matches

### Client Document / Gifted Deposit Letter
- ✅ Present in new config
- ✅ Creation condition matches

### Client Document / Right to Buy Document
- ✅ Present in new config
- ✅ Creation condition matches

### Client Document / Repayment Vehicle
- ✅ Present in new config
- ✅ Creation condition matches

### Client Document / Comparison Illustration
- ✅ Present in new config (as mortgage_advice document)
- ✅ Creation condition matches

### Mortgage Advice / ESIS
- ✅ Present in new config
- ✅ Event mapping correct

### Mortgage Advice / Mortgage Application Form
- ✅ Present in new config
- ✅ Business types match

### Mortgage Advice / Mortgage Offer
- ✅ Present in new config
- ✅ Stages match

### Mortgage Advice / Mortgage Research
- ✅ Present in new config (two entries - recommend and create)
- ✅ Business types match

### Mortgage Advice / Mortgage Suitability Report
- ✅ Present in new config
- ✅ Event mapping correct

### Mortgage Advice / Lender Rate Sheet
- ✅ Present in new config
- ✅ Creation condition matches

### Protection Advice / Product Research
- ❌ **MISSING FROM NEW CONFIG**
- **Old Config**: Active task for protection applications
- **Action Required**: Add this task

### Protection Advice / Protection Application Form
- ✅ Present in new config
- ✅ Business types match

### Protection Advice / Protection Acceptance Terms
- ✅ Present in new config
- ✅ Stages match

### Protection Advice / Product Illustration
- ✅ Present in new config
- ✅ Event mapping correct

### Protection Advice / Protection Suitability Report
- ✅ Present in new config
- ✅ Event mapping correct

### Protection Advice / Protection Discontinued Plan
- ✅ Present in new config
- ✅ Creation condition matches

### Protection Advice / In Trust Policy
- ✅ Present in new config
- ✅ Creation condition matches

### Home Insurance / Home Insurance Acceptance Terms
- ✅ Present in new config
- ✅ Stages match

### Home Insurance / Home Insurance Application
- ✅ Present in new config
- ✅ Business types match

### Home Insurance / Home Insurance Research
- ✅ Present in new config
- ✅ Event mapping correct

### Home Insurance / Home Insurance Quote
- ✅ Present in new config
- ✅ Event mapping correct

### Home Insurance / Home Insurance Suitability Report
- ✅ Present in new config
- ✅ Event mapping correct

### PMI Advice / All PMI tasks
- ✅ Present in new config
- ✅ All tasks match

### PAP Advice / All PAP tasks
- ✅ Present in new config
- ✅ All tasks match

### Equity Release Advice / All tasks
- ✅ Present in new config
- ✅ All tasks match

### Bridging Advice / All tasks
- ✅ Present in new config
- ✅ All tasks match
