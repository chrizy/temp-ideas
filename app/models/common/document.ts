import type { EnumSchema, EnumValidation, SchemaToType, UnionSchema, UnionVariant } from "../base_schema_types";

export const documentTypeSchema = {
    type: "enum",
    label: "Document Type",
    options: {
        "firm_disclosure": "Firm Disclosure",
        "client_documentation": "Client Documentation",
        "credit_report": "Credit Report",
        "mortgage_advice": "Mortgage Advice",
        "equity_release_advice": "Equity Release Advice",
        "bridging_advice": "Bridging Advice",
        "protection_advice": "Protection Advice",
        "home_insurance": "Home Insurance",
        "pmi_advice": "PMI Advice",
        "pap_advice": "PAP Advice"
    } as const,
    validation: {} as EnumValidation
} as const satisfies EnumSchema;
export type DocumentTypes = SchemaToType<typeof documentTypeSchema>;

const DocumentSubTypeFirmDisclosureVariant = {
    type: "object" as const,
    discriminator: "category" as const,
    value: "firm_disclosure" as const,
    fields: {
        category: {
            type: "enum" as const,
            options: {
                firm_disclosure: "Firm Disclosure"
            }
        },
        sub_type: {
            type: "enum" as const,
            label: "Document Sub Type",
            options: {
                disclosure: "Disclosure",
                terms_of_business: "Terms of Business",
                client_privacy: "Client Privacy"
            }
        }
    }
} as const satisfies UnionVariant<"category", "firm_disclosure">;

const DocumentSubTypeClientDocumentationVariant = {
    type: "object" as const,
    discriminator: "category" as const,
    value: "client_documentation" as const,
    fields: {
        category: {
            type: "enum" as const,
            options: {
                client_documentation: "Client Documentation"
            }
        },
        sub_type: {
            type: "enum" as const,
            label: "Document Sub Type",
            options: {
                proof_of_identification: "Proof of identity",
                electronic_identity_check: "Electronic identity check",
                idv_peps_sanctions_check: "ID&V, PEPs and Sanctions check",
                power_of_attorney: "Power of Attorney",
                right_to_reside: "Right to Reside",
                proof_of_address: "Proof of address",
                proof_of_income: "Proof of income",
                state_benefits_report: "State Benefits Report",
                evidence_of_expected_rental_income: "Evidence of Expected Rental Income",
                proof_of_deposit: "Proof of deposit",
                gifted_deposit_letter: "Gifted Deposit Letter",
                right_to_buy_document: "Right to Buy Document",
                credit_report: "Credit Report",
                statement_of_debts: "Statement of Debts",
                debt_consolidation_calculation: "Debt Consolidation Calculation",
                bank_statements: "Bank statements",
                mortgage_statement: "Mortgage statement",
                redemption_statement: "Redemption statement",
                existing_mortgage_consent_to_let: "Mortgage consent to Let",
                repayment_vehicle: "Repayment Vehicle",
                property_portfolio_document: "Property Portfolio Document",
                existing_policy: "Policy documents (Existing policies)",
                existing_home_insurance: "Home insurance documents (Existing policies)",
                investment_statement: "Investment statement",
                other: "Other client document"
            }
        }
    }
} as const satisfies UnionVariant<"category", "client_documentation">;

const DocumentSubTypeCreditReportVariant = {
    type: "object" as const,
    discriminator: "category" as const,
    value: "credit_report" as const,
    fields: {
        category: {
            type: "enum" as const,
            options: {
                credit_report: "Credit Report"
            }
        },
        sub_type: {
            type: "string" as const,
            label: "Document Sub Type"
        }
    }
} as const satisfies UnionVariant<"category", "credit_report">;

const DocumentSubTypeMortgageAdviceVariant = {
    type: "object" as const,
    discriminator: "category" as const,
    value: "mortgage_advice" as const,
    fields: {
        category: {
            type: "enum" as const,
            options: {
                mortgage_advice: "Mortgage Advice"
            }
        },
        sub_category: {
            type: "enum" as const,
            label: "Document Sub Type",
            options: {
                fact_find_snapshot: "Fact Find Snapshot",
                mortgage_requirement_information: "Mortgage Requirement Information",
                mortgage_research: "Mortgage Research",
                esis: "ESIS",
                comparison_illustration: "Comparison Illustration",
                lender_rate_sheet: "Lender Rate Sheet",
                decision_in_principle_certificate: "Decision in Principle Certificate",
                mortgage_suitability_report: "Mortgage Suitability Report",
                mortgage_application_form: "Mortgage Application Form",
                mortgage_valuation_report: "Mortgage Valuation Report",
                specialist_survey_report: "Specialist Survey Report",
                mortgage_offer: "Mortgage Offer",
                solicitor_correspondence: "Solicitor Correspondence",
                conveyancing_quote: "Conveyancing Quote",
                other_mortgage: "Other Mortgage"
            }
        }
    }
} as const satisfies UnionVariant<"category", "mortgage_advice">;

const DocumentSubTypeEquityReleaseAdviceVariant = {
    type: "object" as const,
    discriminator: "category" as const,
    value: "equity_release_advice" as const,
    fields: {
        category: {
            type: "enum" as const,
            options: {
                equity_release_advice: "Equity Release Advice"
            }
        },
        sub_type: {
            type: "enum" as const,
            label: "Document Sub Type",
            options: {
                fact_find_snapshot: "Fact Find Snapshot",
                mortgage_requirement_information: "Mortgage Requirement Information",
                mortgage_research: "Mortgage Research",
                lender_rate_sheet: "Lender Rate Sheet",
                esis: "ESIS",
                decision_in_principle_certificate: "Decision in Principle Certificate",
                mortgage_suitability_report: "Mortgage Suitability Report",
                mortgage_application_form: "Mortgage Application Form",
                mortgage_valuation_report: "Mortgage Valuation Report",
                specialist_survey_report: "Specialist Survey Report",
                mortgage_offer: "Mortgage Offer",
                solicitor_correspondence: "Solicitor Correspondence",
                conveyancing_quote: "Conveyancing Quote",
                other_mortgage: "Other Mortgage"
            }
        }
    }
} as const satisfies UnionVariant<"category", "equity_release_advice">;

const DocumentSubTypeBridgingAdviceVariant = {
    type: "object" as const,
    discriminator: "category" as const,
    value: "bridging_advice" as const,
    fields: {
        category: {
            type: "enum" as const,
            options: {
                bridging_advice: "Bridging Advice"
            }
        },
        sub_type: {
            type: "string" as const,
            label: "Document Sub Type"
        }
    }
} as const satisfies UnionVariant<"category", "bridging_advice">;

const DocumentSubTypeProtectionAdviceVariant = {
    type: "object" as const,
    discriminator: "category" as const,
    value: "protection_advice" as const,
    fields: {
        category: {
            type: "enum" as const,
            options: {
                protection_advice: "Protection Advice"
            }
        },
        sub_type: {
            type: "enum" as const,
            label: "Document Sub Type",
            options: {
                beneficiaries: "Beneficiaries",
                protection_discontinued_plan: "Protection Discontinued Plan",
                fact_find_snapshot: "Fact Find Snapshot",
                key_features: "Key Features",
                no_advice_declaration: "No Advice Declaration",
                other_protection_product: "Other Protection Product",
                new_policy_documents: "New Policy Documents",
                product_illustration: "Product Illustration",
                product_research: "Product Research",
                protection_acceptance_terms: "Protection Acceptance Terms",
                protection_application_form: "Protection Application Form",
                protection_suitability_report: "Protection Suitability Report",
                risk_mortgage_protection_report: "Risk Mortgage Protection Report",
                in_trust_policy: "In Trust Policy"
            }
        }
    }
} as const satisfies UnionVariant<"category", "protection_advice">;

const DocumentSubTypeHomeInsuranceVariant = {
    type: "object" as const,
    discriminator: "category" as const,
    value: "home_insurance" as const,
    fields: {
        category: {
            type: "enum" as const,
            options: {
                home_insurance: "Home Insurance"
            }
        },
        sub_type: {
            type: "enum" as const,
            label: "Document Sub Type",
            options: {
                demands_needs: "Demands Needs",
                fact_find_snapshot: "Fact Find Snapshot",
                home_insurance_acceptance_terms: "Home Insurance Acceptance Terms",
                home_insurance_application: "Home Insurance Application",
                home_insurance_policy: "Home Insurance Policy",
                home_insurance_policy_summary: "Home Insurance Policy Summary",
                home_insurance_quote: "Home Insurance Quote",
                home_insurance_research: "Home Insurance Research",
                home_insurance_suitability_report: "Home Insurance Suitability Report",
                other_home_insurance: "Other Home Insurance"
            }
        }
    }
} as const satisfies UnionVariant<"category", "home_insurance">;

const DocumentSubTypePmiAdviceVariant = {
    type: "object" as const,
    discriminator: "category" as const,
    value: "pmi_advice" as const,
    fields: {
        category: {
            type: "enum" as const,
            options: {
                pmi_advice: "PMI Advice"
            }
        },
        sub_type: {
            type: "enum" as const,
            label: "Document Sub Type",
            options: {
                demands_needs: "Demands Needs",
                pmi_research: "PMI Research",
                pmi_quote: "PMI Quote",
                pmi_application: "PMI Application",
                pmi_suitability_report: "PMI Suitability Report",
                pmi_policy_summary: "PMI Policy Summary",
                pmi_acceptance_terms: "PMI Acceptance Terms",
                pmi_policy: "PMI Policy",
                fact_find_snapshot: "Fact Find Snapshot",
                other_pmi_insurance: "Other PMI Insurance"
            }
        }
    }
} as const satisfies UnionVariant<"category", "pmi_advice">;

const DocumentSubTypePapAdviceVariant = {
    type: "object" as const,
    discriminator: "category" as const,
    value: "pap_advice" as const,
    fields: {
        category: {
            type: "enum" as const,
            options: {
                pap_advice: "PAP Advice"
            }
        },
        sub_type: {
            type: "enum" as const,
            label: "Document Sub Type",
            options: {
                demands_needs: "Demands Needs",
                pap_research: "PAP Research",
                pap_quote: "PAP Quote",
                pap_application: "PAP Application",
                pap_suitability_report: "PAP Suitability Report",
                pap_policy_summary: "PAP Policy Summary",
                pap_acceptance_terms: "PAP Acceptance Terms",
                pap_policy: "PAP Policy",
                fact_find_snapshot: "Fact Find Snapshot",
                other_pap_insurance: "Other PAP Insurance"
            }
        }
    }
} as const satisfies UnionVariant<"category", "pap_advice">;

export const DocumentSubTypeSchema = {
    type: "union" as const,
    label: "Document Type",
    variants: [
        DocumentSubTypeFirmDisclosureVariant,
        DocumentSubTypeClientDocumentationVariant,
        DocumentSubTypeCreditReportVariant,
        DocumentSubTypeMortgageAdviceVariant,
        DocumentSubTypeEquityReleaseAdviceVariant,
        DocumentSubTypeBridgingAdviceVariant,
        DocumentSubTypeProtectionAdviceVariant,
        DocumentSubTypeHomeInsuranceVariant,
        DocumentSubTypePmiAdviceVariant,
        DocumentSubTypePapAdviceVariant
    ]
} as const satisfies UnionSchema;

export type DocumentSubType = SchemaToType<typeof DocumentSubTypeSchema>;

