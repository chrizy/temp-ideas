import type { ObjectSchema, SchemaToType } from "../base_schema_types";
import { TrackingSchema } from "../common/tracking";
import type { DocumentTypeWithMeta } from "./document_metadata";
import { DocumentSubTypeSchema } from "./document_types";

function documentValidation(value: any): boolean | string {
    if (!value || typeof value !== "object") return "Invalid document payload";

    const applicationId = value.application_id ?? null;
    const caseId = value.case_id ?? null;
    const requirementId = value.requirement_id ?? null;

    if (applicationId && (!caseId || !requirementId)) {
        return "When application_id is set, case_id and requirement_id must also be set.";
    }

    return true;
}

/**
 * Document record, stored in D1. Data is stored in R2. using same id as the record in D1.
 */
export const DocumentSchema = {
    type: "object" as const,
    label: "Document",
    validation: { custom: documentValidation },
    fields: {
        ...TrackingSchema.fields,

        document_type: {
            ...DocumentSubTypeSchema,
            label: "Document Type",
            validation: { required: true }
        },

        /**
         * `client_ids` must have at least one entry.
         */
        client_ids: {
            type: "array" as const,
            label: "Client IDs",
            validation: { required: true, minLength: 1 },
            itemSchema: {
                type: "number" as const,
                validation: { required: true }
            }
        },
        case_id: {
            type: "string" as const,
            label: "Case ID",
            validation: { minLength: 1 }
        },
        requirement_id: {
            type: "string" as const,
            label: "Requirement ID",
            validation: { minLength: 1 }
        },
        application_id: {
            type: "string" as const,
            label: "Application ID",
            validation: { minLength: 1 }
        },

        file_name: {
            type: "string" as const,
            label: "Original File Name",
            validation: { required: true, minLength: 1 }
        },
        mime_type: {
            type: "string" as const,
            label: "MIME Type",
        },
        size_bytes: {
            type: "number" as const,
            label: "File Size (bytes)",
        },
        uploaded_at: {
            type: "datetime" as const,
            label: "Uploaded At",
            validation: { required: true }
        },
    }
} as const satisfies ObjectSchema;

export type Document = Omit<SchemaToType<typeof DocumentSchema>, "document_type"> & {
    document_type: DocumentTypeWithMeta;
};

