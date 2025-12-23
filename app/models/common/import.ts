import type { ObjectSchema } from "../base_schema_types";

/** Records source of imported data */
export const ImportedDataSchema = {
    type: "object" as const,
    fields: {
        source: {
            type: "string" as const,
            label: "Source Provider Name"
        },
        source_id: {
            type: "string" as const,
            label: "Source Reference Id"
        }
    }
} as const satisfies ObjectSchema;

