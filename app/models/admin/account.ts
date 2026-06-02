import type { ObjectSchema, SchemaToType } from "../base_schema_types";

/**
 * Account schema — stored in **Shared D1** (`accounts` table), not in a per-account D1.
 * Represents a tenant in the platform registry. On create, the platform provisions a
 * dedicated Worker + Account D1; `db_shard_id` identifies that binding for routing.
 * Note: Does not use TrackingSchema since account doesn't have account_id (it IS the account).
 */
export const AccountSchema = {
    type: "object" as const,
    label: "Account",
    fields: {
        id: {
            type: "number" as const,
            label: "Account ID"
        },
        name: {
            type: "string" as const,
            label: "Account Name",
            validation: { required: true, maxLength: 200 }
        },
        db_shard_id: {
            type: "string" as const,
            label: "Account stack binding ID",
            validation: { required: true }
        },
        is_active: {
            type: "boolean" as const,
            label: "Is Active",
            validation: { required: false }
        },
        created_at: {
            type: "datetime" as const,
            label: "Created At"
        },
        updated_at: {
            type: "datetime" as const,
            label: "Updated At"
        }
    }
} as const satisfies ObjectSchema;

export type Account = SchemaToType<typeof AccountSchema>;
