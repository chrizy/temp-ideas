import React from "react";
import type {
    Schema,
    StringValidation,
    NumberValidation,
    BooleanValidation,
    EnumValidation,
    DateValidation,
    DateTimeValidation,
    ArrayValidation,
    ObjectValidation,
    UnionValidation
} from "~/models/base_schema_types";

interface SchemaDoc {
    name: string;
    schema: Schema;
    description?: string;
}

interface SchemaDocumentationProps {
    schemas: SchemaDoc[];
}

export function SchemaDocumentation({ schemas }: SchemaDocumentationProps) {
    return (
        <div style={{ padding: "20px" }}>
            <h1 style={{ fontSize: "2em", marginBottom: "20px" }}>Schema Documentation</h1>
            {schemas.map(({ name, schema, description }) => (
                <div key={name} style={{ marginBottom: "40px" }}>
                    <h2 style={{ fontSize: "1.5em", marginBottom: "10px", borderBottom: "2px solid #ddd", paddingBottom: "8px" }}>
                        {name}
                    </h2>
                    {description && (
                        <p style={{ marginBottom: "15px", fontStyle: "italic" }}>
                            {description}
                        </p>
                    )}
                    {renderSchema(schema, name)}
                </div>
            ))}
        </div>
    );
}

function renderSchema(schema: Schema, schemaName: string, depth: number = 0): React.ReactNode {
    const indent = depth * 20;

    // Schema metadata table
    const metadataRows: React.ReactNode[] = [
        <tr key="type">
            <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", width: "30%" }}>
                Type
            </td>
            <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                <code style={{ padding: "2px 6px", borderRadius: "3px" }}>
                    {schema.type}
                </code>
            </td>
        </tr>
    ];

    if (schema.label) {
        metadataRows.push(
            <tr key="label">
                <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", width: "30%" }}>
                    Label
                </td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {schema.label}
                </td>
            </tr>
        );
    }

    if (schema.validation) {
        metadataRows.push(
            <tr key="validation">
                <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", width: "30%" }}>
                    Validation
                </td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {renderValidation(schema.validation)}
                </td>
            </tr>
        );
    }

    // Type-specific fields
    if (schema.type === "enum" && schema.options) {
        metadataRows.push(
            <tr key="options">
                <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", width: "30%", verticalAlign: "top" }}>
                    Options
                </td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "4px" }}>
                        <thead>
                            <tr>
                                <th style={{ padding: "6px", border: "1px solid #ddd", textAlign: "left" }}>Value</th>
                                <th style={{ padding: "6px", border: "1px solid #ddd", textAlign: "left" }}>Label</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(schema.options).map(([value, label]) => (
                                <tr key={value}>
                                    <td style={{ padding: "6px", border: "1px solid #ddd" }}>
                                        <code style={{ padding: "2px 4px", borderRadius: "2px" }}>{value}</code>
                                    </td>
                                    <td style={{ padding: "6px", border: "1px solid #ddd" }}>
                                        {label}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </td>
            </tr>
        );
    }

    if (schema.type === "object") {
        metadataRows.push(
            <tr key="fields">
                <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", width: "30%", verticalAlign: "top" }}>
                    Fields
                </td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={{ padding: "6px", border: "1px solid #ddd", textAlign: "left" }}>Field Name</th>
                                <th style={{ padding: "6px", border: "1px solid #ddd", textAlign: "left" }}>Schema</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(schema.fields).map(([fieldName, fieldSchema]) => (
                                <tr key={fieldName}>
                                    <td style={{ padding: "6px", border: "1px solid #ddd", fontWeight: "bold" }}>
                                        {fieldName}
                                    </td>
                                    <td style={{ padding: "6px", border: "1px solid #ddd" }}>
                                        <div style={{ marginLeft: `${indent}px` }}>
                                            {renderSchema(fieldSchema, `${schemaName}.${fieldName}`, depth + 1)}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </td>
            </tr>
        );
    }

    if (schema.type === "array") {
        metadataRows.push(
            <tr key="itemSchema">
                <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", width: "30%", verticalAlign: "top" }}>
                    Item Schema
                </td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    <div style={{ marginLeft: `${indent}px` }}>
                        {renderSchema(schema.itemSchema, `${schemaName}[]`, depth + 1)}
                    </div>
                </td>
            </tr>
        );
    }

    if (schema.type === "union") {
        metadataRows.push(
            <tr key="variants">
                <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", width: "30%", verticalAlign: "top" }}>
                    Variants
                </td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                    {schema.variants.map((variant, index) => (
                        <div key={index} style={{ marginBottom: "20px", padding: "12px", border: "1px solid #ddd", borderRadius: "4px" }}>
                            <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                                Variant {index + 1}: {variant.discriminator} = {String(variant.value)}
                            </div>
                            <div style={{ marginLeft: `${indent}px` }}>
                                {renderSchema(variant, `${schemaName}.variant${index}`, depth + 1)}
                            </div>
                        </div>
                    ))}
                </td>
            </tr>
        );
    }

    return (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: depth === 0 ? "0" : "10px" }}>
            <tbody>{metadataRows}</tbody>
        </table>
    );
}

function renderValidation(
    validation: StringValidation | NumberValidation | BooleanValidation | EnumValidation | DateValidation | DateTimeValidation | ArrayValidation | ObjectValidation | UnionValidation
): React.ReactNode {
    const rules: string[] = [];

    if (validation.required) rules.push("Required");

    // String/Array validations
    if ('minLength' in validation && validation.minLength !== undefined) {
        rules.push(`Min Length: ${validation.minLength}`);
    }
    if ('maxLength' in validation && validation.maxLength !== undefined) {
        rules.push(`Max Length: ${validation.maxLength}`);
    }
    if ('pattern' in validation && validation.pattern) {
        rules.push(`Pattern: ${validation.pattern}`);
    }

    // Number validations
    if ('min' in validation && validation.min !== undefined) {
        rules.push(`Min: ${validation.min}`);
    }
    if ('max' in validation && validation.max !== undefined) {
        rules.push(`Max: ${validation.max}`);
    }

    // Date/DateTime validations
    if ('minDate' in validation && validation.minDate) {
        rules.push(`Min Date: ${validation.minDate}`);
    }
    if ('maxDate' in validation && validation.maxDate) {
        rules.push(`Max Date: ${validation.maxDate}`);
    }

    if (validation.custom) rules.push("Custom validator");

    if (rules.length === 0) {
        return <em>No validation rules</em>;
    }

    return (
        <ul style={{ margin: 0, paddingLeft: "20px" }}>
            {rules.map((rule, index) => (
                <li key={index}>{rule}</li>
            ))}
        </ul>
    );
}

