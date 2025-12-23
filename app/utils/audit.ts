/**
 * BUSINESS REQUIREMENTS SPECIFICATION
 * 
 * Purpose: Generate audit trail of changes between old and new data values for compliance and tracking.
 * 
 * Requirements:
 * 1. Compare old and new values recursively following schema structure
 * 2. Detect changes at any nested level (objects, arrays, union variants)
 * 3. Generate human-readable change records with field labels and formatted paths
 * 4. Format display values appropriately (e.g., enum options show labels, not keys)
 * 5. Handle complex types: arrays compare item-by-item, unions resolve to correct variant
 * 6. Skip unchanged fields to keep audit trail concise
 * 7. Return structured change list with paths, labels, and old/new values
 * 
 * How It Works:
 * - Recursively walks schema structure comparing old vs new values at each level
 * - For objects: compares each field, for arrays: compares each item by index
 * - For unions: resolves variant based on discriminator field
 * - When values differ, creates audit change record with schema-derived label and formatted path
 * - Formats values for display (enum keys → labels, undefined → null)
 * - Returns array of all detected changes with user-friendly presentation
 */

import type { Schema, UnionSchema } from "~/models/base_schema_types";

export type AuditChange = {
    label: string;
    path: string;
    oldValue: unknown;
    newValue: unknown;
};

/**
 * Generate audit diff between old and new values
 * 
 * Flow:
 * 1. Recursively walk schema structure comparing old vs new values
 * 2. Handle complex types: unions resolve variants, arrays compare by index, objects compare fields
 * 3. When values differ, create audit change record with label, path, and formatted values
 * 4. Format paths (e.g., ["addresses", 0, "street"] → "addresses.[0].street")
 * 5. Format display values (enum keys → labels, undefined → null)
 * 6. Return array of all detected changes
 */
export function generateAuditDiff(schema: Schema, oldValue: any, newValue: any): AuditChange[] {
    const changes: AuditChange[] = [];

    const walk = (nodeSchema: Schema, previous: any, current: any, path: (string | number)[]) => {
        // Handle union types: resolve variant based on discriminator
        if (nodeSchema.type === "union") {
            const variant = resolveVariant(nodeSchema, previous, current);
            walk(variant, previous, current, path);
            return;
        }

        // Handle arrays: compare each item by index
        if (nodeSchema.type === "array") {
            const length = Math.max(previous?.length ?? 0, current?.length ?? 0);
            for (let index = 0; index < length; index++) {
                walk(
                    nodeSchema.itemSchema,
                    previous?.[index],
                    current?.[index],
                    [...path, index]
                );
            }
            return;
        }

        // Handle objects: compare each field recursively
        if (nodeSchema.type === "object") {
            for (const [fieldName, fieldSchema] of Object.entries(nodeSchema.fields)) {
                // Skip description field - it's computed and shouldn't be tracked in audit
                if (fieldName === "description") {
                    continue;
                }
                if (previous?.[fieldName] === undefined && current?.[fieldName] === undefined) {
                    continue;
                }
                walk(
                    fieldSchema,
                    previous?.[fieldName],
                    current?.[fieldName],
                    [...path, fieldName]
                );
            }
            return;
        }

        // Leaf value: compare and record change if different
        // Skip description field - it's computed and shouldn't be tracked in audit
        const fieldName = path[path.length - 1];
        if (fieldName === "description") {
            return;
        }

        if (!valuesEqual(previous, current)) {
            changes.push({
                label: nodeSchema.label ?? toLabel(path[path.length - 1]),
                path: formatPath(path),
                oldValue: formatDisplayValue(nodeSchema, previous),
                newValue: formatDisplayValue(nodeSchema, current)
            });
        }
    };

    walk(schema, oldValue, newValue, []);

    return changes;
}

function resolveVariant(schema: UnionSchema, previous: any, current: any) {
    const candidate = current ?? previous;
    if (candidate && typeof candidate === "object") {
        const match = schema.variants.find(
            variant => candidate[variant.discriminator] === variant.value
        );
        if (match) {
            return match;
        }
    }
    const altCandidate = previous ?? current;
    if (altCandidate && typeof altCandidate === "object") {
        const match = schema.variants.find(
            variant => altCandidate[variant.discriminator] === variant.value
        );
        if (match) {
            return match;
        }
    }
    return schema.variants[0];
}

function valuesEqual(a: unknown, b: unknown) {
    return a === b;
}

function formatDisplayValue(schema: Schema, value: unknown) {
    if (value === undefined) {
        return null;
    }

    if (schema.type === "enum" && schema.options) {
        if (value === null) {
            return null;
        }
        const display = schema.options[String(value)];
        return display ?? value;
    }

    return value;
}

function formatPath(path: (string | number)[]) {
    return path
        .map(segment => typeof segment === "number" ? `[${segment}]` : segment)
        .join(".");
}

function toLabel(segment?: string | number) {
    if (segment === undefined) {
        return "Value";
    }
    if (typeof segment === "number") {
        return `Item ${segment + 1}`;
    }
    return segment.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}

