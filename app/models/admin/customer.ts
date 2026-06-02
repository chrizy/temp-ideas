import type { ObjectSchema, SchemaToType } from "../base_schema_types";

/** Billing relationship status for a customer (Shared D1). */
export const CustomerBillingStatusSchema = {
    type: "enum" as const,
    label: "Billing status",
    options: {
        active: "Active",
        active_trial: "Active (trial)",
        active_free: "Active (free)",
        suspended: "Suspended",
        closed: "Closed"
    },
    validation: { required: true }
} as const;

/**
 * Customer schema — stored in **Shared D1** (`customers` table).
 *
 * A **customer** is the billing entity (legal/commercial party). A customer can own
 * **many accounts** ({@link AccountSchema}) via `accounts.customer_id`.
 *
 * Accounts are tenant stacks (Worker + D1); customers are not.
 */
export const CustomerSchema = {
    type: "object" as const,
    label: "Customer",
    fields: {
        id: {
            type: "number" as const,
            label: "Customer ID"
        },
        name: {
            type: "string" as const,
            label: "Customer name",
            validation: { required: true, maxLength: 200 }
        },
        billing_status: CustomerBillingStatusSchema,
        /** Licensed user seats for billing (across linked accounts). */
        seats_count: {
            type: "number" as const,
            label: "Seats",
            validation: { required: true, min: 0 }
        },
        billing_email: {
            type: "string" as const,
            label: "Billing email",
            validation: {
                required: true,
                maxLength: 254,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            }
        },
        /** UK VAT number or other tax identifier (optional). */
        tax_reference: {
            type: "string" as const,
            label: "Tax reference",
            validation: { maxLength: 32 }
        },
        /** Invoice / remittance address (single line or structured text until promoted). */
        billing_address: {
            type: "string" as const,
            label: "Billing address",
            validation: { maxLength: 500 }
        },
        /** External billing system reference (e.g. Stripe customer id) — optional. */
        external_billing_id: {
            type: "string" as const,
            label: "External billing ID",
            validation: { maxLength: 128 }
        },
        notes: {
            type: "string" as const,
            label: "Notes",
            validation: { maxLength: 2000 }
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

export type Customer = SchemaToType<typeof CustomerSchema>;
export type CustomerBillingStatus = SchemaToType<typeof CustomerBillingStatusSchema>;
