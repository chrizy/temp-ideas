import type { DocumentTypeWithMeta } from "./document_metadata";
import categoryPrompt from "./category_prompt.txt?raw";

export type ScanInput = {
    name: string;
    mimeType: string;
    data: ArrayBuffer;
};

type ConversionResult = {
    id: string;
    name: string;
    format: "markdown" | "error";
    mimetype: string;
    data?: string;
    error?: string;
};

export type AiBinding = {
    toMarkdown: (files: { name: string; blob: Blob } | { name: string; blob: Blob }[]) => Promise<ConversionResult | ConversionResult[]>;
    run: (model: string, input: any) => Promise<any>;
};

export type ScanResult = {
    confidence: number;
    document_type: DocumentTypeWithMeta;
    notes: string | null;
};

export type ScanError = {
    error: string;
    stage: "convert" | "ai" | "parse" | "validate";
};

export type ScanResponse =
    | ({ ok: true } & ScanResult)
    | {
        ok: false;
        error: ScanError;
    };

export type PreScanHint = {
    category?: "client_documentation";
    sub_type?: string;
    meta?: Record<string, unknown>;
    reasons: string[];
};

const ALLOWED_CATEGORIES = [
    "firm_disclosure",
    "client_documentation",
    "credit_report",
    "mortgage_advice",
    "equity_release_advice",
    "bridging_advice",
    "protection_advice",
    "home_insurance",
    "pmi_advice",
    "pap_advice",
] as const;

const CLIENT_DOCUMENTATION_SUBTYPES = [
    "proof_of_identification",
    "electronic_identity_check",
    "idv_peps_sanctions_check",
    "power_of_attorney",
    "right_to_reside",
    "proof_of_address",
    "proof_of_income",
    "state_benefits_report",
    "evidence_of_expected_rental_income",
    "proof_of_deposit",
    "gifted_deposit_letter",
    "right_to_buy_document",
    "credit_report",
    "statement_of_debts",
    "debt_consolidation_calculation",
    "bank_statements",
    "mortgage_statement",
    "redemption_statement",
    "existing_mortgage_consent_to_let",
    "repayment_vehicle",
    "property_portfolio_document",
    "existing_policy",
    "existing_home_insurance",
    "investment_statement",
    "other",
] as const;

const CLIENT_DOCUMENTATION_SUBTYPES_SET = new Set<string>(CLIENT_DOCUMENTATION_SUBTYPES as unknown as string[]);
const ALLOWED_CATEGORIES_SET = new Set<string>(ALLOWED_CATEGORIES as unknown as string[]);

// Simplified UK postcode matcher (good-enough for anchoring address blocks).
const UK_POSTCODE_RE = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/i;

function normalizeUkLongDateToIso(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!raw) return null;

    // Already ISO-ish.
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return raw;

    // dd/mm/yyyy or dd-mm-yyyy
    const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
        const day = dmy[1].padStart(2, "0");
        const month = dmy[2].padStart(2, "0");
        const year = dmy[3];
        return `${year}-${month}-${day}`;
    }

    // e.g. "1st December 2020" / "1 Dec 2020"
    const m = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/);
    if (!m) return null;
    const day = m[1].padStart(2, "0");
    const monthName = m[2].toLowerCase();
    const year = m[3];
    const monthMap: Record<string, string> = {
        january: "01",
        february: "02",
        march: "03",
        april: "04",
        may: "05",
        june: "06",
        july: "07",
        august: "08",
        september: "09",
        october: "10",
        november: "11",
        december: "12",
        jan: "01",
        feb: "02",
        mar: "03",
        apr: "04",
        jun: "06",
        jul: "07",
        aug: "08",
        sep: "09",
        sept: "09",
        oct: "10",
        nov: "11",
        dec: "12",
    };
    const month = monthMap[monthName];
    if (!month) return null;
    return `${year}-${month}-${day}`;
}

function parseMoney(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!raw) return null;

    const isNegative =
        /^\(.*\)$/.test(raw) ||
        /^-/.test(raw) ||
        /-$/.test(raw) ||
        /\bDR\b/i.test(raw) ||
        /\bDEBIT\b/i.test(raw);

    const cleaned = raw
        .replaceAll("£", "")
        .replaceAll("$", "")
        .replaceAll("€", "")
        .replace(/\bCR\b/gi, "")
        .replace(/\bDR\b/gi, "")
        .replace(/\bCREDIT\b/gi, "")
        .replace(/\bDEBIT\b/gi, "")
        .replace(/[()\s]/g, "");

    const m = cleaned.match(/-?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/);
    if (!m) return null;
    const num = Number(`${m[1].replace(/,/g, "")}.${(m[2] ?? "0").padEnd(2, "0")}`);
    if (!Number.isFinite(num)) return null;
    return isNegative ? -Math.abs(num) : num;
}

function asSingleResult(result: ConversionResult | ConversionResult[]): ConversionResult {
    return Array.isArray(result) ? result[0] : result;
}

function normalizeJsonFromAi(response: any): any {
    // Workers AI JSON mode commonly returns: { response: <json> }.
    const payload =
        response && typeof response === "object" && "response" in response
            ? (response as any).response
            : response;

    if (typeof payload === "string") {
        try {
            return JSON.parse(payload);
        } catch {
            // Try to salvage a JSON object embedded in text
            const start = payload.indexOf("{");
            const end = payload.lastIndexOf("}");
            if (start >= 0 && end > start) {
                const slice = payload.slice(start, end + 1);
                try {
                    return JSON.parse(slice);
                } catch {
                    return payload;
                }
            }
            return payload;
        }
    }

    return payload;
}

function extractAddressBlockAfter(markdown: string, header: RegExp, maxLines = 6): string | null {
    const lines = markdown.split(/\r?\n/);
    const startIdx = lines.findIndex((l) => header.test(l));
    if (startIdx < 0) return null;
    const block: string[] = [];
    for (const raw of lines.slice(startIdx + 1, startIdx + 1 + maxLines)) {
        const line = raw.trim();
        if (!line) continue;
        // stop at obvious section headers
        if (/^your\s+account\b/i.test(line) || /^sort\s*code\b/i.test(line) || /^account\s*number\b/i.test(line)) break;
        if (/^your\s+transactions\b/i.test(line)) break;
        block.push(line);
    }
    return block.length ? block.join(", ") : null;
}

function extractUkAddressBlockByPostcode(markdown: string, opts: { maxLinesUp?: number; maxLinesDown?: number } = {}): string | null {
    const maxLinesUp = opts.maxLinesUp ?? 5;
    const maxLinesDown = opts.maxLinesDown ?? 0;
    const lines = markdown.split(/\r?\n/).map((l) => l.trim());
    const idx = lines.findIndex((l) => UK_POSTCODE_RE.test(l));
    if (idx < 0) return null;

    const isStopLine = (line: string) =>
        !line ||
        /^your\s+account\b/i.test(line) ||
        /^sort\s*code\b/i.test(line) ||
        /^account\s*number\b/i.test(line) ||
        /^your\s+transactions\b/i.test(line) ||
        /^statement\b/i.test(line) ||
        /^balance\b/i.test(line);

    const block: string[] = [];
    // walk up to include the address lines above the postcode line
    for (let i = idx; i >= Math.max(0, idx - maxLinesUp); i--) {
        const line = lines[i];
        if (isStopLine(line)) break;
        block.unshift(line);
    }
    // optionally walk down (rarely needed, but kept for completeness)
    for (let i = idx + 1; i <= Math.min(lines.length - 1, idx + maxLinesDown); i++) {
        const line = lines[i];
        if (isStopLine(line)) break;
        if (line) block.push(line);
    }

    const joined = block.filter(Boolean).join(", ");
    return joined.length >= 10 ? joined : null;
}

function preScanBankStatement(markdown: string): PreScanHint | null {
    const reasons: string[] = [];
    if (/\bsort\s*code\b/i.test(markdown)) reasons.push("contains sort code");
    if (/\baccount\s*number\b/i.test(markdown)) reasons.push("contains account number");
    if (/\bbalance\s+on\b/i.test(markdown)) reasons.push("contains balance on");
    if (reasons.length < 2) return null;

    const sortCodeDigits = markdown.match(/sort\s*code[^\d]*(\d{2})\D*(\d{2})\D*(\d{2})/i);
    const sort_code = sortCodeDigits ? `${sortCodeDigits[1]}-${sortCodeDigits[2]}-${sortCodeDigits[3]}` : undefined;
    // Often the statement masks the account number and only shows the last 4 digits.
    const accountDigitsRaw = markdown.match(/account\s*number[^\d]*(\d{4,})/i)?.[1] ?? undefined;
    const accountDigits = accountDigitsRaw ? accountDigitsRaw.replace(/\D/g, "") : undefined;
    const account_number_last4 = accountDigits && accountDigits.length >= 4 ? accountDigits.slice(-4) : undefined;

    const period = markdown.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\s+to\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i);
    const periodStartLong = period ? `${period[1]} ${period[2]} ${period[3]}` : undefined;
    const periodEndLong = period ? `${period[4]} ${period[5]} ${period[6]}` : undefined;
    const period_start = periodStartLong ? normalizeUkLongDateToIso(periodStartLong) ?? periodStartLong : undefined;
    const period_end = periodEndLong ? normalizeUkLongDateToIso(periodEndLong) ?? periodEndLong : undefined;

    const opening_balance = (() => {
        const m = markdown.match(/Balance\s+brought\s+forward[^\d£-]*£?\s*([\d,]+\.\d{2})/i);
        if (m) return parseMoney(m[1]) ?? undefined;
        const m2 = markdown.match(/Balance\s+on\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})\D+£?\s*([\d,]+\.\d{2})/i);
        return m2 ? parseMoney(m2[2]) ?? undefined : undefined;
    })();
    const closing_balance = (() => {
        const m = markdown.match(/balance\s+at\s+close\s+of\s+business[^\d£-]*£?\s*([\d,]+\.\d{2})/i);
        if (m) return parseMoney(m[1]) ?? undefined;
        const m2 = markdown.match(/balance\s+carried\s+forward[^\d£-]*£?\s*([\d,]+\.\d{2})/i);
        if (m2) return parseMoney(m2[1]) ?? undefined;
        const m3 = markdown.match(/Balance\s+on\s+\d{1,2}\s+[A-Za-z]+\s+\d{4}\D+£?\s*([\d,]+\.\d{2})[\s\S]*Balance\s+on\s+\d{1,2}\s+[A-Za-z]+\s+\d{4}\D+£?\s*([\d,]+\.\d{2})/i);
        return m3 ? parseMoney(m3[2]) ?? undefined : undefined;
    })();

    const address = extractAddressBlockAfter(markdown, /document\s+requested\s+by:/i);
    const titledName = markdown.match(/\b(Mr|Mrs|Ms|Miss|Dr)\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+\b/)?.[0] ?? undefined;
    const postcodeAddress = extractUkAddressBlockByPostcode(markdown);

    return {
        category: "client_documentation",
        sub_type: "bank_statements",
        meta: {
            ...(titledName ? { account_holder_name: titledName } : null),
            ...(address ? { address } : null),
            ...(!address && postcodeAddress ? { address: postcodeAddress } : null),
            ...(sort_code ? { sort_code } : null),
            ...(account_number_last4 ? { account_number_last4 } : null),
            ...(period_start ? { period_start } : null),
            ...(period_end ? { period_end } : null),
            ...(opening_balance != null ? { opening_balance } : null),
            ...(closing_balance != null ? { closing_balance } : null),
            currency: /£/.test(markdown) ? "GBP" : undefined,
        } as Record<string, unknown>,
        reasons,
    };
}

export function deterministicPreScan(markdown: string): PreScanHint | null {
    return preScanBankStatement(markdown) ?? preScanP60(markdown);
}

function preScanP60(markdown: string): PreScanHint | null {
    const reasons: string[] = [];

    // P60 cues (common OCR variants + typos).
    if (/\bp\s*60\b/i.test(markdown)) reasons.push("contains P60");
    if (/\bPAYE\b/i.test(markdown)) reasons.push("contains PAYE");
    if (/\bPAYE\s*reference\b/i.test(markdown)) reasons.push("contains PAYE reference");
    if (/\bnational\s+insurance\b/i.test(markdown) || /\bni\s*(?:no|number)\b/i.test(markdown)) reasons.push("contains National Insurance");
    if (/\bHMRC\b/i.test(markdown) || /\bHM\s+Revenue\b/i.test(markdown)) reasons.push("contains HMRC");
    if (/\btotal\s+pay\b/i.test(markdown)) reasons.push("contains total pay");
    if (/\btotal\s+tax\b/i.test(markdown) || /\btax\s+deducted\b/i.test(markdown)) reasons.push("contains tax deducted");

    // Require multiple cues to avoid false positives from generic payslips/letters.
    if (reasons.length < 3) return null;

    return {
        category: "client_documentation",
        sub_type: "proof_of_income",
        meta: {},
        reasons,
    };
}

function enrichProofOfIdentificationMeta(markdown: string, meta: any): any {
    if (!meta || typeof meta !== "object") return meta;
    // Try to pick up name/address blocks when present
    if (!meta.full_name) {
        const titled = markdown.match(/\b(Mr|Mrs|Ms|Miss|Dr)\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+\b/)?.[0];
        if (titled) meta.full_name = titled;
    }
    if (!meta.address) {
        const addr = extractAddressBlockAfter(markdown, /\baddress\b/i);
        if (addr) meta.address = addr;
    }
    const dob = normalizeUkLongDateToIso(meta.date_of_birth);
    if (dob) meta.date_of_birth = dob;
    const exp = normalizeUkLongDateToIso(meta.expiry_date);
    if (exp) meta.expiry_date = exp;
    return meta;
}

function enrichNoop(_markdown: string, meta: any): any {
    return meta;
}

function enrichClientDocumentationMeta(sub_type: string, markdown: string, meta: any): any {
    switch (sub_type) {
        case "bank_statements":
            return enrichBankStatementMeta(markdown, meta);
        case "proof_of_identification":
            return enrichProofOfIdentificationMeta(markdown, meta);
        case "electronic_identity_check":
        case "idv_peps_sanctions_check":
        case "power_of_attorney":
        case "right_to_reside":
        case "proof_of_address":
        case "proof_of_income":
        case "state_benefits_report":
        case "evidence_of_expected_rental_income":
        case "proof_of_deposit":
        case "gifted_deposit_letter":
        case "right_to_buy_document":
        case "credit_report":
        case "statement_of_debts":
        case "debt_consolidation_calculation":
        case "mortgage_statement":
        case "redemption_statement":
        case "existing_mortgage_consent_to_let":
        case "repayment_vehicle":
        case "property_portfolio_document":
        case "existing_policy":
        case "existing_home_insurance":
        case "investment_statement":
            return enrichNoop(markdown, meta);
        default:
            return meta;
    }
}

function enrichBankStatementMeta(markdown: string, meta: any): any {
    if (!meta || typeof meta !== "object") return meta;
    // prefer markdown-derived sort code and account last4
    const hint = preScanBankStatement(markdown);
    if (hint?.meta) {
        if (hint.meta.sort_code && !meta.sort_code) meta.sort_code = hint.meta.sort_code;
        if (hint.meta.account_number_last4) meta.account_number_last4 = hint.meta.account_number_last4;
        if (hint.meta.period_start && !meta.period_start) meta.period_start = hint.meta.period_start;
        if (hint.meta.period_end && !meta.period_end) meta.period_end = hint.meta.period_end;
        if (hint.meta.opening_balance != null && meta.opening_balance == null) meta.opening_balance = hint.meta.opening_balance;
        if (hint.meta.closing_balance != null && meta.closing_balance == null) meta.closing_balance = hint.meta.closing_balance;
        if (hint.meta.address && !meta.address) meta.address = hint.meta.address;
        if (hint.meta.account_holder_name && (!meta.account_holder_name || String(meta.account_holder_name).length < 5)) {
            meta.account_holder_name = hint.meta.account_holder_name;
        }
        if (hint.meta.currency && !meta.currency) meta.currency = hint.meta.currency;
    }
    // Ensure we always set a plausible account_holder_name if the page contains a titled name.
    if (!meta.account_holder_name) {
        // Santander often has "Account name ..." line; use it if present.
        const acctName = markdown.match(/account\s+name\s*[:\-]?\s*(.+)/i)?.[1]?.trim();
        if (acctName && acctName.length >= 5) meta.account_holder_name = acctName;
    }
    if (!meta.account_holder_name) {
        const m = markdown.match(/^(?:miss|mr|mrs|ms|dr)\b[^\n]*$/im)?.[0]?.trim();
        if (m && m.length >= 5) meta.account_holder_name = m;
    }
    if (!meta.address) {
        // Postcode-anchored block extraction works across most UK statement layouts.
        const addr = extractUkAddressBlockByPostcode(markdown);
        if (addr) meta.address = addr;
    }
    if (!meta.account_holder_name) {
        const titled = markdown.match(/\b(Mr|Mrs|Ms|Miss|Dr)\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)+\b/)?.[0];
        if (titled) meta.account_holder_name = titled;
    }
    if (!meta.account_number_last4) {
        // Nationwide often prints: "Account  no  00791242"
        const m = markdown.match(/\baccount\b[^\d]{0,20}(\d{6,})/i)?.[1]?.replace(/\D/g, "");
        if (m && m.length >= 4) meta.account_number_last4 = m.slice(-4);
    }
    if (!meta.account_reference) {
        const sc = typeof meta.sort_code === "string" ? meta.sort_code : undefined;
        const last4 = typeof meta.account_number_last4 === "string" ? meta.account_number_last4 : undefined;
        if (sc && last4) meta.account_reference = `${sc}/${last4}`;
    }
    if (meta.opening_balance == null) {
        const m = markdown.match(/\bstart\s+balance\b[^\d£-]*£?\s*([\d,]+\.\d{2})/i);
        if (m) meta.opening_balance = parseMoney(m[1]) ?? meta.opening_balance;
    }
    if (meta.closing_balance == null) {
        const m = markdown.match(/\bend\s+balance\b[^\d£-]*£?\s*([\d,]+\.\d{2})/i);
        if (m) meta.closing_balance = parseMoney(m[1]) ?? meta.closing_balance;
    }
    return meta;
}

/** For any given pdf/image, scan it and return the confidence, document type, and extracted metadata.
 * This will upload docs with PII in order to parse them for a customer.
 * Steps:
 * 1. Convert the document to markdown
 * 2. Run a deterministic pre-scan to see if the document type can be determined.
 * 4. Run the AI model to classify the document and extract metadata.
 * 5. Return the result
 */
export async function scanDocument(
    ai: AiBinding,
    input: ScanInput,
    opts: { model?: string; promptOverride?: string } = {}
): Promise<ScanResponse> {
    const model = opts.model ?? "@cf/meta/llama-3.1-8b-instruct";
    const prompt = opts.promptOverride ?? categoryPrompt;

    let converted: ConversionResult;
    try {
        const ext = input.name.toLowerCase().endsWith(".pdf") ? ".pdf" : "";
        const conversion = await ai.toMarkdown({
            // Avoid biasing classification with user-provided filenames.
            name: `document${ext}`,
            blob: new Blob([input.data], { type: input.mimeType }),
        });

        converted = asSingleResult(conversion);
    } catch (e: any) {
        return {
            ok: false,
            error: { stage: "convert", error: e?.message ? String(e.message) : "Failed to convert document to markdown." },
        };
    }

    if (!converted || converted.format !== "markdown" || typeof converted.data !== "string") {
        return {
            ok: false,
            error: { stage: "convert", error: `Failed to convert document to markdown: ${converted?.error ?? "unknown error"}` },
        };
    }

    const markdown = converted.data;
    const preScan = deterministicPreScan(markdown);
    const looksLikeBankStatement = preScan?.sub_type === "bank_statements";
    const looksLikeP60 = preScan?.sub_type === "proof_of_income";

    // If deterministic signals are strong, skip the model and return the best-effort classification.
    if (
        looksLikeBankStatement &&
        (preScan?.reasons?.length ?? 0) >= 3 &&
        typeof preScan?.meta?.sort_code === "string" &&
        typeof preScan?.meta?.account_number_last4 === "string"
    ) {
        const meta = (preScan?.meta ?? {}) as any;
        if (meta && typeof meta === "object") {
            // Normalize common fields even in deterministic-only mode.
            if (typeof meta.sort_code === "string") {
                const digits = meta.sort_code.replace(/\D/g, "");
                if (digits.length === 6) meta.sort_code = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
            }
            if (meta.period_start) meta.period_start = normalizeUkLongDateToIso(meta.period_start) ?? meta.period_start;
            if (meta.period_end) meta.period_end = normalizeUkLongDateToIso(meta.period_end) ?? meta.period_end;
            if (meta.opening_balance != null) meta.opening_balance = parseMoney(meta.opening_balance) ?? meta.opening_balance;
            if (meta.closing_balance != null) meta.closing_balance = parseMoney(meta.closing_balance) ?? meta.closing_balance;
            if (!meta.address) meta.address = extractUkAddressBlockByPostcode(markdown) ?? meta.address;
            if (!meta.account_reference && typeof meta.sort_code === "string" && typeof meta.account_number_last4 === "string") {
                meta.account_reference = `${meta.sort_code}/${meta.account_number_last4}`;
            }
        }
        return {
            ok: true,
            confidence: 0.8,
            document_type: {
                category: "client_documentation",
                sub_type: "bank_statements",
                meta,
            } as DocumentTypeWithMeta,
            notes: "Classified via deterministic pre-scan (strong bank statement signals).",
        };
    }

    let aiResult: any;
    try {
        aiResult = await ai.run(model, {
            messages: [
                {
                    role: "system",
                    content: prompt,
                },
                {
                    role: "user",
                    content: [
                        looksLikeBankStatement
                            ? "Hint: This appears to be a bank statement (sort code / account number / balance lines). If so, use category `client_documentation` and sub_type `bank_statements`."
                            : null,
                        looksLikeP60
                            ? "Hint: This appears to be a P60 / end-of-year PAYE certificate. If so, use category `client_documentation` and sub_type `proof_of_income`."
                            : null,
                        preScan
                            ? `Deterministic pre-scan hint (may be partial): ${JSON.stringify({
                                category: preScan.category,
                                sub_type: preScan.sub_type,
                                meta: preScan.meta,
                            })}`
                            : null,
                        "Important: keep the JSON small. Do NOT include full transaction line-items arrays; only return the summary fields described in the prompt.",
                        "Here is the document converted to markdown. Classify it and extract metadata.",
                        "",
                        markdown,
                    ]
                        .filter(Boolean)
                        .join("\n"),
                },
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    type: "object",
                    properties: {
                        confidence: { type: "number" },
                        notes: { anyOf: [{ type: "string" }, { type: "null" }] },
                        document_type: {
                            oneOf: [
                                {
                                    type: "object",
                                    properties: {
                                        category: { type: "string", enum: ["client_documentation"] },
                                        // Exclude bank_statements here to avoid overlapping with the typed bank schema below.
                                        sub_type: {
                                            type: "string",
                                            enum: Array.from(CLIENT_DOCUMENTATION_SUBTYPES).filter((s) => s !== "bank_statements"),
                                        },
                                        meta: {
                                            anyOf: [
                                                {
                                                    // default client_documentation meta (varies by sub_type)
                                                    type: "object",
                                                    additionalProperties: true,
                                                },
                                                { type: "null" },
                                            ],
                                        },
                                    },
                                    required: ["category", "sub_type", "meta"],
                                    additionalProperties: false,
                                },
                                {
                                    // Strongly-typed bank statement meta to reduce model drift.
                                    type: "object",
                                    properties: {
                                        category: { type: "string", enum: ["client_documentation"] },
                                        sub_type: { type: "string", enum: ["bank_statements"] },
                                        meta: {
                                            type: "object",
                                            properties: {
                                                sort_code: { anyOf: [{ type: "string" }, { type: "null" }] },
                                                account_number_last4: { anyOf: [{ type: "string" }, { type: "null" }] },
                                                account_reference: { anyOf: [{ type: "string" }, { type: "null" }] },
                                                account_holder_name: { anyOf: [{ type: "string" }, { type: "null" }] },
                                                address: { anyOf: [{ type: "string" }, { type: "null" }] },
                                                bank_name: { anyOf: [{ type: "string" }, { type: "null" }] },
                                                period_start: { anyOf: [{ type: "string" }, { type: "null" }] },
                                                period_end: { anyOf: [{ type: "string" }, { type: "null" }] },
                                                opening_balance: { anyOf: [{ type: "number" }, { type: "null" }] },
                                                closing_balance: { anyOf: [{ type: "number" }, { type: "null" }] },
                                                currency: { anyOf: [{ type: "string" }, { type: "null" }] },
                                            },
                                            // Minimal keys we want present (values may be null).
                                            required: ["sort_code", "account_number_last4"],
                                            additionalProperties: true,
                                        },
                                    },
                                    required: ["category", "sub_type", "meta"],
                                    additionalProperties: false,
                                },
                                {
                                    type: "object",
                                    properties: {
                                        category: {
                                            type: "string",
                                            enum: Array.from(ALLOWED_CATEGORIES).filter((c) => c !== "client_documentation"),
                                        },
                                        sub_type: { type: "string" },
                                        meta: { type: "null" },
                                    },
                                    required: ["category", "sub_type", "meta"],
                                    additionalProperties: false,
                                },
                            ],
                        },
                    },
                    required: ["confidence", "document_type", "notes"],
                    additionalProperties: false,
                },
            },
            max_tokens: 700,
            temperature: 0,
        });
    } catch (e: any) {
        return { ok: false, error: { stage: "ai", error: e?.message ? String(e.message) : "AI call failed." } };
    }

    const json = normalizeJsonFromAi(aiResult);
    if (!json || typeof json !== "object") return { ok: false, error: { stage: "parse", error: "AI response was not a JSON object." } };

    const validated = validateAndNormalizeAiResult(json, { markdown, preScan });
    if (!validated.ok) return validated;
    return validated;
}

function validateAndNormalizeAiResult(
    json: any,
    ctx: { markdown: string; preScan: PreScanHint | null }
): ScanResponse {
    const rawConfidence = typeof json?.confidence === "number" ? json.confidence : 0;
    const confidence = Number.isFinite(rawConfidence) ? Math.min(1, Math.max(0, rawConfidence)) : 0;
    const notes = typeof json?.notes === "string" ? json.notes : null;

    const dt = json?.document_type;
    if (!dt || typeof dt !== "object") return { ok: false, error: { stage: "validate", error: "AI response missing document_type." } };

    const category = typeof (dt as any).category === "string" ? String((dt as any).category) : "";
    const sub_type = typeof (dt as any).sub_type === "string" ? String((dt as any).sub_type) : "";
    const meta = (dt as any).meta;

    if (!ALLOWED_CATEGORIES_SET.has(category)) {
        return { ok: false, error: { stage: "validate", error: `Invalid category: ${JSON.stringify(category)}` } };
    }

    if (category !== "client_documentation") {
        // Hard rule: meta must be null outside client_documentation.
        const document_type = { category, sub_type: sub_type || "other", meta: null } as DocumentTypeWithMeta;
        return { ok: true, confidence, document_type, notes };
    }

    // client_documentation requires a known sub_type; use preScan hint if missing/invalid.
    const hintedSubType = typeof ctx.preScan?.sub_type === "string" ? ctx.preScan.sub_type : "";
    const normalizedSubType = CLIENT_DOCUMENTATION_SUBTYPES_SET.has(sub_type)
        ? sub_type
        : CLIENT_DOCUMENTATION_SUBTYPES_SET.has(hintedSubType)
          ? hintedSubType
          : "";

    if (!normalizedSubType) {
        return { ok: false, error: { stage: "validate", error: `Invalid client_documentation sub_type: ${JSON.stringify(sub_type)}` } };
    }

    // Meta must be an object or null. For bank statements we always coerce to object.
    const outMeta: any =
        meta == null ? null : typeof meta === "object" && !Array.isArray(meta) ? meta : null;

    const document_type: any = {
        category: "client_documentation",
        sub_type: normalizedSubType,
        meta: normalizedSubType === "bank_statements" ? (outMeta ?? {}) : outMeta,
    };

    // Enrich + normalize typed fields.
    if (document_type.meta && typeof document_type.meta === "object") {
        enrichClientDocumentationMeta(String(document_type.sub_type), ctx.markdown, document_type.meta);
    }

    // Extra bank-statement guardrails (even if model drifted).
    if (document_type.sub_type === "bank_statements") {
        const m: any = document_type.meta ?? {};
        if (typeof m.sort_code === "string") {
            const digits = m.sort_code.replace(/\D/g, "");
            if (digits.length === 6) m.sort_code = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
        }
        if (typeof m.account_number_last4 === "string") {
            const digits = m.account_number_last4.replace(/\D/g, "");
            if (digits.length >= 4) m.account_number_last4 = digits.slice(-4);
        }
        const ps = normalizeUkLongDateToIso(m.period_start);
        if (ps) m.period_start = ps;
        const pe = normalizeUkLongDateToIso(m.period_end);
        if (pe) m.period_end = pe;
        const ob = parseMoney(m.opening_balance);
        if (ob != null) m.opening_balance = ob;
        const cb = parseMoney(m.closing_balance);
        if (cb != null) m.closing_balance = cb;
        if (!m.address) m.address = extractUkAddressBlockByPostcode(ctx.markdown) ?? m.address;
        if (!m.account_reference && typeof m.sort_code === "string" && typeof m.account_number_last4 === "string") {
            m.account_reference = `${m.sort_code}/${m.account_number_last4}`;
        }
        // Backfill critical keys from deterministic scan when the model omits them.
        const hintMeta: any = ctx.preScan?.meta && typeof ctx.preScan.meta === "object" ? ctx.preScan.meta : null;
        if (hintMeta) {
            if (!m.sort_code && typeof hintMeta.sort_code === "string") m.sort_code = hintMeta.sort_code;
            if (!m.account_number_last4 && typeof hintMeta.account_number_last4 === "string") m.account_number_last4 = hintMeta.account_number_last4;
        }
        if (!m.sort_code || !m.account_number_last4) {
            return { ok: false, error: { stage: "validate", error: "Missing required bank statement keys (sort_code, account_number_last4)." } };
        }
        document_type.meta = m;
    }

    return { ok: true, confidence, document_type: document_type as DocumentTypeWithMeta, notes };
}

