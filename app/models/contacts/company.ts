import type { ObjectSchema, SchemaToType } from "../base_schema_types";
import { AddressSchema } from "../common/address";
import { ImportedDataSchema } from "../common/import";
import { EmailSchema, PhoneSchema } from "../common/PhoneEmail";
import { TrackingSchema } from "../common/tracking";

// Phone Number and Department Schema
const PhoneNumberAndDepartmentSchema = {
    type: "object" as const,
    label: "Phone Number and Department",
    fields: {
        ...PhoneSchema.fields,
        department: {
            type: "string" as const,
            label: "Department",
            validation: { maxLength: 100 }
        }
    }
} as const satisfies ObjectSchema;

// Email and Department Schema
const EmailAndDepartmentSchema = {
    type: "object" as const,
    label: "Email and Department",
    fields: {
        ...EmailSchema.fields,
        department: {
            type: "string" as const,
            label: "Department",
            validation: { maxLength: 100 }
        }
    }
} as const satisfies ObjectSchema;

// Company Referral Partner Schema
const CompanyReferralPartnerSchema = {
    type: "object" as const,
    label: "Company Referral Partner",
    fields: {
        /** If Active, Advisors will be able to assign Referrals to this firm */
        referral_partner_status: {
            type: "enum" as const,
            label: "Referral Partner Status",
            options: {
                inactive: "Inactive",
                active: "Active"
            }
        }
    }
} as const satisfies ObjectSchema;

// Company Introducer Request Schema
const CompanyIntroducerRequestSchema = {
    type: "object" as const,
    label: "Company Introducer Request",
    fields: {
        company_introducer_parent_status: {
            type: "enum" as const,
            label: "Introducer Network Status",
            options: {
                pending: "Pending",
                approved: "Approved",
                rejected: "Rejected",
                deactivated: "Deactivated"
            }
        },
        company_introducer_management_request_status: {
            type: "enum" as const,
            label: "Introducer Management Request Status",
            options: {
                request_set_up: "Request Set Up",
                request_approved: "Request Approved",
                request_rejected: "Request Rejected",
                request_cancelled: "Request Cancelled"
            }
        },
        requested_by_user_id: {
            type: "string" as const,
            label: "Requested By User",
            validation: {
                required: true,
                maxLength: 100,
                minLength: 1
            }
        },
        requested_at: {
            type: "datetime" as const,
            label: "Requested At",
            validation: { required: true }
        },
        note: {
            type: "string" as const,
            label: "Company Introducer Management Request Note",
            validation: { maxLength: 1000 }
        }
    }
} as const satisfies ObjectSchema;

// Company Introducer Schema
const CompanyIntroducerSchema = {
    type: "object" as const,
    label: "Company Introducer",
    fields: {
        /** If Active,This company can introduce clients to your firm */
        introducer_status: {
            type: "enum" as const,
            label: "Introducer Status",
            options: {
                inactive: "Inactive",
                active: "Active"
            }
        },
        /** if management by parent group is required */
        introducer_parent_status: {
            type: "enum" as const,
            label: "Introducer Parent Status",
            options: {
                pending: "Pending",
                approved: "Approved",
                rejected: "Rejected",
                deactivated: "Deactivated"
            }
        },
        requests: {
            type: "array" as const,
            itemSchema: CompanyIntroducerRequestSchema,
            label: "Requests"
        }
    }
} as const satisfies ObjectSchema;

// Company Branch Schema
const CompanyBranchSchema = {
    type: "object" as const,
    label: "Company Branch",
    fields: {
        branch_id: {
            type: "string" as const,
            label: "Branch ID",
            validation: {
                required: true,
                minLength: 1,
                maxLength: 100
            }
        },
        business_branch_name: {
            type: "string" as const,
            label: "Business Branch Name",
            validation: { maxLength: 100 }
        },
        address: {
            ...AddressSchema,
            label: "Address"
        },
        phones: {
            type: "array" as const,
            itemSchema: PhoneNumberAndDepartmentSchema,
            label: "Phones"
        },
        emails: {
            type: "array" as const,
            itemSchema: EmailAndDepartmentSchema,
            label: "Emails"
        }
    }
} as const satisfies ObjectSchema;

// Main Company Schema
export const CompanySchema = {
    type: "object" as const,
    label: "Company",
    fields: {
        ...TrackingSchema.fields,
        name: {
            type: "string" as const,
            label: "Company Name",
            validation: {
                required: true,
                maxLength: 200,
                minLength: 1
            }
        },
        address: {
            ...AddressSchema,
            label: "Address"
        },
        company_type: {
            type: "enum" as const,
            label: "Company Type",
            options: {
                estate_agent: "Estate Agent",
                solicitor: "Solicitor",
                accountant: "Accountant",
                mortgage_lender: "Mortgage Lender",
                insurance_provider: "Insurance Provider",
                surveyor: "Surveyor",
                removal_company: "Removal Company",
                new_build_developer: "New Build Developer",
                packager: "Packager",
                ifa: "IFA"
            }
        },
        website_url: {
            type: "string" as const,
            label: "Website URL",
            validation: {
                maxLength: 2048, // Common URL max length
                // Basic URL pattern (allows http/https/ftp and common URL characters)
                pattern: /^https?:\/\/.+/i
            }
        },
        phones: {
            type: "array" as const,
            itemSchema: PhoneNumberAndDepartmentSchema,
            label: "Phones"
        },
        emails: {
            type: "array" as const,
            itemSchema: EmailAndDepartmentSchema,
            label: "Emails"
        },
        referral_partner: {
            ...CompanyReferralPartnerSchema,
            label: "Referral Partner"
        },
        introducer: {
            ...CompanyIntroducerSchema,
            label: "Introducer"
        },
        branches: {
            type: "array" as const,
            itemSchema: CompanyBranchSchema,
            label: "Branches"
        },
        import: { ...ImportedDataSchema }
    }
} as const satisfies ObjectSchema;

export type Company = SchemaToType<typeof CompanySchema>;
export type CompanyReferralPartner = SchemaToType<typeof CompanyReferralPartnerSchema>;
export type CompanyIntroducer = SchemaToType<typeof CompanyIntroducerSchema>;
export type CompanyIntroducerRequest = SchemaToType<typeof CompanyIntroducerRequestSchema>;
export type CompanyBranch = SchemaToType<typeof CompanyBranchSchema>;
export type PhoneNumberAndDepartment = SchemaToType<typeof PhoneNumberAndDepartmentSchema>;
export type EmailAndDepartment = SchemaToType<typeof EmailAndDepartmentSchema>;
