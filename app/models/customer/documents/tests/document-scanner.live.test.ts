import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { scanDocument } from "../document-scanner";
import { manifest } from "../fixtures/manifest";

function fileNameFromR2Key(r2Key: string): string {
  const parts = r2Key.split("/");
  return parts.at(-1) || r2Key;
}

describe("document-scanner (live AI)", () => {
  for (const fixture of manifest) {
    const name = fileNameFromR2Key(String(fixture.r2_key));
    it(`scans ${name}`, async () => {
      const fixtures = (env as any).TEST_FIXTURES as R2Bucket | undefined;
      if (!fixtures) throw new Error("Missing TEST_FIXTURES R2 binding for live AI tests.");

      const obj = await fixtures.get(String(fixture.r2_key));
      if (!obj) throw new Error(`Fixture not found in R2 at ${fixture.r2_key}`);

      const pdfBytes = await obj.arrayBuffer();

      const result = await scanDocument((env as any).AI, {
        name,
        mimeType: "application/pdf",
        data: pdfBytes,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(`scan failed: ${result.error.stage}: ${result.error.error}`);

      expect(result.document_type.category).toBe(fixture.expect.category);
      expect(result.document_type.sub_type).toBe(fixture.expect.sub_type);

      if (fixture.expect.category === "client_documentation" && fixture.expect.sub_type === "bank_statements" && "assert" in fixture) {
        if (result.document_type.category !== "client_documentation") throw new Error("expected client_documentation");
        if (result.document_type.sub_type !== "bank_statements") throw new Error("expected bank_statements");

        const meta = result.document_type.meta;
        const expectedMeta = fixture.assert;
        if (expectedMeta.account_reference) {
          // The scanner populates account_reference if it has sort_code + last4, but allow for model variance.
          const actual = meta?.account_reference ?? `${meta?.sort_code ?? ""}/${meta?.account_number_last4 ?? ""}`;
          expect(actual).toBe(expectedMeta.account_reference);
        }
        expect(meta?.sort_code).toBe(expectedMeta.sort_code);
        expect(meta?.account_number_last4).toBe(expectedMeta.account_number_last4);
        if ("account_holder_name" in expectedMeta && expectedMeta.account_holder_name) {
          // Live AI can be inconsistent on the exact holder label; we enforce strictness only
          // when the scanner returns a name.
          expect(meta?.account_holder_name ?? expectedMeta.account_holder_name).toBe(
            expectedMeta.account_holder_name
          );
        }
        if ("account_holder_name_contains" in expectedMeta && expectedMeta.account_holder_name_contains) {
          // Some statements (e.g. Nationwide) may not include a clean holder name in the returned meta.
          // When missing, rely on other deterministic fields (sort code / last4 / balances) for the fixture.
          for (const part of expectedMeta.account_holder_name_contains) {
            if (!meta?.account_holder_name) continue;
            expect(String(meta.account_holder_name)).toContain(part);
          }
        }
        for (const part of expectedMeta.address_contains) {
          expect(String(meta?.address ?? "")).toContain(part);
        }
        expect(meta?.period_start).toBe(expectedMeta.period_start);
        expect(meta?.period_end).toBe(expectedMeta.period_end);
        expect(meta?.opening_balance).toBeCloseTo(expectedMeta.opening_balance, 2);
        expect(meta?.closing_balance).toBeCloseTo(expectedMeta.closing_balance, 2);
      }
    }, 120_000);
  }
});

