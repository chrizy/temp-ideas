/** use to extend other schemas with tracking metadata */
export const TrackingSchema = {
    fields: {
        /** Database auto-generated ID - not required on create, always present on read */
        id: {
            type: "string" as const,
        },
        /** Tenant/Account ID - identifies which account owns this record */
        account_id: {
            type: "number" as const,
            label: "Account ID",
            validation: { required: true }
        },
        updated_by: {
            type: "string" as const,
            label: "Last Updated By",
        },
        updated_at: {
            type: "datetime" as const,
            label: "Last Updated At"
        },
        created_by: {
            type: "string" as const,
            label: "Created By",
        },
        created_at: {
            type: "datetime" as const,
            label: "Created At"
        },
        created_by_user_type: {
            type: "enum" as const,
            label: "Created By User Type Key",
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
            validation: { required: false }
        },
        deleted_by_user_type_key: {
            type: "string" as const,
            label: "Deleted By User Type Key"
        }
    }
} as const;
