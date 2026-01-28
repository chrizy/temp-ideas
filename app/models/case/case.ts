import type { ObjectSchema, SchemaToType } from "../base_schema_types";
import { ClientConsentSchema } from "../client/client";

export const CaseConsumerConsentSchema = {
    type: "object" as const,
    label: "Case Consumer Consent",
    fields: {
        client_id: {
            type: "string" as const,
            label: "Client ID",
            validation: { required: true }
        },
        ...ClientConsentSchema.fields
    }
} as const satisfies ObjectSchema;

export type CaseConsumerConsent = SchemaToType<typeof CaseConsumerConsentSchema>;

// Original test code preserved (commented or typeless)
const testCase: {
    case_id: string;
    complete_sections: {
        personal_details_completed: boolean;
        financial_details_completed: boolean;
        employment_details_completed: boolean;
        other_details_completed: boolean;
    };
    /* 
    // Example usage of consent tracking:
    client_consents: CaseConsumerConsent[];
    */
} = {} as any;
