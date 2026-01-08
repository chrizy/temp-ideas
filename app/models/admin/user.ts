import type { ObjectSchema, SchemaToType, EnumSchema } from "../base_schema_types";
import { TrackingSchema } from "../common/tracking";

// Enums
export const UserCalendarSyncSchema = {
    type: "enum" as const,
    label: "Calendar Sync",
    options: {
        None: "None",
        MicrosoftGraph: "Microsoft Graph",
        MicrosoftEWS: "Microsoft EWS",
        Google: "Google",
        Mock: "Mock"
    }
} as const satisfies EnumSchema;

// Supporting types
export const LoginDetailSchema = {
    type: "object" as const,
    fields: {
        enabled: { type: "boolean" as const, label: "Enabled" },
        email: {
            type: "string" as const,
            label: "Email",
            validation: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
        },
        /** Password is hashed using bcrypt */
        password: {
            type: "string" as const,
            label: "Password",
            validation: { required: true }
        },
        /** The display name is the full name of the user as it appears in the system */
        display_name: { type: "string" as const, label: "Display Name" },
        locked_out: { type: "boolean" as const, label: "Locked Out" },
        login_failed_attempts: { type: "number" as const, label: "Login Failed Attempts" },
        password_change_date: { type: "string" as const, label: "Password Change Date" }, // DateTime as ISO string
        reset_password_on_next_login: { type: "boolean" as const, label: "Reset Password On Next Login" }
    }
} as const satisfies ObjectSchema;

export const InitialCheckSchema = {
    type: "object" as const,
    fields: {
        target: { type: "number" as const, label: "Target" },
        completed: { type: "number" as const, label: "Completed" }
    }
} as const satisfies ObjectSchema;

export const FinancialServiceRolesSchema = {
    type: "object" as const,
    fields: {
        can_administer_sale: { type: "boolean" as const, label: "Can Administer Sale" },
        can_edit_fact_find: { type: "boolean" as const, label: "Can Edit Fact Find" },
        can_perform_compliance_reviews: { type: "boolean" as const, label: "Can Perform Compliance Reviews" }
    }
} as const satisfies ObjectSchema;

export const AdvisorSchema = {
    type: "object" as const,
    fields: {
        default_admin_user_id: { type: "string" as const, label: "Default Admin User ID" }, // Guid as string
        default_compliance_checker_user_id: { type: "string" as const, label: "Default Compliance Checker User ID" }, // Guid as string
        development_check_percentage: { type: "number" as const, label: "Development Check Percentage" },
        mortgage_initial_check: { ...InitialCheckSchema, label: "Mortgage Initial Check" },
        protection_initial_check: { ...InitialCheckSchema, label: "Protection Initial Check" },
        home_initial_check: { ...InitialCheckSchema, label: "Home Initial Check" },
        ppi_initial_check: { ...InitialCheckSchema, label: "PPI Initial Check" }
    }
} as const satisfies ObjectSchema;

// Main User schema
export const UserSchema = {
    type: "object" as const,
    fields: {
        group_id: {
            type: "string" as const,
            label: "Group ID",
            validation: { required: true }
        },
        company_group_id: { type: "string" as const, label: "Company Group ID" },
        login_detail: {
            ...LoginDetailSchema,
            label: "Login Detail",
            validation: { required: true }
        },
        title: { type: "string" as const, label: "Title" },
        first_name: { type: "string" as const, label: "First Name" },
        last_name: { type: "string" as const, label: "Last Name" },
        start_date: { type: "string" as const, label: "Start Date" }, // DateTime as ISO string
        end_date: { type: "string" as const, label: "End Date" }, // DateTime as ISO string
        email: { type: "string" as const, label: "Email" },
        work_tel: { type: "string" as const, label: "Work Telephone" },
        mobile_tel: { type: "string" as const, label: "Mobile Telephone" },
        job_title: { type: "string" as const, label: "Job Title" },
        notes: { type: "string" as const, label: "Notes" },
        ...TrackingSchema.fields,
        manager_user_id: { type: "string" as const, label: "Manager User ID" }, // Guid as string
        /**
         * User can access data for all users in their group
         */
        has_access_to_all_users_in_group: { type: "boolean" as const, label: "Has Access To All Users In Group" },
        /**
         * List of user IDs, this user can access in the group
         */
        has_access_to_user_ids: {
            type: "array" as const,
            label: "Has Access To data assigned to Users",
            itemSchema: { type: "string" as const }
        },
        /**
         * User can access data for all sub groups
         */
        has_access_to_all_sub_groups: { type: "boolean" as const, label: "Has Access To All Sub Groups" },
        /**
         * If HasAccessToAllSubGroups is false then contain list of sub groups user can access
         * list of Group IDs Linkages, this user can access - e.g.  1.2.3, 1.2.4,
         * An Admin user for example in head office may only have access to certain sub groups (1 level only).
         */
        has_access_to_sub_group_linkages: {
            type: "array" as const,
            label: "Has Access To Sub Group Linkages",
            itemSchema: { type: "string" as const }
        },
        is_advisor: { type: "boolean" as const, label: "Is Advisor" },
        advisor: { ...AdvisorSchema, label: "Advisor" },
        financial_service_roles: { ...FinancialServiceRolesSchema, label: "Financial Service Roles" },
        user_calendar_sync: { ...UserCalendarSyncSchema, label: "User Calendar Sync" },
        // Roles
        advanced_admin: { type: "boolean" as const, label: "Advanced Admin" },
        can_edit_groups: { type: "boolean" as const, label: "Can Edit Groups" },
        can_edit_users: { type: "boolean" as const, label: "Can Edit Users" },
        can_edit_templates: { type: "boolean" as const, label: "Can Edit Templates" }
    }
} as const satisfies ObjectSchema;

export type User = SchemaToType<typeof UserSchema>;
export type LoginDetail = SchemaToType<typeof LoginDetailSchema>;
export type Advisor = SchemaToType<typeof AdvisorSchema>;
export type FinancialServiceRoles = SchemaToType<typeof FinancialServiceRolesSchema>;
export type InitialCheck = SchemaToType<typeof InitialCheckSchema>;
export type UserCalendarSync = SchemaToType<typeof UserCalendarSyncSchema>;

