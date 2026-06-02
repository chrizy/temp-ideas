import type { ObjectSchema, SchemaToType } from "../base_schema_types";
import { ImportedDataSchema } from "../common/import";
import { EmailSchema, PhoneSchema } from "../common/PhoneEmail";
import { TrackingSchema } from "../common/tracking";



// Business Role Options for UI Autocomplete
// Organized by business type for easy lookup
export const BusinessRoleOptions = {
    estate_agency: [
        "Sales Progresser",
        "Estate Agent",
        "Property Valuer",
        "Business Owner",
        "Manager",
        "Other"
    ],
    conveyancing_firm: [
        "Conveyancer",
        "Legal Assistant",
        "Conveyancing Administrator",
        "Paralegal",
        "Business Owner",
        "Other"
    ],
    new_build_developer: [
        "New Build Site Manager",
        "New Build Sales Consultant",
        "New Build Sales Progressor",
        "Manager",
        "Business Owner",
        "Other"
    ],
    packager_firm: [
        "Specialist Advisor",
        "Mortgage Case Handler",
        "Manager",
        "Business Owner",
        "Other"
    ],
    accountancy: [
        "Accountant",
        "Book Keeper",
        "Business Owner",
        "Manager",
        "Other"
    ],
    mortgage_lender: [
        "Mortgage Business Development Manager",
        "Mortgage Underwriter",
        "Mortgage Case Handler",
        "Mortgage Processor",
        "Manager",
        "Other"
    ],
    insurance_provider: [
        "Insurance Underwriter",
        "Insurance Sales Representative",
        "Claims Handler",
        "Manager",
        "Other"
    ],
    surveyor_firm: [
        "Chartered Property Surveyor",
        "Manager",
        "Business Owner",
        "Other"
    ],
    ifa: [
        "IFA",
        "Paraplanner",
        "Business Owner",
        "Manager",
        "Other"
    ],
    removal_company: [
        "Removals Person",
        "Manager",
        "Business Owner",
        "Other"
    ]
} as const;

// Main Individual Schema
export const IndividualSchema = {
    type: "object" as const,
    label: "Individual",
    fields: {
        ...TrackingSchema.fields,
        /** The company that the individual is associated with */
        company_id: {
            type: "number" as const,
            label: "Company ID",
        },
        /** optional branch id for an individual that is associated with a company branch */
        branch_id: {
            type: "number" as const,
            label: "Branch ID",
        },
        first_name: {
            type: "string" as const,
            label: "First Name",
            validation: {
                maxLength: 100,
                minLength: 1
            }
        },
        last_name: {
            type: "string" as const,
            label: "Last Name",
            validation: {
                maxLength: 100,
                minLength: 1
            }
        },
        phones: {
            type: "array" as const,
            itemSchema: PhoneSchema,
            label: "Phones"
        },
        emails: {
            type: "array" as const,
            itemSchema: EmailSchema,
            label: "Emails"
        },
        business_role: {
            type: "string" as const,
            label: "Business Role",
            validation: {
                maxLength: 100
            }
        },

        import: { ...ImportedDataSchema }
    }
} as const satisfies ObjectSchema;

export type Individual = SchemaToType<typeof IndividualSchema>;
export type Phone = SchemaToType<typeof PhoneSchema>;
export type EmailAddress = SchemaToType<typeof EmailSchema>;
