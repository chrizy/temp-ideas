import type { DocumentTypes, DocumentSubType } from "../common/document";
import type { EnumSchema, SchemaToType } from "../base_schema_types";

// Single source of truth for stage enum
export const StageEnumSchema = {
    type: "enum" as const,
    label: "Stage",
    options: {
        create_case: "Case",
        create_requirement: "Requirement",
        recommend_product: "Recommend",
        create_application: "Application",
        application_submission: "Application Submission",
        application_completion: "Application Completion",
        application_closure: "Application Closure"
    }
} as const satisfies EnumSchema;

export type Stage = SchemaToType<typeof StageEnumSchema>;
export type CreateAtStage = "create_case" | "create_requirement" | "create_application" | "recommend_product";

export type BusinessType =
    | "residential_mortgage"
    | "btl_mortgage"
    | "equity_release"
    | "bridging"
    | "protection_personal"
    | "protection_business"
    | "household"
    | "pap"
    | "pmi";

export type IgnoreConditions =
    | "mortgage_application_transaction_type_key = product_switch";

export type Task = {
    document: DocumentSubType;
    // text_field?: string;
    creation_event: CreateAtStage;
    one_per_case?: boolean;
    /** generate a task for each client */
    per_client?: boolean;  /// remove if only applies to client documents?
    updated_creation_event?: CreateAtStage;
    required_at_stages: Stage[];
    creation_conditions?: string;
    ignore_conditions?: IgnoreConditions;
    business_types: BusinessType[];
};

const Required_tasks: Task[] = [
    {
        "document": {
            category: "firm_disclosure",
            sub_type: "disclosure"
        },
        "creation_event": "create_case",
        "one_per_case": true,
        "required_at_stages": [
            "create_case",
            "create_requirement",
            "recommend_product",
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "residential_mortgage",
            "btl_mortgage",
            "equity_release",
            "bridging",
            "protection_personal",
            "protection_business",
            "household",
            "pap",
            "pmi"
        ]
    },
    {
        "document": {
            category: "firm_disclosure",
            sub_type: "terms_of_business"
        },
        "creation_event": "create_case",
        "one_per_case": true,
        "required_at_stages": [
            "create_case",
            "create_requirement",
            "recommend_product",
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "residential_mortgage",
            "btl_mortgage",
            "equity_release",
            "bridging",
            "protection_personal",
            "protection_business",
            "household",
            "pap",
            "pmi"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "proof_of_address"
        },
        "creation_event": "create_requirement",
        "one_per_case": true,
        "required_at_stages": [
            "recommend_product",
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "residential_mortgage",
            "btl_mortgage",
            "equity_release",
            "bridging"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "bank_statements"
        },
        "creation_event": "create_requirement",
        "one_per_case": true,
        "required_at_stages": [
            "recommend_product",
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "ignore_conditions": "mortgage_application_transaction_type_key = product_switch",
        "business_types": [
            "residential_mortgage",
            "btl_mortgage"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "proof_of_deposit"
        },
        "creation_event": "create_requirement",
        "required_at_stages": [
            "recommend_product",
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "Transaction Type = Purchase",
        "business_types": [
            "residential_mortgage",
            "btl_mortgage",
            "equity_release",
            "bridging"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "proof_of_identification"
        },
        "creation_event": "create_requirement",
        "one_per_case": true,
        "required_at_stages": [
            "recommend_product",
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "None",
        "business_types": [
            "residential_mortgage",
            "btl_mortgage",
            "equity_release",
            "bridging",
            "protection_personal",
            "protection_business",
            "household",
            "pap",
            "pmi"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "electronic_identity_check"
        },
        "creation_event": "create_requirement",
        "one_per_case": true,
        "required_at_stages": [
            "recommend_product",
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "None",
        "business_types": [
            "residential_mortgage",
            "btl_mortgage",
            "equity_release",
            "bridging",
            "protection_personal",
            "protection_business",
            "household",
            "pap",
            "pmi"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "idv_peps_sanctions_check"
        },
        "creation_event": "create_requirement",
        "one_per_case": true,
        "required_at_stages": [
            "recommend_product",
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "residential_mortgage",
            "btl_mortgage",
            "equity_release",
            "bridging",
            "protection_personal",
            "protection_business",
            "household",
            "pap",
            "pmi"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "proof_of_income"
        },
        "creation_event": "create_requirement",
        "one_per_case": true,
        "required_at_stages": [
            "recommend_product",
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "ignore_conditions": "mortgage_application_transaction_type_key = product_switch",
        "business_types": [
            "residential_mortgage",
            "btl_mortgage"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "right_to_reside"
        },
        "creation_event": "create_application",
        "one_per_case": true,
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "citizen_status_key != british or irish",
        "business_types": [
            "residential_mortgage",
            "btl_mortgage",
            "equity_release",
            "bridging",
            "protection_personal",
            "protection_business",
            "household",
            "pap",
            "pmi"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "evidence_of_expected_rental_income"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "None",
        "business_types": [
            "btl_mortgage"
        ]
    },
    {
        "document": {
            category: "credit_report",
            sub_type: ""
        },
        "creation_event": "create_application",
        "one_per_case": true,
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "has_mortgage_debt_consolidation = True",
        "business_types": [
            "residential_mortgage",
            "btl_mortgage",
            "equity_release",
            "bridging"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "statement_of_debts"
        },
        "creation_event": "create_application",
        "one_per_case": true,
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "has_mortgage_debt_consolidation = True",
        "business_types": [
            "residential_mortgage",
            "btl_mortgage",
            "equity_release",
            "bridging"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "debt_consolidation_calculation"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "has_mortgage_debt_consolidation = True",
        "business_types": [
            "residential_mortgage",
            "btl_mortgage",
            "equity_release",
            "bridging"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "state_benefits_report"
        },
        "creation_event": "create_application",
        "one_per_case": true,
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "is_retirement_interest_only_application = True OR capital raising purpose is provide an income",
        "business_types": [
            "residential_mortgage",
            "equity_release"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "power_of_attorney"
        },
        "creation_event": "create_application",
        "one_per_case": true,
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "is_kyc_granted_power_of_attorney = True",
        "business_types": [
            "equity_release"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "gifted_deposit_letter"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "Transaction Type = Purchase AND purchase_deposit_source_key IN [gift_non_repayable, gift_repayable]",
        "business_types": [
            "residential_mortgage",
            "btl_mortgage"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "right_to_buy_document"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "is_right_to_buy_application = True",
        "business_types": [
            "residential_mortgage"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "repayment_vehicle"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "mortgage_occupancy_type_key = residential_mortgage AND repayment_vehicle_interest_only_type_key IN [endowment, isa, pension_lump_sum, stocks_shares]",
        "business_types": [
            "residential_mortgage"
        ]
    },
    {
        "document": {
            category: "client_documentation",
            sub_type: "fact_find"
        },
        "text_field": "Comparison Illustration",
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "mortgage_repayment_method_key != capital_interest",
        "business_types": [
            "residential_mortgage"
        ]
    },
    {
        "document": {
            category: "mortgage_advice",
            sub_category: "esis"
        },
        "creation_event": "recommend_product",
        "updated_creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "residential_mortgage",
            "btl_mortgage"
        ]
    },
    {
        "document": {
            category: "mortgage_advice",
            sub_category: "mortgage_application_form"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "residential_mortgage",
            "btl_mortgage"
        ]
    },
    {
        "document": {
            category: "mortgage_advice",
            sub_category: "mortgage_offer"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "residential_mortgage",
            "btl_mortgage"
        ]
    },
    {
        "document": {
            category: "mortgage_advice",
            sub_category: "mortgage_research"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "residential_mortgage",
            "btl_mortgage"
        ]
    },
    {
        "document": {
            category: "mortgage_advice",
            sub_category: "mortgage_suitability_report"
        },
        "creation_event": "recommend_product",
        "required_at_stages": [
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "residential_mortgage",
            "btl_mortgage"
        ]
    },
    {
        "document": {
            category: "mortgage_advice",
            sub_category: "mortgage_research"
        },
        "creation_event": "recommend_product",
        "updated_creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "residential_mortgage",
            "btl_mortgage"
        ]
    },
    {
        "document": {
            category: "mortgage_advice",
            sub_category: "lender_rate_sheet"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "mortgage_application_transaction_type_key IN [further_advance, product_switch, product_switch_and_further_advance]",
        "business_types": [
            "residential_mortgage",
            "btl_mortgage"
        ]
    },
    {
        "document": {
            category: "equity_release_advice",
            sub_type: "esis"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "equity_release"
        ]
    },
    {
        "document": {
            category: "equity_release_advice",
            sub_type: "mortgage_application_form"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "equity_release"
        ]
    },
    {
        "document": {
            category: "equity_release_advice",
            sub_type: "mortgage_offer"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "equity_release"
        ]
    },
    {
        "document": {
            category: "equity_release_advice",
            sub_type: "mortgage_research"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "equity_release"
        ]
    },
    {
        "document": {
            category: "equity_release_advice",
            sub_type: "mortgage_suitability_report"
        },
        "creation_event": "recommend_product",
        "required_at_stages": [
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "equity_release"
        ]
    },
    {
        "document": {
            category: "equity_release_advice",
            sub_type: "mortgage_research"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "equity_release"
        ]
    },
    {
        "document": {
            category: "equity_release_advice",
            sub_type: "lender_rate_sheet"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "mortgage_application_transaction_type_key IN [further_advance, product_switch, product_switch_and_further_advance]",
        "business_types": [
            "equity_release"
        ]
    },
    {
        "document": {
            category: "bridging_advice",
            sub_type: "ESIS / illustration"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "bridging"
        ]
    },
    {
        "document": {
            category: "bridging_advice",
            sub_type: "Mortgage application form"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "bridging"
        ]
    },
    {
        "document": {
            category: "bridging_advice",
            sub_type: "Mortgage offer"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "bridging"
        ]
    },
    {
        "document": {
            category: "bridging_advice",
            sub_type: "Product research"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "bridging"
        ]
    },
    {
        "document": {
            category: "bridging_advice",
            sub_type: "Mortgage suitability report"
        },
        "creation_event": "recommend_product",
        "required_at_stages": [
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "bridging"
        ]
    },
    {
        "document": {
            category: "bridging_advice",
            sub_type: "Mortgage research"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "bridging"
        ]
    },
    {
        "document": {
            category: "bridging_advice",
            sub_type: "Lender Rate Sheet"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "mortgage_application_transaction_type_key IN [further_advance, product_switch, product_switch_and_further_advance]",
        "business_types": [
            "bridging"
        ]
    },
    {
        "document": {
            category: "protection_advice",
            sub_type: "protection_application_form"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "protection_personal",
            "protection_business"
        ]
    },
    {
        "document": {
            category: "protection_advice",
            sub_type: "protection_acceptance_terms"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "protection_personal",
            "protection_business"
        ]
    },
    {
        "document": {
            category: "protection_advice",
            sub_type: "product_illustration"
        },
        "creation_event": "recommend_product",
        "updated_creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "protection_personal",
            "protection_business"
        ]
    },
    {
        "document": {
            category: "protection_advice",
            sub_type: "protection_suitability_report"
        },
        "creation_event": "recommend_product",
        "required_at_stages": [
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "protection_personal",
            "protection_business"
        ]
    },
    {
        "document": {
            category: "protection_advice",
            sub_type: "protection_discontinued_plan"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "is_policy_replacing_existing_policies = True",
        "business_types": [
            "protection_personal",
            "protection_business"
        ]
    },
    {
        "document": {
            category: "protection_advice",
            sub_type: "in_trust_policy"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "creation_conditions": "is_death_benefit_in_trust = True",
        "business_types": [
            "protection_personal"
        ]
    },
    {
        "document": {
            category: "home_insurance",
            sub_type: "home_insurance_acceptance_terms"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "household"
        ]
    },
    {
        "document": {
            category: "home_insurance",
            sub_type: "home_insurance_application"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "household"
        ]
    },
    {
        "document": {
            category: "home_insurance",
            sub_type: "home_insurance_research"
        },
        "creation_event": "recommend_product",
        "updated_creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "household"
        ]
    },
    {
        "document": {
            category: "home_insurance",
            sub_type: "home_insurance_quote"
        },
        "creation_event": "recommend_product",
        "updated_creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "household"
        ]
    },
    {
        "document": {
            category: "home_insurance",
            sub_type: "home_insurance_suitability_report"
        },
        "creation_event": "recommend_product",
        "required_at_stages": [
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "household"
        ]
    },
    {
        "document": {
            category: "pmi_advice",
            sub_type: "pmi_quote"
        },
        "creation_event": "recommend_product",
        "updated_creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "pmi"
        ]
    },
    {
        "document": {
            category: "pmi_advice",
            sub_type: "pmi_research"
        },
        "creation_event": "recommend_product",
        "updated_creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "pmi"
        ]
    },
    {
        "document": {
            category: "pmi_advice",
            sub_type: "pmi_suitability_report"
        },
        "creation_event": "recommend_product",
        "required_at_stages": [
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "pmi"
        ]
    },
    {
        "document": {
            category: "pmi_advice",
            sub_type: "pmi_application"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "pmi"
        ]
    },
    {
        "document": {
            category: "pmi_advice",
            sub_type: "pmi_acceptance_terms"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "pmi"
        ]
    },
    {
        "document": {
            category: "pap_advice",
            sub_type: "pap_quote"
        },
        "creation_event": "recommend_product",
        "updated_creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "pap"
        ]
    },
    {
        "document": {
            category: "pap_advice",
            sub_type: "pap_research"
        },
        "creation_event": "recommend_product",
        "updated_creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "pap"
        ]
    },
    {
        "document": {
            category: "pap_advice",
            sub_type: "pap_suitability_report"
        },
        "creation_event": "recommend_product",
        "required_at_stages": [
            "create_application",
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "pap"
        ]
    },
    {
        "document": {
            category: "pap_advice",
            sub_type: "pap_application"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_submission",
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "pap"
        ]
    },
    {
        "document": {
            category: "pap_advice",
            sub_type: "pap_acceptance_terms"
        },
        "creation_event": "create_application",
        "required_at_stages": [
            "application_completion",
            "application_closure"
        ],
        "business_types": [
            "pap"
        ]
    }
] as const;