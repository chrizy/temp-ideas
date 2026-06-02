import type { ObjectSchema, SchemaToType, UnionSchema, UnionVariant } from "../../base_schema_types";
import { ImportedDataSchema } from "../../common/import";
import { TrackingSchema } from "../../common/tracking";

function optionLabel(options: Record<string, string>, value: unknown): string {
    if (value == null || value === "") return "";
    const key = typeof value === "string" || typeof value === "number" ? String(value) : "";
    if (!key) return "";
    return options[key] ?? "";
}

function formatAmount(value: unknown): string {
    if (typeof value === "number" && Number.isFinite(value)) return `£${value}`;
    return "";
}

const CreditIssueTypeOptions = {
    arrears_missed_payments: "Arrears / Missed Payments",
    bankruptcy_sequestration: "Bankruptcy / Sequestration",
    county_court_judgement: "County Court Judgement",
    default: "Default",
    debt_relief_order: "Debt Relief Order",
    individual_voluntary_arrangement: "Individual Voluntary Arrangement",
    debt_management_plan: "Debt Management Plan",
    repossession: "Repossession"
} as const;

const CreditBureauProviderOptions = {
    experian: "Experian",
    equifax: "Equifax",
    trans_union: "TransUnion"
} as const;

const CreditAccountTypeOptions = {
    credit_card: "Credit Card",
    store_card: "Store Card",
    store_finance: "Store Finance",
    payday_loan: "Payday Loan",
    personal_loan: "Personal Loan",
    hire_purchase: "Hire Purchase",
    communications: "Communications",
    other: "Other"
} as const;

const CreditArrearsTypeOptions = {
    rent: "Rent",
    mortgage: "Mortgage",
    credit_card: "Credit Card",
    loan: "Loan",
    utilities: "Utilities",
    mobile_phone_internet: "Mobile Phone / Internet"
} as const;

const CreditIssueReasonOptions = {
    unexpected_medical_expenses: "Unexpected Medical Expenses",
    divorce_or_separation: "Divorce or Separation",
    business_failure_or_bankruptcy: "Business Failure or Bankruptcy",
    identity_theft_or_fraud: "Identity Theft or Fraud",
    unforeseen_emergency_expenses: "Unforeseen Emergency Expenses",
    reduction_in_income: "Reduction in Income",
    unemployment: "Unemployment",
    overspending_or_excessive_debt: "Overspending or Excessive Debt",
    irregular_income_or_cash_flow: "Irregular Income or Cash Flow",
    substance_abuse_or_addiction_related_issues: "Substance Abuse or Addiction Related Issues",
    impulsive_spending_or_shopping_addiction: "Impulsive Spending or Shopping Addiction",
    poor_financial_planning_or_budgeting: "Poor Financial Planning or Budgeting"
} as const;

const CreditIssueResolutionOptions = {
    remortgage: "Remortgage",
    savings: "Savings",
    sale_of_property: "Sale of Property",
    non_repayable_gift_family: "Non-Repayable Gift (Family)",
    non_repayable_gift_non_family: "Non-Repayable Gift (Non-Family)",
    further_borrowing: "Further Borrowing",
    loan_family: "Loan (Family)",
    loan_non_family: "Loan (Non-Family)",
    inheritance: "Inheritance",
    sale_of_other_asset: "Sale of Other Asset",
    overpayment_from_income: "Overpayment from Income",
    bonus: "Bonus"
} as const;

const CreditIssueMethodOfRepaymentOptions = {
    monthly_instalments: "Monthly Instalments",
    one_off_payment: "One-Off Payment"
} as const;

const CreditHistoryCommonDetailFields = {
    credit_issue_reason_key: {
        type: "enum" as const,
        label: "Reason for credit issue",
        options: CreditIssueReasonOptions
    },
    credit_issue_notes: {
        type: "string" as const,
        label: "Notes (further explanation)",
        validation: { maxLength: 1000 }
    },
    is_credit_issue_intended_to_be_satisfied: {
        type: "boolean" as const,
        label: "Intend to satisfy?"
    },
    credit_issue_resolution_key: {
        type: "enum" as const,
        label: "How will this be cleared or reduced?",
        options: CreditIssueResolutionOptions
    }
} as const;

const CreditBureauLogSchema = {
    type: "object" as const,
    label: "Credit bureau log entry",
    fields: {
        last_updated_at: { type: "datetime" as const, label: "Last updated at" },
        last_updated_by: { type: "string" as const, label: "Last updated by" }
    }
} as const satisfies ObjectSchema;

const CreditHistoryArrearsMissedPaymentSchema = {
    type: "object" as const,
    label: "Arrears / missed payment details",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const type = optionLabel(CreditArrearsTypeOptions, v.credit_issue_arrears_type_key);
            const creditor = v.credit_issue_creditor_name ? String(v.credit_issue_creditor_name).trim() : "";
            return [type, creditor].filter(Boolean).join(" – ") || "Arrears / missed payment";
        }
        return "Arrears / missed payment";
    },
    fields: {
        credit_issue_arrears_type_key: {
            type: "enum" as const,
            label: "Arrears / missed payment type",
            options: CreditArrearsTypeOptions
        },
        credit_issue_creditor_name: {
            type: "string" as const,
            label: "Creditor",
            validation: { maxLength: 100 }
        },
        credit_issue_missed_payments_six_years_count: {
            type: "number" as const,
            label: "Number of missed payments in the last 6 years"
        },
        credit_issue_missed_payment_date: {
            type: "array" as const,
            itemSchema: { type: "datetime" as const },
            label: "Date of missed payment"
        },
        is_credit_issue_account_upto_date: {
            type: "boolean" as const,
            label: "Is the account fully up to date?"
        },
        credit_issue_outstanding_balance: {
            type: "number" as const,
            label: "Outstanding balance"
        },
        credit_issue_has_payment_plan: {
            type: "boolean" as const,
            label: "Is there a payment plan in place?"
        },
        credit_issue_payment_plan_notes: {
            type: "string" as const,
            label: "Notes (payment plan details)",
            validation: { maxLength: 1000 }
        },
        ...CreditHistoryCommonDetailFields
    }
} as const satisfies ObjectSchema;

const CreditHistoryBankruptcySchema = {
    type: "object" as const,
    label: "Bankruptcy details",
    description: (v: any) => {
        if (v && typeof v === "object" && v.credit_issue_registered_date) {
            return `Bankruptcy (${String(v.credit_issue_registered_date).slice(0, 10)})`;
        }
        return "Bankruptcy";
    },
    fields: {
        credit_issue_registered_date: { type: "datetime" as const, label: "Registered date" },
        credit_issue_is_discharged: { type: "boolean" as const, label: "Discharged?" },
        credit_issue_discharge_date: { type: "datetime" as const, label: "Discharged date" },
        ...CreditHistoryCommonDetailFields
    }
} as const satisfies ObjectSchema;

const CreditHistoryCCJSchema = {
    type: "object" as const,
    label: "CCJ details",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const creditor = v.credit_issue_creditor_name ? String(v.credit_issue_creditor_name).trim() : "";
            const amt = formatAmount(v.credit_issue_judgement_amount);
            return [creditor, amt].filter(Boolean).join(" – ") || "County Court Judgement";
        }
        return "County Court Judgement";
    },
    fields: {
        credit_account_type_key: {
            type: "enum" as const,
            label: "Type of account",
            options: CreditAccountTypeOptions
        },
        credit_issue_creditor_name: {
            type: "string" as const,
            label: "Creditor",
            validation: { maxLength: 100 }
        },
        credit_issue_judgement_amount: {
            type: "number" as const,
            label: "Amount of the judgement"
        },
        credit_issue_registered_date: { type: "datetime" as const, label: "Registered date" },
        is_credit_issue_satisfied: { type: "boolean" as const, label: "Is it satisfied?" },
        credit_issue_satisfied_date: { type: "datetime" as const, label: "Satisfied date" },
        ...CreditHistoryCommonDetailFields
    }
} as const satisfies ObjectSchema;

const CreditHistoryDefaultSchema = {
    type: "object" as const,
    label: "Default details",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const creditor = v.credit_issue_creditor_name ? String(v.credit_issue_creditor_name).trim() : "";
            const amt = formatAmount(v.credit_issue_judgement_amount);
            return [creditor, amt].filter(Boolean).join(" – ") || "Default";
        }
        return "Default";
    },
    fields: {
        credit_account_type_key: {
            type: "enum" as const,
            label: "Type of account",
            options: CreditAccountTypeOptions
        },
        credit_issue_creditor_name: {
            type: "string" as const,
            label: "Creditor",
            validation: { maxLength: 100 }
        },
        credit_issue_judgement_amount: {
            type: "number" as const,
            label: "Amount of the judgement"
        },
        credit_issue_registered_date: { type: "datetime" as const, label: "Registered date" },
        is_credit_issue_satisfied: { type: "boolean" as const, label: "Is it satisfied?" },
        credit_issue_satisfied_date: { type: "datetime" as const, label: "Satisfied date" },
        ...CreditHistoryCommonDetailFields
    }
} as const satisfies ObjectSchema;

const CreditHistoryDROSchema = {
    type: "object" as const,
    label: "Debt relief order details",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const creditor = v.credit_issue_creditor_name ? String(v.credit_issue_creditor_name).trim() : "";
            return creditor || "Debt Relief Order";
        }
        return "Debt Relief Order";
    },
    fields: {
        credit_issue_creditor_name: {
            type: "string" as const,
            label: "Creditor",
            validation: { maxLength: 100 }
        },
        credit_issue_registered_date: { type: "datetime" as const, label: "Registered date" },
        credit_issue_is_discharged: { type: "boolean" as const, label: "Discharged?" },
        credit_issue_discharge_date: { type: "datetime" as const, label: "Discharged date" },
        ...CreditHistoryCommonDetailFields
    }
} as const satisfies ObjectSchema;

const CreditHistoryIVASchema = {
    type: "object" as const,
    label: "IVA details",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const balance = formatAmount(v.credit_issue_oustanding_balance);
            const company = v.credit_issue_management_company
                ? String(v.credit_issue_management_company).trim()
                : "";
            return [company, balance].filter(Boolean).join(" – ") || "IVA";
        }
        return "IVA";
    },
    fields: {
        credit_issue_registered_date: { type: "datetime" as const, label: "Registered date" },
        is_credit_issue_satisfied: { type: "boolean" as const, label: "Is it satisfied?" },
        credit_issue_satisfied_date: { type: "datetime" as const, label: "Satisfied date" },
        credit_issue_oustanding_balance: {
            type: "number" as const,
            label: "Outstanding balance"
        },
        credit_issue_method_of_repayment_key: {
            type: "enum" as const,
            label: "How is this being repaid?",
            options: CreditIssueMethodOfRepaymentOptions
        },
        credit_issue_repayment_amount: {
            type: "number" as const,
            label: "Payment plan payment amount"
        },
        credit_issue_repayment_has_conducted_satisfactorily: {
            type: "boolean" as const,
            label: "Has the repayment plan been conducted satisfactorily?"
        },
        credit_issue_management_company: {
            type: "string" as const,
            label: "Management company",
            validation: { maxLength: 100 }
        },
        ...CreditHistoryCommonDetailFields
    }
} as const satisfies ObjectSchema;

const ClientCreditHistoryBaseFields = {
    ...TrackingSchema.fields,
    schema_version: { type: "number" as const, label: "Schema version" },
    credit_issue_type_key: {
        type: "enum" as const,
        label: "Credit issue type",
        options: CreditIssueTypeOptions,
        validation: { required: true }
    },
    linked_clients: {
        type: "array" as const,
        itemSchema: { type: "string" as const },
        label: "Linked client IDs"
    },
    credit_bureau_id: {
        type: "string" as const,
        label: "Credit Bureau ID",
        validation: { maxLength: 100 }
    },
    credit_bureau_provider_name_key: {
        type: "enum" as const,
        label: "Credit Bureau Provider",
        options: CreditBureauProviderOptions
    },
    court_case_number: {
        type: "string" as const,
        label: "Court Case Number"
    },
    credit_bureau_log: {
        type: "array" as const,
        itemSchema: CreditBureauLogSchema,
        label: "Credit Bureau Log"
    },
    import: { ...ImportedDataSchema }
} as const;

const ArrearsCreditHistoryVariant = {
    type: "object" as const,
    discriminator: "credit_issue_type_key" as const,
    value: "arrears_missed_payments" as const,
    fields: {
        ...ClientCreditHistoryBaseFields,
        arrears_details: { ...CreditHistoryArrearsMissedPaymentSchema, label: "Arrears / missed payment details" }
    }
} as const satisfies UnionVariant<"credit_issue_type_key", "arrears_missed_payments">;

const BankruptcyCreditHistoryVariant = {
    type: "object" as const,
    discriminator: "credit_issue_type_key" as const,
    value: "bankruptcy_sequestration" as const,
    fields: {
        ...ClientCreditHistoryBaseFields,
        bankruptcy_details: { ...CreditHistoryBankruptcySchema, label: "Bankruptcy details" }
    }
} as const satisfies UnionVariant<"credit_issue_type_key", "bankruptcy_sequestration">;

const CCJCreditHistoryVariant = {
    type: "object" as const,
    discriminator: "credit_issue_type_key" as const,
    value: "county_court_judgement" as const,
    fields: {
        ...ClientCreditHistoryBaseFields,
        ccj_details: { ...CreditHistoryCCJSchema, label: "CCJ details" }
    }
} as const satisfies UnionVariant<"credit_issue_type_key", "county_court_judgement">;

const DefaultCreditHistoryVariant = {
    type: "object" as const,
    discriminator: "credit_issue_type_key" as const,
    value: "default" as const,
    fields: {
        ...ClientCreditHistoryBaseFields,
        default_details: { ...CreditHistoryDefaultSchema, label: "Default details" }
    }
} as const satisfies UnionVariant<"credit_issue_type_key", "default">;

const DROCreditHistoryVariant = {
    type: "object" as const,
    discriminator: "credit_issue_type_key" as const,
    value: "debt_relief_order" as const,
    fields: {
        ...ClientCreditHistoryBaseFields,
        dro_details: { ...CreditHistoryDROSchema, label: "Debt relief order details" }
    }
} as const satisfies UnionVariant<"credit_issue_type_key", "debt_relief_order">;

const IVACreditHistoryVariant = {
    type: "object" as const,
    discriminator: "credit_issue_type_key" as const,
    value: "individual_voluntary_arrangement" as const,
    fields: {
        ...ClientCreditHistoryBaseFields,
        iva_details: { ...CreditHistoryIVASchema, label: "IVA details" }
    }
} as const satisfies UnionVariant<"credit_issue_type_key", "individual_voluntary_arrangement">;

const DebtManagementPlanCreditHistoryVariant = {
    type: "object" as const,
    discriminator: "credit_issue_type_key" as const,
    value: "debt_management_plan" as const,
    fields: { ...ClientCreditHistoryBaseFields }
} as const satisfies UnionVariant<"credit_issue_type_key", "debt_management_plan">;

const RepossessionCreditHistoryVariant = {
    type: "object" as const,
    discriminator: "credit_issue_type_key" as const,
    value: "repossession" as const,
    fields: { ...ClientCreditHistoryBaseFields }
} as const satisfies UnionVariant<"credit_issue_type_key", "repossession">;

const CREDIT_HISTORY_DETAIL_FIELDS = [
    "arrears_details",
    "bankruptcy_details",
    "ccj_details",
    "default_details",
    "dro_details",
    "iva_details"
] as const;

const CREDIT_ISSUE_TYPE_TO_DETAIL_FIELD: Partial<
    Record<keyof typeof CreditIssueTypeOptions, (typeof CREDIT_HISTORY_DETAIL_FIELDS)[number]>
> = {
    arrears_missed_payments: "arrears_details",
    bankruptcy_sequestration: "bankruptcy_details",
    county_court_judgement: "ccj_details",
    default: "default_details",
    debt_relief_order: "dro_details",
    individual_voluntary_arrangement: "iva_details"
};

function clientCreditHistoryClearInvalidData(record: any): any {
    if (!record || typeof record !== "object") return record;
    const out = { ...record };
    const keep = CREDIT_ISSUE_TYPE_TO_DETAIL_FIELD[out.credit_issue_type_key as keyof typeof CreditIssueTypeOptions];
    for (const key of CREDIT_HISTORY_DETAIL_FIELDS) {
        if (key !== keep) {
            out[key] = undefined;
        }
    }
    return out;
}

function clientCreditHistoryDescription(record: any): string {
    if (record && typeof record === "object") {
        const issueType = optionLabel(CreditIssueTypeOptions, record.credit_issue_type_key);
        if (issueType) return issueType;
    }
    return "Credit history";
}

export const ClientCreditHistorySchema = {
    type: "union" as const,
    label: "Client Credit History",
    description: clientCreditHistoryDescription,
    clearInvalidData: clientCreditHistoryClearInvalidData,
    variants: [
        ArrearsCreditHistoryVariant,
        BankruptcyCreditHistoryVariant,
        CCJCreditHistoryVariant,
        DefaultCreditHistoryVariant,
        DROCreditHistoryVariant,
        IVACreditHistoryVariant,
        DebtManagementPlanCreditHistoryVariant,
        RepossessionCreditHistoryVariant
    ]
} as const satisfies UnionSchema;

export type ClientCreditHistory = SchemaToType<typeof ClientCreditHistorySchema>;
