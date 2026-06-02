import type { ObjectSchema, SchemaToType } from "../base_schema_types";

/** Lifecycle of account infrastructure (Shared D1 registry). */
export const AccountStatusSchema = {
    type: "enum" as const,
    label: "Status",
    options: {
        provisioning: "Provisioning",
        active: "Active",
        suspended: "Suspended",
        migration_failed: "Migration failed",
        provisioning_failed: "Provisioning failed"
    },
    validation: { required: true }
} as const;

/**
 * Account schema — stored in **Shared D1** (`accounts` table),
 * Represents a tenant stack in the platform registry. On create, the platform provisions
 * dedicated config + app Workers and an Account D1; routing metadata is stored here.
 *
 * Billing: {@link CustomerSchema} via required `customer_id` (many accounts per customer).
 *
 * Does not use TrackingSchema — the row *is* the account (no `account_id`).
 */
export const AccountSchema = {
    type: "object" as const,
    label: "Account",
    fields: {
        id: {
            type: "number" as const,
            label: "Account ID"
        },
        customer_id: {
            type: "number" as const,
            label: "Customer ID",
            validation: { required: true }
        },
        name: {
            type: "string" as const,
            label: "Account name",
            validation: { required: true, maxLength: 200 }
        },
        slug: {
            type: "string" as const,
            label: "Slug",
            validation: {
                required: true,
                maxLength: 80,
                pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
            }
        },
        status: AccountStatusSchema,
        /**
         * Optional display label for non-production stacks (e.g. "Adviser training", "UAT Q2").
         */
        label: {
            type: "string" as const,
            label: "Label",
            validation: { maxLength: 80 }
        },
        /** Stack prefix / binding id — e.g. `acct-42-example-financial`. Set when Workers exist. */
        db_shard_id: {
            type: "string" as const,
            label: "Stack binding ID",
            validation: { maxLength: 120 }
        },
        d1_database_id: {
            type: "string" as const,
            label: "D1 database ID",
            validation: { maxLength: 64 }
        },
        config_worker_name: {
            type: "string" as const,
            label: "Config Worker name",
            validation: { maxLength: 120 }
        },
        app_worker_name: {
            type: "string" as const,
            label: "App Worker name",
            validation: { maxLength: 120 }
        },
        hostname: {
            type: "string" as const,
            label: "Hostname",
            validation: { maxLength: 253 }
        },
        /** R2 document storage used by this account (megabytes). Updated by metering job. */
        docs_size_mb: {
            type: "number" as const,
            label: "Documents size (MB)",
            validation: { min: 0 }
        },
        /** Account D1 storage used (megabytes). Updated by metering job. */
        db_size_mb: {
            type: "number" as const,
            label: "Database size (MB)",
            validation: { min: 0 }
        },
        /** Auto-archive training / test stacks (ISO datetime). */
        expires_at: {
            type: "datetime" as const,
            label: "Expires at",
            validation: { allow_future: true }
        },
        created_at: {
            type: "datetime" as const,
            label: "Created at"
        },
        updated_at: {
            type: "datetime" as const,
            label: "Updated at"
        }
    }
} as const satisfies ObjectSchema;

export type Account = SchemaToType<typeof AccountSchema>;
export type AccountStatus = SchemaToType<typeof AccountStatusSchema>;
