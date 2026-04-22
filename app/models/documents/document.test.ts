import type { Document } from "./document";

const test1: Document = {
    id: 1,
    account_id: 1,
    version: 1,
    created_at: new Date().toISOString(),
    created_by: "123",
    created_by_user_type: "user",
    updated_at: new Date().toISOString(),
    updated_by: "123",
    document_type: {
        category: "client_documentation",
        sub_type: "bank_statements",
        meta: {
            bank_name: "Bank of America",
            account_holder_name: "John Doe",
            address: "123 Main St, Anytown, USA",
            period_start: "2026-01-01",
            period_end: "2026-03-31",
            opening_balance: 1000,
            closing_balance: 2500,
            currency: "USD",
        }
    },
    client_ids: [123],
    case_id: "123",
    requirement_id: "123",
    application_id: "123",
    file_name: "test.pdf",
    mime_type: "application/pdf",
    size_bytes: 1000,
    uploaded_at: new Date().toISOString(),
}