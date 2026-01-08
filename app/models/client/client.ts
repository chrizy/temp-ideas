import type { ObjectSchema, SchemaToType, UnionSchema, UnionVariant } from "../base_schema_types";
import { AddressSchema } from "../common/address";
import { ImportedDataSchema } from "../common/import";
import { TrackingSchema } from "../common/tracking";

// Shared nationality options list (British first)
const NationalityOptions = {
    british: "British",
    irish: "Irish",
    american: "American",
    canadian: "Canadian",
    australian: "Australian",
    new_zealand: "New Zealand",
    south_african: "South African",
    french: "French",
    german: "German",
    italian: "Italian",
    spanish: "Spanish",
    portuguese: "Portuguese",
    dutch: "Dutch",
    belgian: "Belgian",
    swiss: "Swiss",
    austrian: "Austrian",
    swedish: "Swedish",
    norwegian: "Norwegian",
    danish: "Danish",
    finnish: "Finnish",
    polish: "Polish",
    czech: "Czech",
    hungarian: "Hungarian",
    romanian: "Romanian",
    bulgarian: "Bulgarian",
    greek: "Greek",
    turkish: "Turkish",
    russian: "Russian",
    ukrainian: "Ukrainian",
    indian: "Indian",
    pakistani: "Pakistani",
    bangladeshi: "Bangladeshi",
    chinese: "Chinese",
    japanese: "Japanese",
    korean: "Korean",
    thai: "Thai",
    vietnamese: "Vietnamese",
    filipino: "Filipino",
    indonesian: "Indonesian",
    malaysian: "Malaysian",
    singaporean: "Singaporean",
    brazilian: "Brazilian",
    argentinian: "Argentinian",
    mexican: "Mexican",
    chilean: "Chilean",
    colombian: "Colombian",
    peruvian: "Peruvian",
    egyptian: "Egyptian",
    nigerian: "Nigerian",
    kenyan: "Kenyan",
    ghanaian: "Ghanaian",
    israeli: "Israeli",
    lebanese: "Lebanese",
    jordanian: "Jordanian",
    saudi_arabian: "Saudi Arabian",
    emirati: "Emirati",
    qatari: "Qatari",
    kuwaiti: "Kuwaiti",
    bahraini: "Bahraini",
    omani: "Omani",
    other: "Other"
} as const;

// Base fields shared by both variants
const ClientAddressBaseFields = {
    client_address_id: {
        type: "string" as const,
        label: "Address ID",
        validation: { required: true }
    },
    address: {
        ...AddressSchema,
        label: "Address"
    },
    residency_start_date: {
        type: "date" as const,
        label: "Date Moved In",
        validation: { minDate: "1900-01-01" }
    },
    is_current_address: {
        type: "boolean" as const,
        label: "Is Current Address?",
    },
    occupancy_type: {
        type: "enum" as const,
        label: "Occupancy Status",
        options: {
            owned_mortgage: "Owned with Mortgage",
            owned_outright: "Owned Outright",
            rented_private: "Rented (Private)",
            rented_social_housing: "Rented (Social Housing)",
            with_parents: "Living with Parents",
            with_partner_or_spouse: "Living with Partner/Spouse",
            with_friends: "Living with Friends",
            tied_accommodation: "Tied Accommodation",
            lodger: "Lodger"
        }
    }
} as const;

// Variant for current addresses (no residency_end_date)
const CurrentAddressVariant = {
    type: "object" as const,
    discriminator: "is_current_address" as const,
    value: true as const,
    fields: {
        ...ClientAddressBaseFields
    }
} as const satisfies UnionVariant<"is_current_address", true>;

// Variant for past addresses (includes residency_end_date)
const PastAddressVariant = {
    type: "object" as const,
    discriminator: "is_current_address" as const,
    value: false as const,
    fields: {
        ...ClientAddressBaseFields,
        residency_end_date: {
            type: "date" as const,
            label: "Date Moved Out",
            validation: { minDate: "1900-01-01" }
        }
    }
} as const satisfies UnionVariant<"is_current_address", false>;

export const ClientAddressSchema = {
    type: "union" as const,
    label: "Client Address",
    variants: [
        CurrentAddressVariant,
        PastAddressVariant
    ]
} as const satisfies UnionSchema;

// Company Financials Schema
const CompanyFinancialsSchema = {
    type: "object" as const,
    label: "Company Financials",
    fields: {
        business_valuation_amount: {
            type: "number" as const,
            label: "Business Valuation Amount"
        },
        business_turnover_amount: {
            type: "number" as const,
            label: "Business Turnover Amount"
        },
        financial_period_financial_year: {
            type: "date" as const,
            label: "Financial Period Financial Year"
        },
        has_can_supply_management_accounts: {
            type: "boolean" as const,
            label: "Can Supply Management Accounts"
        },
        business_financial_information_source_note: {
            type: "string" as const,
            label: "Business Financial Information Source Note",
            validation: { maxLength: 1000 }
        },
        has_business_expected_financial_situation_changes: {
            type: "boolean" as const,
            label: "Has Business Expected Financial Situation Changes"
        },
        business_expected_financial_situation_changes_note: {
            type: "string" as const,
            label: "Business Expected Financial Situation Changes Note",
            validation: { maxLength: 1000 }
        },
        business_industry_valuing_method_note: {
            type: "string" as const,
            label: "Business Industry Valuing Method Note",
            validation: { maxLength: 1000 }
        },
        business_third_party_valuers_note: {
            type: "string" as const,
            label: "Business Third Party Valuers Note",
            validation: { maxLength: 1000 }
        }
    }
} as const satisfies ObjectSchema;

// Client Health and Lifestyle Schema
const ClientHealthLifestyleSchema = {
    type: "object" as const,
    label: "Health and Lifestyle",
    fields: {
        height_in_cm: {
            type: "number" as const,
            label: "Height in cm",
            validation: { min: 0, max: 300 }
        },
        weight_in_kg: {
            type: "number" as const,
            label: "Weight in kg",
            validation: { min: 0, max: 500 }
        },
        has_any_medical_conditions: {
            type: "boolean" as const,
            label: "Has Any Medical Conditions"
        },
        medical_conditions_details_note: {
            type: "string" as const,
            label: "Medical Conditions Details Note",
            validation: { maxLength: 1000 }
        },
        has_family_member_died_or_serious_illness_before_age_65: {
            type: "boolean" as const,
            label: "Has Family Member Died or Serious Illness Before Age 65"
        },
        family_member_illness_note: {
            type: "string" as const,
            label: "Family Member Illness Note",
            validation: { maxLength: 1000 }
        },
        is_involved_in_extreme_or_dangerous_sport: {
            type: "boolean" as const,
            label: "Is Involved in Extreme or Dangerous Sport"
        },
        extreme_or_dangerous_sport_note: {
            type: "string" as const,
            label: "Extreme or Dangerous Sport Note",
            validation: { maxLength: 1000 }
        }
    }
} as const satisfies ObjectSchema;

// Base fields shared by all vulnerability detail variants
const VulnerableDetailsBaseFields = {
    id: {
        type: "string" as const,
        validation: { required: true }
    },
    vulnerability_category: {
        type: "enum" as const,
        label: "Vulnerable Category",
        options: {
            health: "Health",
            life_events: "Life Events",
            resilience: "Resilience",
            capability: "Capability"
        },
        validation: { required: true }
    },
    vulnerability_detail: {
        type: "string" as const,
        label: "Vulnerable Details",
        validation: { maxLength: 1000 }
    },
    vulnerability_action_taken: {
        type: "string" as const,
        label: "Vulnerable Action Taken",
        validation: { maxLength: 1000 }
    },
    is_vulnerability_historic: {
        type: "boolean" as const,
        label: "Is Vulnerability Historic"
    },
    vulnerability_change_status_date: {
        type: "datetime" as const,
        label: "Vulnerability End Date"
    },
    historic_vulnerability_last_updated_at: {
        type: "datetime" as const,
        label: "History Information Last Updated At"
    },
    historic_vulnerability_last_updated_by: {
        type: "string" as const,
        label: "History Information Last Updated By"
    }
} as const;

// Health category variant
const HealthVulnerabilityVariant = {
    type: "object" as const,
    discriminator: "vulnerability_category" as const,
    value: "health" as const,
    fields: {
        ...VulnerableDetailsBaseFields,
        related_vulnerability_health_key: {
            type: "enum" as const,
            label: "Vulnerable Type (Category = Health)",
            options: {
                physical_disability: "Physical Disability",
                severe_long_term_illness: "Severe Long Term Illness",
                hearing_visual: "Hearing/Visual",
                mental_health: "Mental Health",
                addiction: "Addiction",
                mental_low_capacity: "Mental Low Capacity",
                other: "Other"
            }
        }
    }
} as const satisfies UnionVariant<"vulnerability_category", "health">;

// Life Events category variant
const LifeEventsVulnerabilityVariant = {
    type: "object" as const,
    discriminator: "vulnerability_category" as const,
    value: "life_events" as const,
    fields: {
        ...VulnerableDetailsBaseFields,
        related_vulnerability_life_events_key: {
            type: "enum" as const,
            label: "Vulnerable Type (Category = Life Events)",
            options: {
                retirement: "Retirement",
                bereavement: "Bereavement",
                income_shock: "Income Shock",
                relationship_breakdown: "Relationship Breakdown",
                domestic_abuse: "Domestic Abuse",
                caring_responsibilities: "Caring Responsibilities",
                other: "Other"
            }
        }
    }
} as const satisfies UnionVariant<"vulnerability_category", "life_events">;

// Resilience category variant
const ResilienceVulnerabilityVariant = {
    type: "object" as const,
    discriminator: "vulnerability_category" as const,
    value: "resilience" as const,
    fields: {
        ...VulnerableDetailsBaseFields,
        related_vulnerability_resilience_key: {
            type: "enum" as const,
            label: "Vulnerable Type (Category = Resilience)",
            options: {
                inadequate_erratic_income: "Inadequate Erratic Income",
                over_indebtedness: "Over Indebtedness",
                low_savings: "Low Savings",
                low_emotional_resilience: "Low Emotional Resilience",
                other: "Other"
            }
        }
    }
} as const satisfies UnionVariant<"vulnerability_category", "resilience">;

// Capability category variant
const CapabilityVulnerabilityVariant = {
    type: "object" as const,
    discriminator: "vulnerability_category" as const,
    value: "capability" as const,
    fields: {
        ...VulnerableDetailsBaseFields,
        related_vulnerability_capability_key: {
            type: "enum" as const,
            label: "Vulnerable Type (Category = Capability)",
            options: {
                low_finance_knowledge: "Low Finance Knowledge",
                poor_literacy_numeracy_skills: "Poor Literacy/Numeracy Skills",
                poor_english_skills: "Poor English Skills",
                poor_digital_skills: "Poor Digital Skills",
                learning_difficulties: "Learning Difficulties",
                no_low_support_help: "No/Low Support Help",
                other: "Other"
            }
        }
    }
} as const satisfies UnionVariant<"vulnerability_category", "capability">;

// Vulnerable Details Schema (for array items) - Union type
const VulnerableDetailsSchema = {
    type: "union" as const,
    label: "Vulnerable Details",
    variants: [
        HealthVulnerabilityVariant,
        LifeEventsVulnerabilityVariant,
        ResilienceVulnerabilityVariant,
        CapabilityVulnerabilityVariant
    ]
} as const satisfies UnionSchema;

// Vulnerable Info Schema
const VulnerableInfoSchema = {
    type: "object" as const,
    label: "Vulnerability Information",
    fields: {
        is_considered_vulnerable: {
            type: "boolean" as const,
            label: "Is Vulnerable Client"
        },
        vulnerabilities: {
            type: "array" as const,
            itemSchema: VulnerableDetailsSchema,
            label: "Vulnerable Details"
        }
    }
} as const satisfies ObjectSchema;

const ProfessionalAdvisorSchema = {
    type: "object" as const,
    label: "Professional Advisor",
    fields: {
        type: {
            type: "enum" as const,
            label: "Advisor Type",
            options: {
                accountant: "Accountant",
                solicitor: "Solicitor",
                pension_advisor: "Pension Advisor"
            }
        },
        is_acting_as_tax_planners: {
            type: "boolean" as const,
            label: "Is Acting As Tax Planners"
        },
        contact_id: {
            type: "string" as const,
            label: "Contact ID",
            validation: { required: true }
        }
    }
} as const satisfies ObjectSchema;

// Individual Client Relationship Variant
const IndividualClientRelationshipVariant = {
    type: "object" as const,
    discriminator: "relationship_context" as const,
    value: "individual" as const,
    fields: {
        relationship_context: {
            type: "enum" as const,
            label: "Relationship Context",
            options: { individual: "Individual", company: "Company" },
            validation: { required: true }
        },
        client_id: {
            type: "string" as const,
            label: "Client ID"
        },
        relationship_type: {
            type: "enum" as const,
            label: "Relationship Type",
            options: {
                spouse: "Spouse",
                civil_partner: "Civil Partner",
                partner: "Partner",
                parent_child: "Parent/Child",
                other_family_member: "Other Family Member",
                friend: "Friend",
                business_associate: "Business Associate",
                ex_spouse_partner: "Ex Spouse/Partner"
            }
        }
    }
} as const satisfies UnionVariant<"relationship_context", "individual">;

// Company Client Relationship Variant
const CompanyClientRelationshipVariant = {
    type: "object" as const,
    discriminator: "relationship_context" as const,
    value: "company" as const,
    fields: {
        relationship_context: {
            type: "enum" as const,
            label: "Relationship Context",
            options: { individual: "Individual", company: "Company" },
            validation: { required: true }
        },
        client_id: {
            type: "string" as const,
            label: "Client ID"
        },
        relationship_type: {
            type: "enum" as const,
            label: "Relationship Type",
            options: {
                director: "Director",
                employee: "Employee",
                shareholder: "Shareholder",
                partner: "Partner",
                other: "Other"
            }
        },
        business_shareholding_percentage: {
            type: "number" as const,
            label: "Business Shareholding Percentage",
            validation: { min: 0, max: 100 }
        },
        is_primary_contact: {
            type: "boolean" as const,
            label: "Is Primary Contact"
        },
        job_title: {
            type: "string" as const,
            label: "Job Title",
            validation: { maxLength: 100 }
        },
        business_role_note: {
            type: "string" as const,
            label: "Business Role Note",
            validation: { maxLength: 1000 }
        }
    }
} as const satisfies UnionVariant<"relationship_context", "company">;

// Client Relationship Schema (Union)
const ClientRelationshipSchema = {
    type: "union" as const,
    label: "Client Relationship",
    variants: [
        IndividualClientRelationshipVariant,
        CompanyClientRelationshipVariant
    ]
} as const satisfies UnionSchema;

// Base fields shared by both Client variants
const ClientBaseFields = {
    client_type: {
        type: "enum" as const,
        label: "Client Type",
        options: { individual: "Individual", company: "Company" },
        validation: { required: true }
    },
    /** Advisor that owns the client record */
    primary_advisor_id: {
        type: "string" as const,
        label: "Client Primary Advisor ID",
        validation: { required: true }
    },
    /** Relationships between this client and other clients (individuals or companies) */
    client_relationships: {
        type: "array" as const,
        itemSchema: ClientRelationshipSchema,
        label: "Client Relationships"
    },
    /** The group that the client is associated with */
    group_id: {
        type: "string" as const,
        label: "Group ID",
        validation: { required: true }
    },
    import: { ...ImportedDataSchema }
} as const;

// Individual Client Variant
const IndividualClientVariant = {
    type: "object" as const,
    discriminator: "client_type" as const,
    value: "individual" as const,
    fields: {
        ...TrackingSchema.fields,
        ...ClientBaseFields,
        title: {
            type: "enum" as const,
            label: "Title",
            options: {
                mr: "Mr",
                mrs: "Mrs",
                miss: "Miss",
                ms: "Ms",
                mx: "Mx",
                dr: "Dr",
                dame: "Dame",
                father: "Father",
                madam: "Madam",
                lord: "Lord",
                sir: "Sir",
                prof: "Prof"
            }
        },
        first_name: {
            type: "string" as const,
            label: "First name",
            validation: { required: true, maxLength: 200, minLength: 2 },
        },
        middle_names: {
            type: "string" as const,
            label: "Middle names",
            validation: { maxLength: 100, minLength: 1 }
        },
        last_name: {
            type: "string" as const,
            label: "Last name",
            validation: { required: true, maxLength: 200, minLength: 2 },
        },
        dob: {
            type: "date" as const,
            label: "Date of birth",
            validation: { minDate: "1900-01-01" }
        },
        salutation: {
            type: "string" as const,
            label: "Salutation",
            validation: { maxLength: 100 }
        },
        has_name_changed: {
            type: "boolean" as const,
            label: "Has name ever changed"
        },
        previous_first_name: {
            type: "string" as const,
            label: "Previous first name",
            validation: { maxLength: 100, minLength: 1 }
        },
        previous_middle_names: {
            type: "string" as const,
            label: "Previous middle name",
            validation: { maxLength: 100, minLength: 1 }
        },
        previous_last_name: {
            type: "string" as const,
            label: "Previous last name",
            validation: { maxLength: 100, minLength: 1 }
        },
        name_changed_date: {
            type: "date" as const,
            label: "Date of name change",
            validation: { minDate: "1900-01-01" }
        },
        marital_status: {
            type: "enum" as const,
            label: "Marital Status",
            options: {
                single: "Single",
                married: "Married",
                civil_partnership: "Civil Partnership",
                cohabiting_partnership: "Cohabiting Partnership",
                separated: "Separated",
                divorced: "Divorced",
                widowed: "Widowed"
            }
        },
        citizen_status: {
            type: "enum" as const,
            label: "Citizenship Status",
            options: {
                british: "British",
                irish: "Irish",
                eu: "EU",
                eea: "EEA",
                swiss: "Swiss",
                foreign_national: "Foreign National"
            }
        },

        nicotine_use: {
            type: "enum" as const,
            label: "Has the Client Ever Smoked",
            options: {
                current_smoker: "Current Smoker",
                current_user_of_nicotine_products: "Current User of Nicotine Products",
                previously_smoked_or_used_nicotine_products: "Previously Smoked or Used Nicotine Products",
                never_smoked_or_used_nicotine_products: "Never Smoked or Used Nicotine Products"
            }
        },
        nicotine_product_type: {
            type: "enum" as const,
            label: "Nicotine Product Type",
            options: {
                cigarettes: "Cigarettes",
                e_cigarettes_vaping: "E-Cigarettes/Vaping",
                nicotine_replacement_therapy: "Nicotine Replacement Therapy",
                cigars: "Cigars",
                tobacco_pipes: "Tobacco Pipes",
                other_nicotine_product: "Other Nicotine Product"
            }
        },
        nicotine_consumption_daily_count: {
            type: "number" as const,
            label: "Nicotine Consumptions Daily Count",
            validation: { min: 0 }
        },
        nicotine_use_start_date: {
            type: "date" as const,
            label: "Nicotine Use Start Date",
            validation: { minDate: "1900-01-01" }
        },
        nicotine_use_quit_date: {
            type: "date" as const,
            label: "Nicotine Use Quit Date",
            validation: { minDate: "1900-01-01" }
        },
        sex: {
            type: "enum" as const,
            label: "Sex",
            options: {
                male: "Male",
                female: "Female",
                other: "Other",
                prefer_not_to_say: "Prefer Not to Say"
            },
        },
        gender_identity: {
            type: "enum" as const,
            label: "Gender Identity",
            options: {
                man: "Man",
                woman: "Woman",
                non_binary: "Non-Binary",
                prefer_to_self_describe: "Prefer to Self Describe",
                prefer_not_to_say: "Prefer Not to Say"
            }
        },
        self_described_gender_identity: {
            type: "string" as const,
            label: "Self Described Gender Identity",
            validation: { maxLength: 100 }
        },
        national_insurance_number: {
            type: "string" as const,
            label: "National Insurance Number",
            validation: {
                maxLength: 13, // AB 12 34 56 C (with spaces)
                pattern: /^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}$/i
            }
        },
        state_pension_age: {
            type: "number" as const,
            label: "State Pension Age",
            validation: { min: 0, max: 120 }
        },
        intended_retirement_age: {
            type: "number" as const,
            label: "Retirement Age",
            validation: { min: 0, max: 120 }
        },
        has_will: {
            type: "boolean" as const,
            label: "Does Client Have a Will"
        },
        /** The client has recorded an intended retirement age that exceeds the state pension age. Please detail information supporting the plausibility of this scenario. */
        intended_retirement_age_past_state_plausibility: {
            type: "enum" as const,
            label: "Plausibility reason",
            options: {
                will_change_to_non_manual_role: "Will Change to Non-Manual Role",
                self_employed_intends_continue_working: "Self-Employed Intends Continue Working",
                current_role_low_physical_demand_office_based: "Current Role Low Physical Demand Office Based",
                in_good_health_and_enjoys_working: "In Good Health and Enjoys Working",
                employer_supports_extended_working: "Employer Supports Extended Working",
                other: "Other"
            }
        },
        intended_retirement_age_past_state_plausibility_note: {
            type: "string" as const,
            label: "Plausibility reason note",
            validation: { maxLength: 1000 }
        },
        nationality: {
            type: "enum" as const,
            label: "Nationality",
            options: NationalityOptions
        },
        has_dual_nationality: {
            type: "boolean" as const,
            label: "Has Dual Nationality"
        },
        nationality_secondary: {
            type: "enum" as const,
            label: "Second Nationality",
            options: NationalityOptions
        },
        is_deceased: {
            type: "boolean" as const,
            label: "Is Client Deceased?"
        },
        health_and_lifestyle: {
            ...ClientHealthLifestyleSchema
        },
        vulnerability_info: {
            ...VulnerableInfoSchema
        },
        addresses: {
            type: "array" as const,
            itemSchema: ClientAddressSchema,
            label: "Addresses",
        }
    }
} as const satisfies UnionVariant<"client_type", "individual">;

// Company Client Variant
const CompanyClientVariant = {
    type: "object" as const,
    discriminator: "client_type" as const,
    value: "company" as const,
    fields: {
        ...TrackingSchema.fields,
        ...ClientBaseFields,
        business_name: {
            type: "string" as const,
            label: "Business Name",
            validation: { required: true, maxLength: 100 }
        },
        business_type: {
            type: "string" as const,
            label: "Business Type Key",
            validation: { maxLength: 100 }
        },
        business_legal_status: {
            type: "enum" as const,
            label: "Business Legal Status Key",
            options: {
                active: "Active",
                dissolved: "Dissolved",
                open: "Open",
                closed: "Closed",
                converted_closed: "Converted Closed",
                receivership: "Receivership",
                administration: "Administration",
                liquidation: "Liquidation",
                insolvency_proceedings: "Insolvency Proceedings",
                voluntary_arrangement: "Voluntary Arrangement",
                registered: "Registered",
                removed: "Removed"
            }
        },
        business_start_date: {
            type: "datetime" as const,
            label: "Business Start Date"
        },
        companies_house_number: {
            type: "string" as const,
            label: "Companies House Number",
            validation: {
                pattern: /^[0-9]{8}$/,
                maxLength: 8,
                minLength: 8
            }
        },
        business_sic_codes: {
            type: "array" as const,
            itemSchema: {
                type: "string" as const,
                validation: { maxLength: 100 }
            },
            label: "Business SIC Code Keys"
        },
        financial_year_end_day: {
            type: "number" as const,
            label: "Financial Year End Day",
            validation: { min: 1, max: 31 }
        },
        financial_year_end_month: {
            type: "enum" as const,
            label: "Financial Year End Month Key",
            options: {
                "1": "January",
                "2": "February",
                "3": "March",
                "4": "April",
                "5": "May",
                "6": "June",
                "7": "July",
                "8": "August",
                "9": "September",
                "10": "October",
                "11": "November",
                "12": "December"
            }
        },
        /** Array of financial records for the company */
        financials: {
            type: "array" as const,
            itemSchema: CompanyFinancialsSchema,
            label: "Financials"
        },
        business_address: {
            ...AddressSchema,
            label: "Business Address"
        },
        correspondence_address: {
            ...AddressSchema,
            label: "Correspondence Address"
        },
        nature_of_business_note: {
            type: "string" as const,
            label: "Nature of Business Note",
            validation: { maxLength: 1000 }
        },
        professional_advisors: {
            type: "array" as const,
            itemSchema: ProfessionalAdvisorSchema,
            label: "Professional Advisors"
        }
    }
} as const satisfies UnionVariant<"client_type", "company">;

/** Represents a client - either an individual person or a company. */
export const ClientSchema = {
    type: "union" as const,
    label: "Client",
    description: (client: any) => {
        if (!client) return "Client";

        if (client.client_type === "company") {
            return client.business_name || "Unnamed Company";
        } else {
            const firstName = client.first_name || "";
            const lastName = client.last_name || "";
            const name = `${firstName} ${lastName}`.trim();
            return name || "Unnamed Client";
        }
    },
    variants: [
        IndividualClientVariant,
        CompanyClientVariant
    ]
} as const satisfies UnionSchema;

export type Client = SchemaToType<typeof ClientSchema>;

export type ClientAddress = SchemaToType<typeof ClientAddressSchema>;