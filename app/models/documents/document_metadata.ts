import type { DocumentSubType } from "./document_types";

type ClientDocumentSubType = Extract<DocumentSubType, { category: "client_documentation" }>["sub_type"];
type ClientDocumentSubTypeKey = Extract<NonNullable<ClientDocumentSubType>, string>;

type ISODateString = string; // e.g. "2026-04-22"

export type ClientDocumentMetadataMap = {
    proof_of_identification: {
        full_name?: string;
        date_of_birth?: ISODateString;
        document_number?: string;
        issuing_country?: string;
        expiry_date?: ISODateString;
        address?: string;
    };
    electronic_identity_check: {
        full_name?: string;
        date_of_birth?: ISODateString;
        address?: string;
        provider?: string;
        reference_id?: string;
        passed?: boolean;
        match_score?: number;
    };
    idv_peps_sanctions_check: {
        full_name?: string;
        date_of_birth?: ISODateString;
        address?: string;
        provider?: string;
        reference_id?: string;
        passed?: boolean;
        peps_hit?: boolean;
        sanctions_hit?: boolean;
    };
    power_of_attorney: {
        donor_name?: string;
        attorney_name?: string;
        donor_address?: string;
        attorney_address?: string;
        registered_date?: ISODateString;
        reference_number?: string;
    };
    right_to_reside: {
        full_name?: string;
        address?: string;
        document_number?: string;
        expiry_date?: ISODateString;
        issuing_country?: string;
    };
    proof_of_address: {
        full_name?: string;
        address?: string;
        document_date?: ISODateString;
        issuer?: string;
    };
    proof_of_income: {
        full_name?: string;
        employer_name?: string;
        employer_address?: string;
        pay_frequency?: "weekly" | "fortnightly" | "four_weekly" | "monthly" | "annual" | "other";
        period_start?: ISODateString;
        period_end?: ISODateString;
        gross_pay?: number;
        net_pay?: number;
        currency?: string;
    };
    state_benefits_report: {
        full_name?: string;
        address?: string;
        report_date?: ISODateString;
        benefit_types?: string[];
        total_amount?: number;
        currency?: string;
    };
    evidence_of_expected_rental_income: {
        landlord_name?: string;
        property_address?: string;
        expected_monthly_rent?: number;
        currency?: string;
        start_date?: ISODateString;
        end_date?: ISODateString;
        agent_or_tenant_name?: string;
    };
    proof_of_deposit: {
        full_name?: string;
        address?: string;
        amount?: number;
        currency?: string;
        source?: "savings" | "sale_of_property" | "gift" | "inheritance" | "investments" | "other";
        account_provider?: string;
    };
    gifted_deposit_letter: {
        donor_name?: string;
        donor_address?: string;
        recipient_name?: string;
        amount?: number;
        currency?: string;
        relationship_to_recipient?: string;
        date?: ISODateString;
    };
    right_to_buy_document: {
        full_name?: string;
        property_address?: string;
        tenancy_reference?: string;
        discount_amount?: number;
        currency?: string;
        notice_date?: ISODateString;
    };
    credit_report: {
        full_name?: string;
        address?: string;
        agency?: string;
        report_date?: ISODateString;
        score?: number;
        defaults_count?: number;
        ccjs_count?: number;
    };
    statement_of_debts: {
        full_name?: string;
        address?: string;
        total_unsecured_debt?: number;
        total_secured_debt?: number;
        currency?: string;
        debts?: Array<{
            creditor?: string;
            type?: string;
            balance?: number;
            monthly_payment?: number;
        }>;
    };
    debt_consolidation_calculation: {
        full_name?: string;
        address?: string;
        total_debt?: number;
        currency?: string;
        current_total_monthly_payments?: number;
        proposed_monthly_payment?: number;
        term_months?: number;
    };
    bank_statements: {
        account_holder_name?: string;
        address?: string;
        bank_name?: string;
        sort_code?: string;
        account_number_last4?: string;
        period_start?: ISODateString;
        period_end?: ISODateString;
        opening_balance?: number;
        closing_balance?: number;
        currency?: string;
    };
    mortgage_statement: {
        borrower_name?: string;
        property_address?: string;
        lender_name?: string;
        account_number_last4?: string;
        statement_date?: ISODateString;
        balance?: number;
        monthly_payment?: number;
        interest_rate?: number;
        currency?: string;
    };
    redemption_statement: {
        borrower_name?: string;
        property_address?: string;
        lender_name?: string;
        account_number_last4?: string;
        redemption_date?: ISODateString;
        redemption_amount?: number;
        early_repayment_charge?: number;
        fees?: number;
        currency?: string;
    };
    existing_mortgage_consent_to_let: {
        borrower_name?: string;
        property_address?: string;
        lender_name?: string;
        consent_granted?: boolean;
        consent_start?: ISODateString;
        consent_end?: ISODateString;
        conditions?: string;
    };
    repayment_vehicle: {
        full_name?: string;
        provider?: string;
        product_type?: string;
        account_number_last4?: string;
        current_value?: number;
        monthly_contribution?: number;
        maturity_date?: ISODateString;
        currency?: string;
    };
    property_portfolio_document: {
        full_name?: string;
        properties?: Array<{
            address?: string;
            current_value?: number;
            outstanding_mortgage?: number;
            monthly_rent?: number;
            lender?: string;
        }>;
        currency?: string;
    };
    existing_policy: {
        policyholder_name?: string;
        provider?: string;
        policy_number?: string;
        cover_type?: string;
        start_date?: ISODateString;
        end_date?: ISODateString;
        premium?: number;
        currency?: string;
    };
    existing_home_insurance: {
        policyholder_name?: string;
        provider?: string;
        policy_number?: string;
        property_address?: string;
        start_date?: ISODateString;
        end_date?: ISODateString;
        premium?: number;
        currency?: string;
    };
    investment_statement: {
        account_holder_name?: string;
        provider?: string;
        account_number_last4?: string;
        statement_date?: ISODateString;
        total_value?: number;
        currency?: string;
    };
    other: {
        title?: string;
        summary?: string;
        key_fields?: Record<string, string | number | boolean | null>;
    };
};

type _ClientDocumentMetadataMapCoversAllSubTypes =
    Exclude<ClientDocumentSubTypeKey, keyof ClientDocumentMetadataMap> extends never ? true : never;
const _clientDocumentMetadataMapCoversAllSubTypes: _ClientDocumentMetadataMapCoversAllSubTypes = true;

export type DocumentTypeWithMeta =
    | {
        [K in keyof ClientDocumentMetadataMap]: {
            category: "client_documentation";
            sub_type: K;
            meta?: ClientDocumentMetadataMap[K] | null;
        }
    }[keyof ClientDocumentMetadataMap]
    | (Exclude<NonNullable<DocumentSubType>, { category: "client_documentation" }> & { meta?: null });

