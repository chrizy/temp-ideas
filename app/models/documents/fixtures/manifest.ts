import type { DocumentTypeWithMeta } from "../document_metadata";

export type BankStatementFixtureMeta = {
    sort_code: string;
    account_number_last4: string;
    account_reference?: string;
    address_contains: string[];
    period_start?: string;
    period_end?: string;
    opening_balance: number;
    closing_balance: number;
    currency?: string;
};

export type BankStatementFixture = {
    r2_key: string;
    expect: DocumentTypeWithMeta;
    assert: BankStatementFixtureMeta & {
        account_holder_name?: string;
        account_holder_name_contains?: string[];
    };
};

export type GenericFixture = {
    r2_key: string;
    expect: DocumentTypeWithMeta;
};

export type Fixture = BankStatementFixture | GenericFixture;

export const manifest = [
    {
        r2_key: "documents/lloyds-bank-statement-1.pdf",
        expect: {
            category: "client_documentation",
            sub_type: "bank_statements",
            meta: {
                sort_code: "77-30-11",
                account_number_last4: "0168",
                account_reference: "77-30-11/0168",
                account_holder_name: "Mr Christian Small",
                period_start: "2020-12-01",
                period_end: "2020-12-02",
                opening_balance: 7608.73,
                closing_balance: 8819.09,
            },
        },
        assert: {
            sort_code: "77-30-11",
            account_number_last4: "0168",
            account_reference: "77-30-11/0168",
            account_holder_name: "Mr Christian Small",
            address_contains: ["10 AVONDALE AVENUE", "ESHER", "SURREY", "KT10 0DA"],
            period_start: "2020-12-01",
            period_end: "2020-12-02",
            opening_balance: 7608.73,
            closing_balance: 8819.09,
        },
    },
    {
        r2_key: "documents/stantander-bank-statment-1.pdf",
        expect: {
            category: "client_documentation",
            sub_type: "bank_statements",
            meta: {
                sort_code: "09-01-28",
                account_number_last4: "2642",
                account_reference: "09-01-28/2642",
                period_start: "2020-10-21",
                period_end: "2020-11-20",
                opening_balance: 12314.93,
                closing_balance: 15177.54,
            },
        },
        assert: {
            sort_code: "09-01-28",
            account_number_last4: "2642",
            account_reference: "09-01-28/2642",
            account_holder_name_contains: ["CHRISTIAN", "SMALL", "HELEN"],
            address_contains: ["10 AVONDALE AVENUE", "ESHER", "KT10 0DA"],
            period_start: "2020-10-21",
            period_end: "2020-11-20",
            opening_balance: 12314.93,
            closing_balance: 15177.54,
        },
    },
    {
        r2_key: "documents/nationwide-bank-statement-1.pdf",
        expect: {
            category: "client_documentation",
            sub_type: "bank_statements",
            meta: {
                sort_code: "07-08-06",
                account_number_last4: "1242",
                account_reference: "07-08-06/1242",
                opening_balance: 543.38,
                closing_balance: 1231.95,
                currency: "GBP",
            },
        },
        assert: {
            sort_code: "07-08-06",
            account_number_last4: "1242",
            account_reference: "07-08-06/1242",
            account_holder_name_contains: ["SMALL"],
            address_contains: ["10 Avondale", "ESHER", "KT10 0DA"],
            period_start: undefined,
            period_end: undefined,
            opening_balance: 543.38,
            closing_balance: 1231.95,
            currency: "GBP",
        },
    },
    {
        r2_key: "documents/p60-1.pdf",
        expect: {
            category: "client_documentation",
            sub_type: "proof_of_income",
            meta: {},
        },
    },
] as const satisfies readonly Fixture[];

