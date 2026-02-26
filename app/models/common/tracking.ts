/** use to extend other schemas with tracking metadata */
export const TrackingSchema = {
    fields: {
        /** Database auto-generated ID - always a number, always exists in DB */
        id: {
            type: "number" as const,
            validation: { required: true }
        },
        /** Tenant/Account ID - identifies which account owns this record */
        account_id: {
            type: "number" as const,
            label: "Account ID",
            validation: { required: true }
        },
        updated_by: {
            type: "user_id" as const,
            label: "Last Updated By",
            validation: { required: true }
        },
        updated_at: {
            type: "datetime" as const,
            label: "Last Updated At",
            validation: { required: true }
        },
        created_by: {
            type: "user_id" as const,
            label: "Created By",
            validation: { required: true }
        },
        created_at: {
            type: "datetime" as const,
            label: "Created At",
            validation: { required: true }
        },
        created_by_user_type: {
            type: "enum" as const,
            label: "Created By User Type Key",
            validation: { required: true },
            options: {
                client: "Client",
                introducer: "Introducer",
                user: "User"
            }
        },
        last_updated_by_user_type: {
            type: "enum" as const,
            label: "Last Updated By User Type Key",
            options: {
                client: "Client",
                introducer: "Introducer",
                user: "User"
            }
        },
        /** version of the record, incremented on every save */
        version: {
            type: "number" as const,
            label: "Version",
            validation: { required: true }
        },
        is_deleted: {
            type: "boolean" as const,
            label: "Is Deleted",
        },
        deleted_by_user_type_key: {
            type: "string" as const,
            label: "Deleted By User Type Key"
        }
    }
} as const;
