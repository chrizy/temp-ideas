import { ClientSchema, type Client } from "~/models/client/client";
import logoDark from "./logo-dark.svg";
import logoLight from "./logo-light.svg";
import { FieldRenderer } from "~/components/field";
import { ReadOnlyRender } from "~/components/readonly-render";
import { SchemaDocumentation } from "~/components/schema-documentation";
import { useMemo, useState } from "react";
import { generateAuditDiff } from "~/utils/audit";
import { validateObject } from "~/utils/validation";

const INITIAL_PERSON: Client = {
  client_type: "individual",
  version: 1,
  first_name: "John",
  sex: "male",
  addresses: [
    {
      client_address_id: "addr-1",
      address: {
        is_uk: true,
        house_number: "123",
        street: "Main St",
        town: "London",
        postcode: "SW1A 1AA",
        uk_country_key: "england",
      },
      is_current_address: true,
      residency_start_date: "2022-01-01",
    },
    {
      client_address_id: "addr-2",
      address: {
        is_uk: false,
        international_line_1: "123 Main St",
        international_line_2: "Apt 1",
        country_key: "US",
      },
      is_current_address: false,
      residency_start_date: "2022-01-01",
      residency_end_date: "2022-12-31",
    }
  ]
};

export function Welcome({ message }: { message: string }) {
  const [data, setData] = useState<Client>(INITIAL_PERSON);
  const auditDiff = useMemo(
    () => generateAuditDiff(ClientSchema, INITIAL_PERSON, data),
    [data]
  );

  // Validation result
  const validationResult = useMemo(
    () => validateObject(ClientSchema, data),
    [data]
  );

  // Test cases for validation
  const testCases = useMemo(() => {
    const invalidData: Client = {
      client_type: "individual",
      version: 1,
      first_name: "A", // Too short (minLength: 2)
      sex: "invalid" as any, // Invalid enum value
      dob: "2025-12-31", // Future date (maxDate is today)
      addresses: [] // Empty array
    };

    const invalidData2: Client = {
      client_type: "individual",
      version: 1,
      first_name: "", // Empty but required
      sex: "male",
      addresses: [
        {
          client_address_id: "", // Empty but required
          address: {
            is_uk: true,
            house_number: "123",
            street: "Main St",
            town: "London",
            postcode: "SW1A 1AA",
            uk_country_key: "england",
          },
          is_current_address: true,
          residency_start_date: "1800-01-01", // Before minDate
        }
      ]
    };

    return [
      { name: "Invalid: Short name, invalid enum, future date", data: invalidData },
      { name: "Invalid: Missing required fields, invalid date", data: invalidData2 },
      { name: "Valid: Current form data", data }
    ];
  }, [data]);

  return (
    <main className="flex items-center justify-center pt-16 pb-4">
      <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
        <div className="max-w-[800px] w-full space-y-6 px-4">
          <h2 className="text-2xl font-bold">Form Editor</h2>
          {data.client_type === "individual" && (
            <>
              <FieldRenderer
                schema={ClientSchema}
                path={["firstName"]}
                value={data.first_name}
                onChange={val => setData({ ...data, first_name: val })}
              />

              <FieldRenderer
                schema={ClientSchema}
                path={["sex"]}
                value={data.sex}
                onChange={val => setData({ ...data, sex: val })}
              />
            </>
          )}

          <h2 className="text-2xl font-bold mt-8">Validation Status</h2>
          <div style={{
            border: `2px solid ${validationResult.isValid ? "#10b981" : "#ef4444"}`,
            borderRadius: "8px",
            padding: "16px",
            backgroundColor: validationResult.isValid ? "#f0fdf4" : "#fef2f2"
          }}>
            <div style={{
              fontWeight: "bold",
              fontSize: "1.1em",
              marginBottom: "12px",
              color: validationResult.isValid ? "#059669" : "#dc2626"
            }}>
              {validationResult.isValid ? "✓ Valid" : "✗ Invalid"}
            </div>
            {validationResult.errors.length > 0 && (
              <div>
                <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#dc2626" }}>
                  Errors ({validationResult.errors.length}):
                </div>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  {validationResult.errors.map((error, index) => (
                    <li key={index} style={{ marginBottom: "6px" }}>
                      <strong>{error.path.length > 0 ? error.path.join(".") : "root"}:</strong> {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold mt-8">Validation Test Cases</h2>
          <div style={{ border: "2px solid #333", borderRadius: "8px", padding: "16px" }}>
            {testCases.map((testCase, index) => {
              const result = validateObject(ClientSchema, testCase.data);
              return (
                <div key={index} style={{
                  marginBottom: index < testCases.length - 1 ? "24px" : "0",
                  paddingBottom: index < testCases.length - 1 ? "24px" : "0",
                  borderBottom: index < testCases.length - 1 ? "1px solid #ddd" : "none"
                }}>
                  <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                    {testCase.name}
                  </div>
                  <div style={{
                    padding: "12px",
                    borderRadius: "4px",
                    backgroundColor: result.isValid ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${result.isValid ? "#10b981" : "#ef4444"}`
                  }}>
                    <div style={{
                      fontWeight: "bold",
                      marginBottom: "8px",
                      color: result.isValid ? "#059669" : "#dc2626"
                    }}>
                      {result.isValid ? "✓ Valid" : `✗ Invalid (${result.errors.length} error${result.errors.length === 1 ? "" : "s"})`}
                    </div>
                    {result.errors.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9em" }}>
                        {result.errors.map((error, errIndex) => (
                          <li key={errIndex} style={{ marginBottom: "4px" }}>
                            <strong>{error.path.length > 0 ? error.path.join(".") : "root"}:</strong> {error.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="text-2xl font-bold mt-8">Read-Only View</h2>
          <div style={{ border: "2px solid #333", borderRadius: "8px", padding: "16px" }}>
            <ReadOnlyRender
              schema={ClientSchema}
              value={data}
            />
          </div>

          <h2 className="text-2xl font-bold mt-8">Schema Documentation</h2>
          <div style={{ border: "2px solid #333", borderRadius: "8px", padding: "16px" }}>
            <SchemaDocumentation
              schemas={[
                {
                  name: "PersonSchema",
                  schema: ClientSchema,
                  description: "Main person schema with name, sex, and addresses"
                }
              ]}
            />
          </div>

          <h2 className="text-2xl font-bold mt-8">Audit Diff (vs initial data)</h2>
          <pre style={{ border: "2px solid #333", borderRadius: "8px", padding: "16px", backgroundColor: "#0f172a", color: "#f8fafc", maxHeight: "300px", overflow: "auto" }}>
            {JSON.stringify(auditDiff, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  );
}


