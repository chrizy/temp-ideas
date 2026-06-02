import { describe, it, expect } from "vitest";
import { scanDocument, type AiBinding } from "../document-scanner";

describe("document-scanner", () => {
    it("classifies the provided PDF and extracts key bank statement fields", async () => {
        const pdfBytes = new ArrayBuffer(16);

        const fakeAi: AiBinding = {
            async toMarkdown(files) {
                const file = Array.isArray(files) ? files[0] : files;
                expect(file.name).toMatch(/\.pdf$/i);
                expect(file.blob.type).toBe("application/pdf");
                expect(file.blob.size).toBeGreaterThan(0);

                // Minimal markdown containing the fields we care about.
                return {
                    id: "1",
                    name: file.name,
                    format: "markdown",
                    mimetype: "application/pdf",
                    data: [
                        "Mr Christian Small",
                        "10 AVONDALE AVENUE",
                        "ESHER",
                        "SURREY",
                        "KT10 0DA",
                        "",
                        "Sort Code 77-30-11",
                        "Account Number .....0168",
                        "",
                        "01 December 2020 to 02 December 2020",
                        "Balance on 01 December 2020 £7,608.73",
                        "Balance on 02 December 2020 £8,819.09",
                    ].join("\n"),
                };
            },
            async run(_model, input) {
                const last = input?.messages?.[input.messages.length - 1]?.content ?? "";
                // Ensure the markdown we generated is actually being sent to the model.
                expect(String(last)).toContain("Sort Code 77-30-11");
                return {
                    response: {
                        confidence: 0.95,
                        document_type: {
                            category: "client_documentation",
                            sub_type: "bank_statements",
                            meta: {
                                sort_code: "77-30-11",
                                account_number_last4: "0168",
                                account_holder_name: "Mr Christian Small",
                                address: "10 AVONDALE AVENUE, ESHER, SURREY, KT10 0DA",
                                period_start: "2020-12-01",
                                period_end: "2020-12-02",
                                opening_balance: 7608.73,
                                closing_balance: 8819.09,
                                currency: "GBP",
                            },
                        },
                        notes: null,
                    },
                };
            },
        };

        const result = await scanDocument(fakeAi, {
            name: "Helen_BTL_December_Statement.pdf",
            mimeType: "application/pdf",
            data: pdfBytes,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error(`expected ok result, got error: ${result.error.stage}: ${result.error.error}`);

        expect(result.document_type.category).toBe("client_documentation");
        expect(result.document_type.sub_type).toBe("bank_statements");
        if (result.document_type.category !== "client_documentation") throw new Error("expected client_documentation");
        if (result.document_type.sub_type !== "bank_statements") throw new Error("expected bank_statements");

        const meta = result.document_type.meta;
        expect(meta?.sort_code).toBe("77-30-11");
        expect(meta?.account_number_last4).toBe("0168");
        expect(meta?.account_holder_name).toBe("Mr Christian Small");
        expect(meta?.period_start).toBe("2020-12-01");
        expect(meta?.period_end).toBe("2020-12-02");
        expect(meta?.opening_balance).toBeCloseTo(7608.73, 2);
        expect(meta?.closing_balance).toBeCloseTo(8819.09, 2);
    });

    it("extracts address via postcode anchor (no surname overfit) and normalizes negative/variant money + dates", async () => {
        const fakeAi: AiBinding = {
            async toMarkdown() {
                return {
                    id: "1",
                    name: "document.pdf",
                    format: "markdown",
                    mimetype: "application/pdf",
                    data: [
                        "Mrs Jane Doe",
                        "Flat 2",
                        "1 High Street",
                        "London",
                        "SW1A 1AA",
                        "",
                        "Sort Code 12 34 56",
                        "Account Number 12345678",
                        "",
                        "21/10/2020 to 20/11/2020",
                        "Balance brought forward (£1,234.50)",
                        "Balance carried forward £2,000.00 CR",
                    ].join("\n"),
                };
            },
            async run() {
                // Return intentionally loose formats to exercise normalization.
                return {
                    response: {
                        confidence: 0.9,
                        document_type: {
                            category: "client_documentation",
                            sub_type: "bank_statements",
                            meta: {
                                sort_code: "123456",
                                account_number_last4: "5678",
                                period_start: "21/10/2020",
                                period_end: "20/11/2020",
                                opening_balance: "(£1,234.50)",
                                closing_balance: "£2,000.00 CR",
                                address: null,
                            },
                        },
                        notes: null,
                    },
                };
            },
        };

        const result = await scanDocument(fakeAi, {
            name: "x.pdf",
            mimeType: "application/pdf",
            data: new ArrayBuffer(8),
        });

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error(`expected ok result, got error: ${result.error.stage}: ${result.error.error}`);

        expect(result.document_type.category).toBe("client_documentation");
        expect(result.document_type.sub_type).toBe("bank_statements");
        if (result.document_type.category !== "client_documentation") throw new Error("expected client_documentation");
        if (result.document_type.sub_type !== "bank_statements") throw new Error("expected bank_statements");

        const meta = result.document_type.meta;
        expect(meta?.sort_code).toBe("12-34-56");
        expect(meta?.account_number_last4).toBe("5678");
        expect(meta?.period_start).toBe("2020-10-21");
        expect(meta?.period_end).toBe("2020-11-20");
        expect(meta?.opening_balance).toBeCloseTo(-1234.5, 2);
        expect(meta?.closing_balance).toBeCloseTo(2000, 2);
        expect(String(meta?.address ?? "")).toContain("SW1A 1AA");
    });
});

