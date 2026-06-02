import type { Client } from "./client";
import type { ClientCreditHistory } from "./client_credit_history";

const iso = (d: Date) => d.toISOString();

const creditHistoryTracking = {
    id: 1,
    account_id: 1,
    version: 1,
    updated_by: "advisor-42",
    updated_at: iso(new Date("2026-01-15T10:30:00Z")),
    created_by: "advisor-42",
    created_at: iso(new Date("2025-06-01T09:00:00Z")),
    created_by_user_type: "user" as const,
    last_updated_by_user_type: "user" as const,
    is_deleted: false,
};

/** Exercises multiple credit-issue union variants with populated nested detail objects. */
const test_client_credit_histories: ClientCreditHistory[] = [
    {
        ...creditHistoryTracking,
        id: 101,
        schema_version: 1,
        credit_issue_type_key: "arrears_missed_payments",
        linked_clients: ["client-john-doe", "client-jane-doe"],
        credit_bureau_id: "EXP-ARREARS-77821",
        credit_bureau_provider_name_key: "experian",
        court_case_number: null,
        credit_bureau_log: [
            {
                last_updated_at: iso(new Date("2026-01-10T14:00:00Z")),
                last_updated_by: "bureau-sync",
            },
        ],
        import: {
            source: "legacy_crm",
            source_id: "cred-legacy-9001",
        },
        arrears_details: {
            credit_issue_arrears_type_key: "mortgage",
            credit_issue_creditor_name: "Northern Building Society",
            credit_issue_missed_payments_six_years_count: 3,
            credit_issue_missed_payment_date: [
                iso(new Date("2024-03-01")),
                iso(new Date("2024-07-01")),
                iso(new Date("2025-01-01")),
            ],
            is_credit_issue_account_upto_date: false,
            credit_issue_outstanding_balance: 12450.75,
            credit_issue_has_payment_plan: true,
            credit_issue_payment_plan_notes:
                "Agreed £350/month from April 2025; first two payments received on time.",
            credit_issue_reason_key: "reduction_in_income",
            credit_issue_notes:
                "Temporary income reduction after redundancy; new role started Q4 2025.",
            is_credit_issue_intended_to_be_satisfied: true,
            credit_issue_resolution_key: "overpayment_from_income",
        },
    },
    {
        ...creditHistoryTracking,
        id: 102,
        version: 2,
        credit_issue_type_key: "county_court_judgement",
        linked_clients: ["client-john-doe"],
        credit_bureau_id: "EQ-CCJ-44210",
        credit_bureau_provider_name_key: "equifax",
        court_case_number: "CCJ-2023-004981",
        credit_bureau_log: [],
        ccj_details: {
            credit_account_type_key: "personal_loan",
            credit_issue_creditor_name: "Quick Finance Ltd",
            credit_issue_judgement_amount: 3200,
            credit_issue_registered_date: iso(new Date("2023-09-12")),
            is_credit_issue_satisfied: true,
            credit_issue_satisfied_date: iso(new Date("2024-11-30")),
            credit_issue_reason_key: "unforeseen_emergency_expenses",
            credit_issue_notes: "Satisfied in full before application; certificate held on file.",
            is_credit_issue_intended_to_be_satisfied: false,
            credit_issue_resolution_key: "savings",
        },
    },
    {
        ...creditHistoryTracking,
        id: 103,
        credit_issue_type_key: "individual_voluntary_arrangement",
        linked_clients: ["client-john-doe"],
        credit_bureau_provider_name_key: "trans_union",
        iva_details: {
            credit_issue_registered_date: iso(new Date("2022-04-01")),
            is_credit_issue_satisfied: false,
            credit_issue_satisfied_date: null,
            credit_issue_oustanding_balance: 18500,
            credit_issue_method_of_repayment_key: "monthly_instalments",
            credit_issue_repayment_amount: 285,
            credit_issue_repayment_has_conducted_satisfactorily: true,
            credit_issue_management_company: "ClearPath Insolvency Practitioners",
            credit_issue_reason_key: "overspending_or_excessive_debt",
            credit_issue_notes:
                "IVA due to complete Q2 2027; supervisor confirms payments satisfactory.",
            is_credit_issue_intended_to_be_satisfied: true,
            credit_issue_resolution_key: "overpayment_from_income",
        },
    },
    {
        ...creditHistoryTracking,
        id: 104,
        credit_issue_type_key: "bankruptcy_sequestration",
        linked_clients: ["client-john-doe"],
        bankruptcy_details: {
            credit_issue_registered_date: iso(new Date("2018-02-15")),
            credit_issue_is_discharged: true,
            credit_issue_discharge_date: iso(new Date("2019-02-15")),
            credit_issue_reason_key: "business_failure_or_bankruptcy",
            credit_issue_notes: "Discharged bankruptcy; no ongoing restrictions.",
            is_credit_issue_intended_to_be_satisfied: false,
            credit_issue_resolution_key: null,
        },
    },
    {
        ...creditHistoryTracking,
        id: 105,
        credit_issue_type_key: "default",
        linked_clients: ["client-john-doe"],
        default_details: {
            credit_account_type_key: "credit_card",
            credit_issue_creditor_name: "High Street Bank",
            credit_issue_judgement_amount: 890.5,
            credit_issue_registered_date: iso(new Date("2021-06-20")),
            is_credit_issue_satisfied: false,
            credit_issue_satisfied_date: null,
            credit_issue_reason_key: "poor_financial_planning_or_budgeting",
            credit_issue_notes: "Default registered; balance reducing via direct debit.",
            is_credit_issue_intended_to_be_satisfied: true,
            credit_issue_resolution_key: "sale_of_other_asset",
        },
    },
    {
        ...creditHistoryTracking,
        id: 106,
        credit_issue_type_key: "debt_relief_order",
        linked_clients: ["client-jane-doe"],
        dro_details: {
            credit_issue_creditor_name: "Multiple unsecured creditors",
            credit_issue_registered_date: iso(new Date("2020-11-01")),
            credit_issue_is_discharged: true,
            credit_issue_discharge_date: iso(new Date("2021-11-01")),
            credit_issue_reason_key: "unemployment",
            credit_issue_notes: "DRO completed; eligible for standard lending criteria.",
            is_credit_issue_intended_to_be_satisfied: false,
            credit_issue_resolution_key: null,
        },
    },
    {
        ...creditHistoryTracking,
        id: 107,
        credit_issue_type_key: "debt_management_plan",
        linked_clients: ["client-john-doe", "client-jane-doe"],
        credit_bureau_provider_name_key: "experian",
        credit_bureau_log: [
            {
                last_updated_at: iso(new Date("2025-12-01T08:00:00Z")),
                last_updated_by: "client-portal",
            },
        ],
    },
    {
        ...creditHistoryTracking,
        id: 108,
        credit_issue_type_key: "repossession",
        linked_clients: ["client-john-doe"],
        court_case_number: "REP-2016-1192",
        credit_bureau_provider_name_key: "equifax",
    },
];

// @ts-expect-error compile-time fixture: not executed
const test_client: Client = {
    client_type: "individual",
    first_name: "John",
    last_name: "Doe",
    primary_advisor_id: "123",
    group_id: "456",
    account_id: 1,
    version: 1,
    has_dual_nationality: false,
    nationality_secondary: null,
    is_deceased: false,
    updated_by: "123",
    health_and_lifestyle: {
        height_in_cm: 180,
        weight_in_kg: 70,
        has_any_medical_conditions: false,
        medical_conditions_details_note: null,
        has_family_member_died_or_serious_illness_before_age_65: false,
        family_member_illness_note: null,
    },
    addresses: [
        {
            client_address_id: "123",
            address: {
                postcode: "AB1 2CD",
                is_uk: true,
            },
            residency_start_date: new Date().toISOString(),
            is_current_address: true,
            occupancy_type: "owned_outright"
        }
    ],
    contact_details:
    {
        preferred_method_of_contact: "email",
        emails: [
            {
                email_id: "email-1",
                email: "john.doe@example.com",
                purpose: "work",
                is_default: true,
            }
        ],
        phones: [
            {
                phone_id: "phone-1",
                purpose: "work",
                country_code: "44",
                phone_number: "020 1234 5678",
            },
        ]
    },
    client_incomes: [
        {
            id: 1,
            account_id: 1,
            version: 1,
            updated_by: "123",
            updated_at: new Date().toISOString(),
            created_by: "123",
            created_at: new Date().toISOString(),
            created_by_user_type: "user",
            income_source: "employed",
            income_source_chronological_status_key: "current",
            employer_name: "Acme Ltd",
            job_title: "Software Engineer",
            employment_contract_type_key: "permanent",
            is_employment_full_time: true,
            gross_basic_salary: {
                currency: "GBP",
                income_amount: 50000,
                income_frequency: "yearly",
                income_is_paid_regularly: "regular",
                income_can_be_evidenced: true,
                income_history: [],
            },
            sick_pay: [],
            other_income: [],
            salary_deductions: [],
        },
    ],
};    
