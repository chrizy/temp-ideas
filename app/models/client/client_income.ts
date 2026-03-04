import type { ObjectSchema, SchemaToType, UnionSchema, UnionVariant } from "../base_schema_types";
import { AddressSchema } from "../common/address";
import { ImportedDataSchema } from "../common/import";
import { TrackingSchema } from "../common/tracking";

/** Return display label for an enum value, or empty string if none. */
function optionLabel(options: Record<string, string>, value: unknown): string {
    if (value == null || value === "") return "";
    const key = typeof value === "string" || typeof value === "number" ? String(value) : "";
    if (!key) return "";
    return options[key] ?? "";
}

/** Format a number as currency for descriptions; returns "" if not a number. */
function formatAmount(value: unknown): string {
    if (typeof value === "number" && Number.isFinite(value)) return `£${value}`;
    return "";
}

const FrequencyOptions = {
    weekly: "Weekly",
    fortnightly: "Fortnightly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    half_yearly: "Half Yearly",
    yearly: "Yearly"
} as const;

const EmploymentContractTypeOptions = {
    permanent: "Permanent",
    fixed_term: "Fixed Term",
    temporary: "Temporary",
    zero_hours: "Zero Hours",
    piece_work: "Piece Work",
    sub_contracted: "Sub Contracted",
    agency_worker: "Agency Worker"
} as const;

const EmployedIncomeOtherTypeOptions = {
    overtime: "Overtime",
    bonus: "Bonus",
    commission: "Commission",
    car_allowance: "Car Allowance",
    shift_allowance: "Shift Allowance",
    large_town_allowance: "Large Town Allowance",
    other_income_allowance: "Other Income Allowance",
    mortgage_subsidies_housing_allowance: "Mortgage Subsidies / Housing Allowance",
    flight_pay: "Flight Pay"
} as const;

const EmploymentDeductionTypeOptions = {
    pension_contribution: "Pension Contribution",
    sharesave: "Sharesave",
    season_ticket_loan: "Season Ticket Loan",
    employee_loan_repayments: "Employee Loan Repayments",
    health_insurance_premiums: "Health Insurance Premiums",
    salary_sacrifice_car_scheme: "Salary Sacrifice Car Scheme",
    other_employment_deduction: "Other Employment Deduction"
} as const;

const SickPayFrequencyOptions = {
    days: "Days",
    weeks: "Weeks",
    months: "Months"
} as const;

const ExpenditureFrequencyOptions = {
    monthly: "Monthly",
    annually: "Annually",
    weekly: "Weekly",
    quarterly: "Quarterly",
    half_yearly: "Half Yearly"
} as const;

const IncomeRegularityOptions = {
    regular: "Regular",
    irregular: "Irregular"
} as const;

// ─── Common fields: amount + frequency (used by benefit, pension, rental, other details) ───

const IncomeAmountFrequencyFields = {
    income_amount: { type: "number" as const, label: "Income amount" },
    income_frequency: {
        type: "enum" as const,
        label: "Frequency",
        options: FrequencyOptions
    }
} as const;

// ─── Nested schemas: Employed ───────────────────────────────────────────────

const MonthOptions = { "1": "Jan", "2": "Feb", "3": "Mar", "4": "Apr", "5": "May", "6": "Jun", "7": "Jul", "8": "Aug", "9": "Sep", "10": "Oct", "11": "Nov", "12": "Dec" } as const;

const IncomeEmployedOtherAllowancePeriodSchema = {
    type: "object" as const,
    label: "Income allowance period",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const amt = formatAmount(v.income_amount);
            const month = optionLabel(MonthOptions, v.income_payment_month);
            const year = v.income_payment_year ?? "";
            return [month, year].filter(Boolean).join(" ") || amt || "Allowance period";
        }
        return "Allowance period";
    },
    fields: {
        id: { type: "string" as const },
        income_amount: { type: "number" as const, label: "Income Amount" },
        income_payment_month: {
            type: "enum" as const,
            label: "Month",
            options: MonthOptions
        },
        income_payment_year: { type: "number" as const, label: "Year" }
    }
} as const satisfies ObjectSchema;

const IncomeRecordDetailsSalarySchema = {
    type: "object" as const,
    label: "Gross basic salary",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const amt = formatAmount(v.income_amount);
            const freq = optionLabel(FrequencyOptions, v.income_frequency);
            return [amt, freq].filter(Boolean).join(" ") || "Gross basic salary";
        }
        return "Gross basic salary";
    },
    fields: {
        currency: { type: "string" as const, label: "Currency" },
        income_amount: { type: "number" as const, label: "Income amount" },
        income_frequency: {
            type: "enum" as const,
            label: "Frequency",
            options: FrequencyOptions
        },
        income_is_paid_regularly: {
            type: "enum" as const,
            label: "Regular / Irregular",
            options: IncomeRegularityOptions
        },
        income_can_be_evidenced: { type: "boolean" as const, label: "Can income be evidenced?" },
        income_history: {
            type: "array" as const,
            itemSchema: IncomeEmployedOtherAllowancePeriodSchema,
            label: "Income history (previous 3 months)"
        }
    }
} as const satisfies ObjectSchema;

const IncomeRecordDetailsOtherSchema = {
    type: "object" as const,
    label: "Other income / allowance",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const type = optionLabel(EmployedIncomeOtherTypeOptions, v.employed_income_other_type);
            const amt = formatAmount(v.income_amount);
            return [type, amt].filter(Boolean).join(" – ") || "Other income";
        }
        return "Other income";
    },
    fields: {
        id: { type: "string" as const },
        employed_income_other_type: {
            type: "enum" as const,
            label: "Additional income type",
            options: EmployedIncomeOtherTypeOptions
        },
        currency: { type: "string" as const, label: "Currency" },
        income_amount: { type: "number" as const, label: "Income amount" },
        income_frequency: {
            type: "enum" as const,
            label: "Frequency",
            options: FrequencyOptions
        },
        income_is_paid_regularly: {
            type: "enum" as const,
            label: "Regular / Irregular",
            options: IncomeRegularityOptions
        },
        income_can_be_evidenced: { type: "boolean" as const, label: "Can income be evidenced?" },
        income_history: {
            type: "array" as const,
            itemSchema: IncomeEmployedOtherAllowancePeriodSchema,
            label: "Income history (previous 3 months)"
        }
    }
} as const satisfies ObjectSchema;

const IncomeEmployedSickPayPartSchema = {
    type: "object" as const,
    label: "Sick pay part",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const pct = typeof v.employer_sick_pay_percentage === "number" ? `${v.employer_sick_pay_percentage}%` : "";
            const count = typeof v.employer_sick_pay_period_count === "number" ? String(v.employer_sick_pay_period_count) : "";
            const freq = optionLabel(SickPayFrequencyOptions, v.employer_sick_pay_frequency);
            return [pct, count, freq].filter(Boolean).join(" ") || "Sick pay";
        }
        return "Sick pay";
    },
    fields: {
        id: { type: "string" as const },
        employer_sick_pay_period_count: { type: "number" as const, label: "Sick pay paid for (period count)" },
        employer_sick_pay_frequency: {
            type: "enum" as const,
            label: "Frequency",
            options: SickPayFrequencyOptions
        },
        employer_sick_pay_percentage: { type: "number" as const, label: "Sick pay amount (%)" }
    }
} as const satisfies ObjectSchema;

const IncomeEmployedSalaryDeductionsSchema = {
    type: "object" as const,
    label: "Salary deduction",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const type = optionLabel(EmploymentDeductionTypeOptions, v.expenditure_applicant_employment_deduction_type);
            const amt = formatAmount(v.expenditure_amount);
            return [type, amt].filter(Boolean).join(" – ") || "Salary deduction";
        }
        return "Salary deduction";
    },
    fields: {
        id: { type: "string" as const },
        expenditure_applicant_employment_deduction_type: {
            type: "enum" as const,
            label: "Deduction type",
            options: EmploymentDeductionTypeOptions
        },
        expenditure_amount: { type: "number" as const, label: "Amount" },
        is_expenditure_paid_before_tax: { type: "boolean" as const, label: "Paid before tax?" },
        expenditure_frequency: {
            type: "enum" as const,
            label: "Frequency",
            options: ExpenditureFrequencyOptions
        },
        expenditure_applicant_employment_deduction_details_note: {
            type: "string" as const,
            label: "Description",
            validation: { maxLength: 1000 }
        }
    }
} as const satisfies ObjectSchema;

// ─── Nested schemas: Sole trader ─────────────────────────────────────────────

const IncomeSoleTraderIncomeSchema = {
    type: "object" as const,
    label: "Sole trader income",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const amt = formatAmount(v.net_profit_sole_trader_amount);
            const year = v.financial_year_ending_date ? String(v.financial_year_ending_date).slice(0, 4) : "";
            if (amt && year) return `${amt} (year ${year})`;
            if (amt) return amt;
            if (year) return `Year ${year}`;
        }
        return "Sole trader income";
    },
    fields: {
        id: { type: "string" as const },
        net_profit_sole_trader_amount: { type: "number" as const, label: "Net profit" },
        financial_year_ending_date: { type: "datetime" as const, label: "Financial year ending date" },
        is_financial_projected: { type: "boolean" as const, label: "Is this a projection?" },
        income_can_be_evidenced: { type: "boolean" as const, label: "Can income be evidenced?" }
    }
} as const satisfies ObjectSchema;

// ─── Nested schemas: Ltd director & partnership (SelfEmployedIncome) ───────────

const SelfEmployedIncomeSchema = {
    type: "object" as const,
    label: "Self employed income",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const salary = formatAmount(v.directors_gross_salary_amount);
            const div = formatAmount(v.directors_dividend_amount);
            const salaryStr = salary ? `${salary} salary` : "";
            const divStr = div ? `${div} dividend` : "";
            return [salaryStr, divStr].filter(Boolean).join(", ") || "Self employed income";
        }
        return "Self employed income";
    },
    fields: {
        directors_gross_salary_amount: { type: "number" as const, label: "Directors salary" },
        ltd_company_net_profit_before_corporation_tax_amount: { type: "number" as const, label: "Business net profit (before corp. tax)" },
        ltd_company_net_profit_after_corporation_tax_amount: { type: "number" as const, label: "Business net profit (after corp. tax)" },
        directors_dividend_amount: { type: "number" as const, label: "Directors dividend" },
        directors_share_of_net_profit_before_corporation_tax_amount: { type: "number" as const, label: "Directors share (before corp. tax)" },
        directors_share_of_net_profit_after_corporation_tax_amount: { type: "number" as const, label: "Directors share (after corp. tax)" }
    }
} as const satisfies ObjectSchema;

const IncomePartnershipIncomeSchema = {
    type: "object" as const,
    label: "Partnership income",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const shareAmt = formatAmount(v.share_of_net_profit_partnership_amount);
            const totalAmt = formatAmount(v.partnership_net_profit_amount);
            const share = shareAmt ? `${shareAmt} share` : "";
            const total = totalAmt ? `${totalAmt} total` : "";
            return [share, total].filter(Boolean).join(" of ") || "Partnership income";
        }
        return "Partnership income";
    },
    fields: {
        id: { type: "string" as const },
        partnership_net_profit_amount: { type: "number" as const, label: "Partnerships net profit" },
        share_of_net_profit_partnership_amount: { type: "number" as const, label: "Individuals share of partnerships net profit" }
    }
} as const satisfies ObjectSchema;

const IncomeLimitedCompanyIncomeSchema = {
    type: "object" as const,
    label: "Limited company income period",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const year = v.financial_year_ending_date ? String(v.financial_year_ending_date).slice(0, 4) : "";
            const pct = typeof v.business_shareholding_percentage === "number" ? `${v.business_shareholding_percentage}%` : "";
            return [year, pct].filter(Boolean).join(" · ") || "Ltd income period";
        }
        return "Ltd income period";
    },
    fields: {
        id: { type: "string" as const },
        financial_year_ending_date: { type: "datetime" as const, label: "Financial year ending date" },
        business_shareholding_percentage: { type: "number" as const, label: "Clients shareholding %" },
        is_financial_projected: { type: "boolean" as const, label: "Is this a projection?" },
        income_can_be_evidenced: { type: "boolean" as const, label: "Can income be evidenced?" },
        self_employed_income: { ...SelfEmployedIncomeSchema, label: "Self employed income" }
    }
} as const satisfies ObjectSchema;

const IncomeBusinessFinancialPeriodSchema = {
    type: "object" as const,
    label: "Business financial period",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const year = v.financial_year_ending_date ? String(v.financial_year_ending_date).slice(0, 4) : "";
            return year ? `Year ${year}` : "Financial period";
        }
        return "Financial period";
    },
    fields: {
        id: { type: "string" as const },
        financial_year_ending_date: { type: "datetime" as const, label: "Financial year ending date" },
        is_financial_projected: { type: "boolean" as const, label: "Is this a projection?" },
        income_can_be_evidenced: { type: "boolean" as const, label: "Can income be evidenced?" },
        self_employed_income: { ...IncomePartnershipIncomeSchema, label: "Partnership income" }
    }
} as const satisfies ObjectSchema;

// ─── Nested schemas: Benefit, Pension, Rental, Other ────────────────────────

const BenefitTypeOptions: Record<string, string> = {
    attendance_allowance_benefit: "Attendance Allowance",
    carers_allowance_benefit: "Carers Allowance",
    child_benefit: "Child Benefit",
    child_tax_credit_benefit: "Child Tax Credit",
    childcare_voucher_benefit: "Childcare Voucher",
    constance_attendance_allowance_benefit: "Constant Attendance Allowance",
    disability_living_allowance_benefit: "Disability Living Allowance",
    employment_support_allowance_benefit: "Employment Support Allowance",
    industrial_injuries_disablement_benefit: "Industrial Injuries Disablement",
    personal_independence_payment_benefit: "Personal Independence Payment",
    universal_credit_benefit: "Universal Credit",
    working_tax_credit_benefit: "Working Tax Credit",
    pension_credit: "Pension Credit",
    war_disablement_benefit: "War Disablement",
    war_widower_benefit: "War Widower",
    armed_forces_compensation_scheme: "Armed Forces Compensation Scheme"
};

const IncomeBenefitDetailsSchema = {
    type: "object" as const,
    label: "Benefit detail",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const type = optionLabel(BenefitTypeOptions, v.income_benefit_type);
            const amt = formatAmount(v.income_amount);
            return [type, amt].filter(Boolean).join(" – ") || "Benefit";
        }
        return "Benefit";
    },
    fields: {
        id: { type: "string" as const },
        income_benefit_type: {
            type: "enum" as const,
            label: "Benefit type",
            options: BenefitTypeOptions
        },
        ...IncomeAmountFrequencyFields
    }
} as const satisfies ObjectSchema;

const PensionTypeOptions: Record<string, string> = {
    company_pension: "Company Pension",
    private_pension: "Private Pension",
    self_invested_personal_pension: "Self Invested Personal Pension",
    state_pension: "State Pension"
};

const IncomePensionDetailsSchema = {
    type: "object" as const,
    label: "Pension detail",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const type = optionLabel(PensionTypeOptions, v.income_pension_type);
            const amt = formatAmount(v.income_amount);
            const desc = v.income_description ? String(v.income_description).slice(0, 30) : "";
            return [type, amt, desc].filter(Boolean).join(" – ") || "Pension";
        }
        return "Pension";
    },
    fields: {
        id: { type: "string" as const },
        income_pension_type: {
            type: "enum" as const,
            label: "Pension type",
            options: PensionTypeOptions
        },
        income_description: { type: "string" as const, label: "Description", validation: { maxLength: 1000 } },
        ...IncomeAmountFrequencyFields
    }
} as const satisfies ObjectSchema;

const RentalTypeOptions: Record<string, string> = { profit_uk_land_property: "Profit UK Land Property" };

const IncomeRentalDetailsSchema = {
    type: "object" as const,
    label: "Rental detail",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const type = optionLabel(RentalTypeOptions, v.income_rental_type);
            const amt = formatAmount(v.income_amount);
            const year = typeof v.income_payment_year === "number" ? String(v.income_payment_year) : "";
            return [type, amt, year].filter(Boolean).join(" – ") || "Rental";
        }
        return "Rental";
    },
    fields: {
        id: { type: "string" as const },
        ...IncomeAmountFrequencyFields,
        income_payment_year: { type: "number" as const, label: "Year" },
        income_rental_type: {
            type: "enum" as const,
            label: "Rental type",
            options: RentalTypeOptions
        }
    }
} as const satisfies ObjectSchema;

const OtherIncomeTypeOptions: Record<string, string> = {
    annuity: "Annuity",
    dividends_from_investments: "Dividends from Investments",
    trust_fund: "Trust Fund",
    other_investment_income: "Other Investment Income",
    maintenance_spousal_court_ordered: "Maintenance Spousal (Court Ordered)",
    maintenance_spousal_non_court_ordered: "Maintenance Spousal (Non Court Ordered)",
    maintenance_child_court_ordered: "Maintenance Child (Court Ordered)",
    maintenance_child_non_court_ordered: "Maintenance Child (Non Court Ordered)"
};

const IncomeOtherDetailsSchema = {
    type: "object" as const,
    label: "Other income detail",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const type = optionLabel(OtherIncomeTypeOptions, v.income_other_type);
            const amt = formatAmount(v.income_amount);
            return [type, amt].filter(Boolean).join(" – ") || "Other income";
        }
        return "Other income";
    },
    fields: {
        id: { type: "string" as const },
        income_other_type: {
            type: "enum" as const,
            label: "Other income type",
            options: OtherIncomeTypeOptions
        },
        income_description: { type: "string" as const, label: "Description", validation: { maxLength: 1000 } },
        ...IncomeAmountFrequencyFields
    }
} as const satisfies ObjectSchema;

// ─── Accountant details (CDS) ───────────────────────────────────────────────

const AccountantPhoneSchema = {
    type: "object" as const,
    label: "Accountant phone",
    fields: {
        id: { type: "string" as const },
        array_id: { type: "string" as const },
        phone_type_key: { type: "string" as const, label: "Phone type" },
        phone_number: { type: "string" as const, label: "Phone number" }
    }
} as const satisfies ObjectSchema;

const AccountantEmailSchema = {
    type: "object" as const,
    label: "Accountant email",
    fields: {
        id: { type: "string" as const },
        email_address: { type: "string" as const, label: "Email address" }
    }
} as const satisfies ObjectSchema;

const AccountantContactDetailsSchema = {
    type: "object" as const,
    label: "Accountant contact details",
    fields: {
        phones: { type: "array" as const, itemSchema: AccountantPhoneSchema, label: "Phones" },
        emails: { type: "array" as const, itemSchema: AccountantEmailSchema, label: "Emails" }
    }
} as const satisfies ObjectSchema;

const AccountantContactSchema = {
    type: "object" as const,
    label: "Accountant contact",
    description: (v: any) => {
        if (v && typeof v === "object") {
            const first = v.first_name ? String(v.first_name).trim() : "";
            const last = v.last_name ? String(v.last_name).trim() : "";
            return `${first} ${last}`.trim() || "Contact";
        }
        return "Contact";
    },
    fields: {
        id: { type: "string" as const },
        array_id: { type: "string" as const },
        first_name: { type: "string" as const, label: "First name", validation: { maxLength: 100 } },
        last_name: { type: "string" as const, label: "Last name", validation: { maxLength: 100 } },
        accountant_qualification_body_key: {
            type: "enum" as const,
            label: "Qualification issuing body",
            options: {
                institute_of_chartered_accountants_in_england_wales: "ICAEW",
                institute_of_chartered_accountants_in_ireland_chartered_accountants_ireland: "Chartered Accountants Ireland",
                chartered_institute_of_public_finance_accountancy: "CIPFA",
                association_of_accounting_technicians: "AAT",
                association_of_chartered_certified_accountants: "ACCA",
                no_formal_qualification: "No Formal Qualification",
                certified_public_accountants_association: "CPAA",
                association_of_international_accountants: "AIA",
                association_of_taxation_technicians: "ATT",
                association_of_authorised_public_accountants: "AAPA",
                institute_of_chartered_accountants_of_scotland: "ICAS",
                chartered_institute_of_taxation: "CIOT",
                institute_of_financial_accountants: "IFA",
                chartered_institute_of_management_accountants: "CIMA",
                other: "Other"
            }
        },
        accountant_qualification_body_other: { type: "string" as const, label: "Other issuing body", validation: { maxLength: 100 } },
        contact_details: { ...AccountantContactDetailsSchema, label: "Contact details" }
    }
} as const satisfies ObjectSchema;

const AccountantDetailsSchema = {
    type: "object" as const,
    label: "Accountant details",
    description: (v: any) => {
        if (v && typeof v === "object" && v.business_name && String(v.business_name).trim()) {
            return String(v.business_name).trim();
        }
        return "Accountant";
    },
    fields: {
        business_type_key: { type: "string" as const, label: "Business type", validation: { maxLength: 100 } },
        business_name: { type: "string" as const, label: "Business name", validation: { maxLength: 100 } },
        contacts: { type: "array" as const, itemSchema: AccountantContactSchema, label: "Contacts" },
        address: { ...AddressSchema, label: "Address" }
    }
} as const satisfies ObjectSchema;

// ─── Client income base fields (CDS ClientIncome common) ─────────────────────

const ClientIncomeBaseFields = {
    ...TrackingSchema.fields,
    schema_version: { type: "number" as const, label: "Schema version" },
    linked_client_id: { type: "string" as const, label: "Linked Client ID" },
    income_source: {
        type: "enum" as const,
        label: "Income Source",
        options: {
            employed: "Employed",
            sole_trader: "Sole Trader",
            ltd_director: "Limited Company Director",
            pensions: "Pensions",
            rental: "Rental",
            investments_other: "Investments / Other",
            benefits: "Benefits",
            partnership: "Partnership"
        },
        validation: { required: true }
    },
    income_source_chronological_status_key: {
        type: "enum" as const,
        label: "Income Status",
        options: {
            current: "Current",
            previous: "Previous",
            future: "Future"
        }
    },
    accountant_details: { ...AccountantDetailsSchema, label: "Accountant details" },
    business_address: { ...AddressSchema, label: "Business address" },
    import: {
        ...ImportedDataSchema
    }
} as const;

// ─── Employed variant (full IncomeEmployedDetails) ───────────────────────────

const EmployedIncomeVariant = {
    type: "object" as const,
    discriminator: "income_source" as const,
    value: "employed" as const,
    fields: {
        ...ClientIncomeBaseFields,
        employer_name: { type: "string" as const, label: "Employer name", validation: { maxLength: 100 } },
        job_title: { type: "string" as const, label: "Job title", validation: { maxLength: 100 } },
        employment_contract_type_key: {
            type: "enum" as const,
            label: "Contract type",
            options: EmploymentContractTypeOptions
        },
        is_employment_full_time: { type: "boolean" as const, label: "Is employment full time?" },
        /** from origo list  */
        job_occupation: { type: "string" as const, label: "Occupation", validation: { maxLength: 100 } },
        job_occupation_origo_code: { type: "string" as const, label: "Not shown in UI" },
        address: { ...AddressSchema, label: "Employer address" },
        employment_start_date: { type: "datetime" as const, label: "Employment start date" },
        employment_end_date: { type: "datetime" as const, label: "Employment ended" },
        has_employment_probationary_period: { type: "boolean" as const, label: "Probationary period?" },
        job_probationary_end_date: { type: "datetime" as const, label: "Probation ends" },
        employer_provides_sick_pay: { type: "boolean" as const, label: "Is sick pay provided?" },
        has_employment_death_in_service: { type: "boolean" as const, label: "Is death in service provided?" },
        sick_pay: { type: "array" as const, itemSchema: IncomeEmployedSickPayPartSchema, label: "Sick pay" },
        death_in_service_notes: { type: "string" as const, label: "Notes (death in service)", validation: { maxLength: 1000 } },
        employer_death_in_service_amount: { type: "number" as const, label: "Amount of death in service" },
        is_employer_permanent_health_insurance_provided: { type: "boolean" as const, label: "Is Permanent Health Insurance provided?" },
        employer_permanent_health_insurance_details_note: { type: "string" as const, label: "PHI details", validation: { maxLength: 1000 } },
        is_employer_private_medical_insurance_provided: { type: "boolean" as const, label: "Is Private Medical Insurance provided?" },
        employer_private_medical_insurance_details_note: { type: "string" as const, label: "PMI details", validation: { maxLength: 1000 } },
        has_employment_additional_income: { type: "boolean" as const, label: "Is there additional income from this employment?" },
        gross_basic_salary: { ...IncomeRecordDetailsSalarySchema, label: "Gross basic salary" },
        other_income: { type: "array" as const, itemSchema: IncomeRecordDetailsOtherSchema, label: "Other income / allowances" },
        has_employment_income_deductions: { type: "boolean" as const, label: "Are there any income deductions?" },
        salary_deductions: { type: "array" as const, itemSchema: IncomeEmployedSalaryDeductionsSchema, label: "Salary deductions" }
    }
} as const satisfies UnionVariant<"income_source", "employed">;

// ─── Sole trader variant (full IncomeSoleTraderDetails) ──────────────────────

const SoleTraderIncomeVariant = {
    type: "object" as const,
    discriminator: "income_source" as const,
    value: "sole_trader" as const,
    fields: {
        ...ClientIncomeBaseFields,
        business_trading_name: { type: "string" as const, label: "Business trading name", validation: { maxLength: 100 } },
        job_occupation_key: { type: "string" as const, label: "Occupation", validation: { maxLength: 100 } },
        job_occupation_origo_code: { type: "string" as const, label: "Occupation Origo key", validation: { maxLength: 100 } },
        business_start_date: { type: "datetime" as const, label: "Business start date" },
        business_end_date: { type: "datetime" as const, label: "Business end date" },
        sole_trader_incomes: { type: "array" as const, itemSchema: IncomeSoleTraderIncomeSchema, label: "Sole trader incomes" }
    }
} as const satisfies UnionVariant<"income_source", "sole_trader">;

// ─── Ltd director variant (full IncomeLimitedCompanyDirectorDetails) ──────────

const LimitedCompanyDirectorIncomeVariant = {
    type: "object" as const,
    discriminator: "income_source" as const,
    value: "ltd_director" as const,
    fields: {
        ...ClientIncomeBaseFields,
        business_name: { type: "string" as const, label: "Business name", validation: { maxLength: 100 } },
        business_start_date: { type: "datetime" as const, label: "Business start date" },
        business_end_date: { type: "datetime" as const, label: "Business end date" },
        financial_year_end_month_key: {
            type: "enum" as const,
            label: "Business year end (month)",
            options: { "1": "Jan", "2": "Feb", "3": "Mar", "4": "Apr", "5": "May", "6": "Jun", "7": "Jul", "8": "Aug", "9": "Sep", "10": "Oct", "11": "Nov", "12": "Dec" }
        },
        business_financial_periods: {
            type: "array" as const,
            itemSchema: IncomeLimitedCompanyIncomeSchema,
            label: "Financial periods"
        },
        job_occupation_key: { type: "string" as const, label: "Occupation", validation: { maxLength: 100 } },
        job_occupation_origo_key: { type: "string" as const, label: "Occupation Origo key", validation: { maxLength: 100 } }
    }
} as const satisfies UnionVariant<"income_source", "ltd_director">;

// ─── Partnership variant (full IncomePartnershipDetails) ─────────────────────

const PartnershipIncomeVariant = {
    type: "object" as const,
    discriminator: "income_source" as const,
    value: "partnership" as const,
    fields: {
        ...ClientIncomeBaseFields,
        income_source_self_employed_type: {
            type: "enum" as const,
            label: "Income source (self-employed)",
            options: { sole_trader: "Sole Trader", ltd_director: "Ltd Director", partnership: "Partnership" }
        },
        business_partnership_type: {
            type: "enum" as const,
            label: "Partnership type",
            options: { general: "General", limited: "Limited", limited_liability: "Limited Liability" }
        },
        business_name: { type: "string" as const, label: "Business name", validation: { maxLength: 100 } },
        partnership_established_date: { type: "datetime" as const, label: "Partnership established date" },
        partnership_ceased_trading_date: { type: "datetime" as const, label: "Partnership ceased trading date" },
        job_occupation_key: { type: "string" as const, label: "Occupation", validation: { maxLength: 100 } },
        partnership_client_joined_date: { type: "datetime" as const, label: "Date client joined partnership" },
        partnership_client_left_date: { type: "datetime" as const, label: "Date client left partnership" },
        business_financial_periods: {
            type: "array" as const,
            itemSchema: IncomeBusinessFinancialPeriodSchema,
            label: "Business financial periods"
        }
    }
} as const satisfies UnionVariant<"income_source", "partnership">;

// ─── Pensions variant (pension_details array) ─────────────────────────────────

const PensionIncomeVariant = {
    type: "object" as const,
    discriminator: "income_source" as const,
    value: "pensions" as const,
    fields: {
        ...ClientIncomeBaseFields,
        pension_details: {
            type: "array" as const,
            itemSchema: IncomePensionDetailsSchema,
            label: "Pension details"
        }
    }
} as const satisfies UnionVariant<"income_source", "pensions">;

// ─── Rental variant (rental_details array) ────────────────────────────────────

const RentalIncomeVariant = {
    type: "object" as const,
    discriminator: "income_source" as const,
    value: "rental" as const,
    fields: {
        ...ClientIncomeBaseFields,
        rental_details: {
            type: "array" as const,
            itemSchema: IncomeRentalDetailsSchema,
            label: "Rental details"
        }
    }
} as const satisfies UnionVariant<"income_source", "rental">;

// ─── Benefits variant (benefit_details array) ─────────────────────────────────

const BenefitsIncomeVariant = {
    type: "object" as const,
    discriminator: "income_source" as const,
    value: "benefits" as const,
    fields: {
        ...ClientIncomeBaseFields,
        benefit_details: {
            type: "array" as const,
            itemSchema: IncomeBenefitDetailsSchema,
            label: "Benefit details"
        }
    }
} as const satisfies UnionVariant<"income_source", "benefits">;

// ─── Investments / Other variant (other_details array) ────────────────────────

const InvestmentsOtherIncomeVariant = {
    type: "object" as const,
    discriminator: "income_source" as const,
    value: "investments_other" as const,
    fields: {
        ...ClientIncomeBaseFields,
        other_details: {
            type: "array" as const,
            itemSchema: IncomeOtherDetailsSchema,
            label: "Other income details"
        }
    }
} as const satisfies UnionVariant<"income_source", "investments_other">;

// ─── Client income union schema ─────────────────────────────────────────────

const IncomeStatusOptions: Record<string, string> = {
    current: "Current",
    previous: "Previous",
    future: "Future"
};

function describeEmployedIncome(income: any, statusSuffix: string): string {
    const employer = income.employer_name ? String(income.employer_name).trim() : "";
    const job = income.job_title ? String(income.job_title).trim() : "";
    return [employer, job].filter(Boolean).join(" – ") || "Employed" + statusSuffix;
}

function describeClientIncomeBySource(income: any, statusSuffix: string): string {
    switch (income.income_source) {
        case "employed": return describeEmployedIncome(income, statusSuffix);
        case "sole_trader": return (income.business_trading_name && String(income.business_trading_name).trim()) || "Sole trader" + statusSuffix;
        case "ltd_director": return (income.business_name && String(income.business_name).trim()) || "Ltd director" + statusSuffix;
        case "partnership": return (income.business_name && String(income.business_name).trim()) || "Partnership" + statusSuffix;
        case "pensions": return (income.pension_details?.length ? `Pensions (${income.pension_details.length})` : "Pensions") + statusSuffix;
        case "rental": return (income.rental_details?.length ? `Rental (${income.rental_details.length})` : "Rental") + statusSuffix;
        case "benefits": return (income.benefit_details?.length ? `Benefits (${income.benefit_details.length})` : "Benefits") + statusSuffix;
        case "investments_other": return (income.other_details?.length ? `Other (${income.other_details.length})` : "Investments / Other") + statusSuffix;
        default: return "Client income";
    }
}

function clientIncomeDescription(income: any): string {
    if (income && typeof income === "object") {
        const status = optionLabel(IncomeStatusOptions, income.income_source_chronological_status_key);
        const statusSuffix = status ? ` (${status})` : "";
        return describeClientIncomeBySource(income, statusSuffix);
    }
    return "Client income";
}

export const ClientIncomeSchema = {
    type: "union" as const,
    description: clientIncomeDescription,
    variants: [
        EmployedIncomeVariant,
        SoleTraderIncomeVariant,
        LimitedCompanyDirectorIncomeVariant,
        PartnershipIncomeVariant,
        PensionIncomeVariant,
        RentalIncomeVariant,
        BenefitsIncomeVariant,
        InvestmentsOtherIncomeVariant
    ]
} as const satisfies UnionSchema;

export type ClientIncome = SchemaToType<typeof ClientIncomeSchema>;
