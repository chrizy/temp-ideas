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
            const itemSchema = nodeSchema.itemSchema;

            // Try to detect an ID field for array items based on schema convention:
            // the first field in the item schema (object or first union variant).
            const idFieldName = getItemIdFieldName(itemSchema);

            const prevArray = Array.isArray(previous) ? previous : [];
            const currArray = Array.isArray(current) ? current : [];

            if (idFieldName && prevArray.length > 0 || idFieldName && currArray.length > 0) {
                const prevById = new Map<string, any>();
                const currById = new Map<string, any>();
                let missingId = false;

                for (const item of prevArray) {
                    if (item && typeof item === "object" && !Array.isArray(item)) {
                        const idValue = (item as any)[idFieldName];
                        if (idValue === null || idValue === undefined || idValue === "") {
                            missingId = true;
                        } else {
                            prevById.set(String(idValue), item);
                        }
                    } else if (item !== undefined && item !== null) {
                        missingId = true;
                    }
                }

                for (const item of currArray) {
                    if (item && typeof item === "object" && !Array.isArray(item)) {
                        const idValue = (item as any)[idFieldName];
                        if (idValue === null || idValue === undefined || idValue === "") {
                            missingId = true;
                        } else {
                            currById.set(String(idValue), item);
                        }
                    } else if (item !== undefined && item !== null) {
                        missingId = true;
                    }
                }

                // Only use ID-based diffing when all items have IDs; otherwise, fall back to index-based.
                if (!missingId) {
                    const allIds = new Set<string>([
                        ...prevById.keys(),
                        ...currById.keys()
                    ]);

                    for (const id of allIds) {
                        const prevItem = prevById.get(id);
                        const currItem = currById.get(id);

                        const arrayKey = path[path.length - 1];
                        const itemSegment =
                            typeof arrayKey === "string"
                                ? `${arrayKey}[id=${id}]`
                                : `[id=${id}]`;
                        const itemPath =
                            arrayKey !== undefined
                                ? [...path.slice(0, -1), itemSegment]
                                : [itemSegment];

                        walk(
                            itemSchema,
                            prevItem,
                            currItem,
                            itemPath
                        );
                    }
                    return;
                }
            }

            // Fallback: compare by index when we can't safely match by ID
            const length = Math.max(prevArray.length, currArray.length);
            for (let index = 0; index < length; index++) {
                walk(
                    nodeSchema.itemSchema,
                    prevArray[index],
                    currArray[index],
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

/**
 * Infer the logical ID field name for array items based on schema.
 * Convention: the first field defined in the item schema (object or first union variant).
 */
function getItemIdFieldName(itemSchema: Schema): string | undefined {
    if (itemSchema.type === "object") {
        const fieldNames = Object.keys(itemSchema.fields);
        return fieldNames[0];
    }
    if (itemSchema.type === "union" && itemSchema.variants.length > 0) {
        const firstVariant = itemSchema.variants[0];
        const fieldNames = Object.keys(firstVariant.fields);
        return fieldNames[0];
    }
    return undefined;
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

