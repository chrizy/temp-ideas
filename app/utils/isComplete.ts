/**
 * BUSINESS REQUIREMENTS SPECIFICATION
 * 
 * Purpose: Validate form section completion based on configurable field requirements per user group.
 * 
 * Requirements:
 * 1. Each form section can have multiple fields that may be required for completion
 * 2. Field requirements are configurable per user group (via Group.section_field_requirements)
 * 3. Only enabled fields for a group are validated (disabled fields are ignored)
 * 4. Field paths support nested objects, arrays (with [] notation), and union types
 * 5. Empty strings, null, undefined, and empty arrays are considered missing values
 * 6. Returns completion status and list of missing required fields with user-friendly labels
 * 
 * How It Works:
 * - Master configuration defines all possible sections and their fields (isCompleteSections.ts)
 * - Group configuration enables/disables specific fields per section (Group.section_field_requirements)
 * - For each enabled field, the system resolves the field path in the data structure
 * - Path resolution handles arrays (expands [] to all items) and union type variants
 * - Missing fields are collected and returned with schema-derived labels for display
 */

import type { Schema } from "~/models/base_schema_types";
import { resolveFieldSchema } from "~/models/base_schema_types";
import type { Group, GroupSectionFieldRequirements } from "~/models/admin/group";
import {
    getSectionFields,
    getFieldRequirement,
    type SectionFieldRequirement
} from "~/models/config/isCompleteSections";

/**
 * Missing field information
 */
export type MissingField = {
    path: (string | number)[];
    fieldLabel: string;
};

/**
 * Section completion result
 */
export type SectionCompletionResult = {
    complete: boolean;
    missing: MissingField[];
};

/**
 * Check if a field value is present (empty string is NOT valid)
 */
function isFieldValuePresent(value: any): boolean {
    if (value === undefined || value === null) {
        return false;
    }
    if (typeof value === "string" && value === "") {
        return false;
    }
    if (Array.isArray(value) && value.length === 0) {
        return false;
    }
    if (typeof value === "object" && !Array.isArray(value)) {
        // For objects, check if it has any properties
        return Object.keys(value).length > 0;
    }
    return true;
}

/**
 * Safely get a nested value from an object using a path
 */
function getNestedValue(obj: any, path: (string | number)[]): any {
    let current = obj;
    for (const segment of path) {
        if (current === undefined || current === null) {
            return undefined;
        }
        if (Array.isArray(current)) {
            if (typeof segment === "number") {
                current = current[segment];
            } else {
                return undefined;
            }
        } else if (typeof current === "object") {
            current = current[segment];
        } else {
            return undefined;
        }
    }
    return current;
}


/**
 * Resolve a field path string to actual paths in the data
 * Handles [] notation for arrays (expands to all items)
 * Returns array of paths: [["field"], ["addresses", 0, "street"], ["addresses", 1, "street"]]
 */
function resolveFieldPaths(fieldPath: string, schema: Schema, data: any): (string | number)[][] {
    const paths: (string | number)[][] = [];

    // Split the path into segments
    const segments: (string | "[]")[] = [];
    let current = "";

    for (let i = 0; i < fieldPath.length; i++) {
        const char = fieldPath[i];
        if (char === ".") {
            if (current) {
                segments.push(current);
                current = "";
            }
        } else if (char === "[") {
            if (current) {
                segments.push(current);
                current = "";
            }
            // Find closing bracket
            let bracketContent = "";
            i++;
            while (i < fieldPath.length && fieldPath[i] !== "]") {
                bracketContent += fieldPath[i];
                i++;
            }
            if (bracketContent === "") {
                segments.push("[]");
            } else {
                const index = parseInt(bracketContent, 10);
                if (!isNaN(index)) {
                    segments.push(`[${index}]`);
                }
            }
        } else {
            current += char;
        }
    }

    if (current) {
        segments.push(current);
    }

    // Build paths, expanding [] to actual array indices
    function buildPaths(
        currentPath: (string | number)[],
        remainingSegments: (string | "[]")[],
        currentSchema: Schema,
        currentData: any
    ): void {
        if (remainingSegments.length === 0) {
            paths.push([...currentPath]);
            return;
        }

        const segment = remainingSegments[0];
        const rest = remainingSegments.slice(1);

        if (segment === "[]") {
            // Array expansion - need to find the array in current data
            if (currentSchema.type === "array") {
                if (Array.isArray(currentData) && currentData.length > 0) {
                    // Check ALL items in the array
                    currentData.forEach((item: any, index: number) => {
                        // Resolve union variant if itemSchema is a union
                        let itemSchema = currentSchema.itemSchema;
                        if (itemSchema.type === "union" && item && typeof item === "object") {
                            const variant = itemSchema.variants.find(
                                v => item[v.discriminator] === v.value
                            );
                            if (variant) {
                                itemSchema = variant;
                            } else {
                                // Default to first variant if no match
                                itemSchema = itemSchema.variants[0];
                            }
                        }
                        buildPaths(
                            [...currentPath, index],
                            rest,
                            itemSchema,
                            item
                        );
                    });
                } else if (currentData === undefined || currentData === null) {
                    // Array field is missing - create a placeholder path to mark it as missing
                    // Use first variant if union
                    let itemSchema = currentSchema.itemSchema;
                    if (itemSchema.type === "union") {
                        itemSchema = itemSchema.variants[0];
                    }
                    buildPaths(
                        [...currentPath, 0],
                        rest,
                        itemSchema,
                        undefined
                    );
                }
                // If array is empty (but exists), skip validation
                // (no items to check, so nothing is missing)
            }
        } else if (segment.startsWith("[") && segment.endsWith("]")) {
            // Specific array index
            const index = parseInt(segment.slice(1, -1), 10);
            if (!isNaN(index)) {
                const itemData = Array.isArray(currentData) ? currentData[index] : undefined;
                let itemSchema = currentSchema.type === "array" ? currentSchema.itemSchema : currentSchema;
                // Resolve union variant if itemSchema is a union
                if (itemSchema.type === "union" && itemData && typeof itemData === "object") {
                    const variant = itemSchema.variants.find(
                        v => itemData[v.discriminator] === v.value
                    );
                    if (variant) {
                        itemSchema = variant;
                    } else {
                        itemSchema = itemSchema.variants[0];
                    }
                }
                buildPaths(
                    [...currentPath, index],
                    rest,
                    itemSchema,
                    itemData
                );
            }
        } else {
            // Regular field
            if (currentSchema.type === "union") {
                // For unions, we need to resolve based on discriminator
                if (currentData && typeof currentData === "object") {
                    const variant = currentSchema.variants.find(
                        v => currentData[v.discriminator] === v.value
                    );
                    if (variant && segment in variant.fields) {
                        buildPaths(
                            [...currentPath, segment],
                            rest,
                            variant.fields[segment],
                            currentData[segment]
                        );
                    }
                } else {
                    // No data, try first variant
                    const variant = currentSchema.variants[0];
                    if (variant && segment in variant.fields) {
                        buildPaths(
                            [...currentPath, segment],
                            rest,
                            variant.fields[segment],
                            undefined
                        );
                    }
                }
            } else if (currentSchema.type === "object" && segment in currentSchema.fields) {
                buildPaths(
                    [...currentPath, segment],
                    rest,
                    currentSchema.fields[segment],
                    currentData && typeof currentData === "object" ? currentData[segment] : undefined
                );
            } else if (currentSchema.type === "array") {
                // If we're accessing a field on array items (shouldn't happen if path is correct, but handle gracefully)
                if (Array.isArray(currentData)) {
                    currentData.forEach((item: any, index: number) => {
                        buildPaths(
                            [...currentPath, index, segment],
                            rest,
                            currentSchema.itemSchema,
                            item
                        );
                    });
                }
            }
            // If schema type doesn't match, path is invalid - skip it
        }
    }

    try {
        buildPaths([], segments, schema, data);
    } catch (error) {
        // If path resolution fails, return empty array (field path is invalid)
        console.warn(`Failed to resolve field path "${fieldPath}":`, error);
    }

    return paths;
}

/**
 * Get field label from schema path
 */
function getFieldLabel(schema: Schema, path: (string | number)[]): string {
    try {
        const fieldSchema = resolveFieldSchema(schema, path);
        return fieldSchema.label || path[path.length - 1].toString();
    } catch {
        return path.join(".");
    }
}

/**
 * Check section completion based on group field requirements
 * 
 * Flow:
 * 1. Load section definition from master config (contains all possible fields)
 * 2. Get group-specific enabled fields for this section
 * 3. For each enabled field, resolve its path(s) in the data (handles arrays/unions)
 * 4. Check if value is present at each resolved path
 * 5. Collect missing fields with user-friendly labels
 * 
 * @param data - The data object to check (e.g., Client object)
 * @param groupConfig - The Group configuration with section_field_requirements
 * @param sectionId - The section ID to check (e.g., "fact_find.personal_details")
 * @param schema - The schema definition for the data
 * @returns Section completion result with complete flag and missing fields list
 */
export function checkSectionCompletion(
    data: any,
    groupConfig: Group,
    sectionId: string
): SectionCompletionResult {
    const missing: MissingField[] = [];

    // Step 1: Get section definition from master list (defines all possible fields)
    const sectionDefinition = getSectionFields(sectionId);
    if (!sectionDefinition) {
        return { complete: true, missing: [] };
    }

    const schema = sectionDefinition.schema;

    // Step 2: Get group-specific enabled fields for this section
    const groupSectionConfig = groupConfig.section_field_requirements?.find(
        (req: GroupSectionFieldRequirements) => req.section_id === sectionId
    );

    if (!groupSectionConfig || !groupSectionConfig.enabled_field_ids || groupSectionConfig.enabled_field_ids.length === 0) {
        // No requirements enabled, section is complete
        return { complete: true, missing: [] };
    }

    // Step 3-5: Validate each enabled field
    for (const fieldId of groupSectionConfig.enabled_field_ids) {
        const fieldRequirement = getFieldRequirement(sectionId, fieldId);
        if (!fieldRequirement) {
            continue;
        }

        // Resolve field path(s) - expands arrays ([]) and handles union variants
        const paths = resolveFieldPaths(fieldRequirement.field_path, schema, data);

        // Check each resolved path for missing values
        for (const path of paths) {
            const value = getNestedValue(data, path);
            if (!isFieldValuePresent(value)) {
                const fieldLabel = getFieldLabel(schema, path);
                missing.push({ path, fieldLabel });
            }
        }
    }

    return {
        complete: missing.length === 0,
        missing
    };
}
