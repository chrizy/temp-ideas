import type { EnumSchema } from "../base_schema_types";

export const BusinessTypesSchema = {
    type: "enum" as const,
    label: "Business Type",
    options: {
        residential_mortgage: "Residential Mortgage",
        btl_mortgage: "BTL Mortgage",
        equity_release: "Equity Release",
        bridging: "Bridging",
        secured_loan: "Secured Loan",
        protection_personal: "Personal Protection",
        protection_business: "Business Protection",
        asu: "Accidental Sickness Unemployment",
        home_insurance: "Home Insurance",
        pap: "Personal Accident Protection",
        pmi: "Private Medical Insurance?"
    }
} as const satisfies EnumSchema;
