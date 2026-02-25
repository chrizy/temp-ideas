import type { ArraySchema, ObjectSchema, SchemaToType } from "../base_schema_types";
import { ClientConsentSchema } from "../client/client";
import { TrackingSchema } from "../common/tracking";

export const CaseCompleteSectionsSchema = {
    type: "object" as const,
    label: "Case Complete Sections",
    fields: {
        personal_details_completed: { type: "boolean" as const, label: "Personal Details Completed" },
        financial_details_completed: { type: "boolean" as const, label: "Financial Details Completed" },
        employment_details_completed: { type: "boolean" as const, label: "Employment Details Completed" },
        other_details_completed: { type: "boolean" as const, label: "Other Details Completed" }
    }
} as const satisfies ObjectSchema;

export type CaseCompleteSections = SchemaToType<typeof CaseCompleteSectionsSchema>;

export const CaseSchema = {
    type: "object" as const,
    label: "Case",
    fields: {
        ...TrackingSchema.fields,

        /** List of client IDs that are linked to this case */
        client_ids: {
            type: "array" as const,
            label: "Client IDs",
            itemSchema: { type: "string" as const }
        } as const satisfies ArraySchema,
        complete_sections: {
            ...CaseCompleteSectionsSchema,
            label: "Complete Sections"
        } as const satisfies ObjectSchema
    }
} as const satisfies ObjectSchema;

export type Case = SchemaToType<typeof CaseSchema>;

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
const testCase: Case = {
    account_id: 1,
    version: 1,
    client_ids: ["123", "456"],
    complete_sections: {
        personal_details_completed: true,
        financial_details_completed: true,
        employment_details_completed: true,
        other_details_completed: true
    }
} as const;
