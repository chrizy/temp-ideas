import type { ObjectSchema, SchemaToType } from "../base_schema_types";

/**
 * Account schema
 * Represents a tenant/account in the system
 * Note: Does not use TrackingSchema since account doesn't have account_id (it IS the account)
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
            label: "DB Shard ID",
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
