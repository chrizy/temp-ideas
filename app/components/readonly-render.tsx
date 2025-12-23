import React from "react";
import { resolveFieldSchema, type Schema } from "~/models/base_schema_types";

interface ReadOnlyRenderProps {
    schema: Schema;
    value: any;
    path?: (string | number)[];
}

export function ReadOnlyRender({ schema, value, path = [] }: ReadOnlyRenderProps) {
    const fieldSchema = resolveFieldSchema(schema, path, value);
    return renderValue(fieldSchema, value, schema, path);
}

function renderValue(
    schema: Schema,
    value: any,
    rootSchema: Schema,
    rootPath: (string | number)[]
): React.ReactNode {
    // Handle null/undefined
    if (value === null || value === undefined) {
        return (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                    <tr>
                        <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", width: "30%" }}>
                            {schema.label || "Value"}
                        </td>
                        <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                            <em>Not set</em>
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    }

    // UNION - resolve to correct variant
    if (schema.type === "union") {
        if (value && typeof value === "object") {
            const variant = schema.variants.find(
                v => value[v.discriminator] === v.value
            );
            if (variant) {
                return renderValue(variant, value, rootSchema, rootPath);
            }
        }
        // Fallback to first variant if no match
        return renderValue(schema.variants[0], value, rootSchema, rootPath);
    }

    // OBJECT - render nested fields
    if (schema.type === "object") {
        const rows: React.ReactNode[] = [];

        for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
            const fieldValue = value[fieldName];
            // Skip fields that are null or undefined (Not set)
            if (fieldValue === null || fieldValue === undefined) {
                continue;
            }
            const fieldPath = [...rootPath, fieldName];
            // Try to resolve from root schema, but if that fails (e.g., for union variants),
            // use the field schema directly
            let resolvedSchema: Schema;
            try {
                resolvedSchema = resolveFieldSchema(rootSchema, fieldPath, fieldValue);
            } catch {
                // If path resolution fails (e.g., for union variant fields), use the field schema directly
                resolvedSchema = fieldSchema;
            }

            rows.push(
                <tr key={fieldName}>
                    <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", width: "30%" }}>
                        {resolvedSchema.label || fieldName}
                    </td>
                    <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                        {renderValue(resolvedSchema, fieldValue, rootSchema, fieldPath)}
                    </td>
                </tr>
            );
        }

        // If no rows to display (all fields were null/undefined), return null
        if (rows.length === 0) {
            return null;
        }

        return (
            <table style={{ width: "100%", borderCollapse: "collapse", margin: "4px 0" }}>
                <tbody>{rows}</tbody>
            </table>
        );
    }

    // ARRAY - render each item
    if (schema.type === "array") {
        if (!Array.isArray(value) || value.length === 0) {
            return (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", width: "30%" }}>
                                {schema.label || "Items"}
                            </td>
                            <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                                <em>No items</em>
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        }

        return (
            <div>
                {schema.label && (
                    <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                        {schema.label} ({value.length} {value.length === 1 ? "item" : "items"})
                    </div>
                )}
                {value.map((item: any, index: number) => (
                    <div key={index} style={{ marginBottom: "16px", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}>
                        <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#666" }}>
                            Item {index + 1}
                        </div>
                        {renderValue(schema.itemSchema, item, rootSchema, [...rootPath, index])}
                    </div>
                ))}
            </div>
        );
    }

    // PRIMITIVES - render simple values
    let displayValue: React.ReactNode = value;

    if (schema.type === "boolean") {
        displayValue = value ? "Yes" : "No";
    } else if (schema.type === "enum" && schema.options) {
        // Display the label from options if available
        displayValue = schema.options[value] || value;
    } else if (schema.type === "number") {
        displayValue = value.toString();
    } else if (schema.type === "date") {
        // Format date string (YYYY-MM-DD) for display
        if (value && typeof value === "string") {
            try {
                const date = new Date(value + "T00:00:00Z");
                displayValue = date.toLocaleDateString();
            } catch {
                displayValue = value;
            }
        }
    } else if (schema.type === "datetime") {
        // Format datetime string (YYYY-MM-DD HH:MM:SS) for display
        if (value && typeof value === "string") {
            try {
                // Convert YYYY-MM-DD HH:MM:SS to ISO format for Date parsing
                const isoString = value.replace(" ", "T") + "Z";
                const date = new Date(isoString);
                displayValue = date.toLocaleString();
            } catch {
                displayValue = value;
            }
        }
    }

    return (
        <span>{displayValue}</span>
    );
}

