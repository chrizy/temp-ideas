/**
 * BUSINESS REQUIREMENTS SPECIFICATION
 * 
 * Purpose: Validate form data against schema definitions and compute derived values.
 * 
 * Requirements:
 * 1. Validate all field types (string, number, boolean, enum, date, datetime, array, object, union)
 * 2. Support validation rules: required, min/max, patterns, custom validators
 * 3. Provide user-friendly error messages with field labels and paths
 * 4. Skip validation for computed fields (system-generated, not user input)
 * 5. Recursively validate nested objects, arrays, and union variants
 * 6. Apply computed values after validation (derived fields calculated from input)
 * 7. Handle complex types: arrays expand to validate each item, unions resolve to variants
 * 
 * How It Works:
 * - Schema defines validation rules per field type (validation property)
 * - validateObject() recursively traverses the schema and data structure
 * - Each field type has a dedicated validator (validateString, validateNumber, etc.)
 * - Errors are collected with paths (e.g., ["addresses", 0, "street"]) and user-friendly labels
 * - Computed values are applied post-validation using registered computation functions
 * - Returns validation result with errors array and data with computed fields applied
 */

import type { Schema, StringValidation, NumberValidation, BooleanValidation, EnumValidation, DateValidation, DateTimeValidation, ArrayValidation, ObjectValidation, UnionValidation } from "~/models/base_schema_types";
import { resolveFieldSchema } from "~/models/base_schema_types";

/**
 * Computation function type for computing values on object instances
 * Receives the object value and returns computed values to merge into the object
 */
export type ComputedValueFunction = (value: any) => Record<string, any>;

/**
 * Validation error for a specific field
 */
export type ValidationError = {
    path: (string | number)[]; // Field path (e.g., ["firstName"] or ["addresses", 0, "street"])
    message: string; // User-friendly error message
    fieldLabel?: string; // Human-readable field name
};

/**
 * Validation result containing all errors
 */
export type ValidationResult = {
    isValid: boolean;
    errors: ValidationError[];
};

/**
 * Check if a schema field is computed (not user input)
 */
function isComputedField(fieldSchema: Schema): boolean {
    return (
        (fieldSchema.type === "string" || fieldSchema.type === "boolean" || fieldSchema.type === "number") &&
        "computed" in fieldSchema &&
        (fieldSchema as any).computed === true
    );
}

/**
 * Get a user-friendly field label from a path
 */
function getFieldLabel(schema: Schema, path: (string | number)[], currentSchema?: Schema): string {
    if (path.length === 0) return "This field";

    try {
        const fieldSchema = resolveFieldSchema(schema, path);
        return fieldSchema.label || path[path.length - 1].toString();
    } catch (e) {
        // If path can't be resolved from root schema, try current schema
        // This handles cases like union variants where fields exist in the variant but not in root
        if (currentSchema) {
            if (currentSchema.type === "object") {
                // Try to resolve the last path segment from the current object schema
                const lastSegment = path[path.length - 1];
                if (typeof lastSegment === "string" && lastSegment in currentSchema.fields) {
                    const fieldSchema = currentSchema.fields[lastSegment];
                    return fieldSchema.label || lastSegment;
                }
            } else if (currentSchema.type === "union") {
                // For unions, we'd need to find the variant first, but that's complex
                // Just use the field name for now
            }
        }
        // Fallback: use the last path segment
        const lastSegment = path[path.length - 1];
        return typeof lastSegment === "string" ? lastSegment : lastSegment.toString();
    }
}

/**
 * Validate a string value
 */
function validateString(
    value: any,
    validation: StringValidation | undefined,
    fieldLabel: string
): string | null {
    if (!validation) return null;

    // Required check
    if (validation.required && (value === undefined || value === null || value === "")) {
        return `${fieldLabel} is required`;
    }

    // Skip other validations if value is empty (unless required)
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value !== "string") {
        return `${fieldLabel} must be text`;
    }

    // Min length
    if (validation.minLength !== undefined && value.length < validation.minLength) {
        return `${fieldLabel} must be at least ${validation.minLength} character${validation.minLength === 1 ? "" : "s"}`;
    }

    // Max length
    if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        return `${fieldLabel} must be no more than ${validation.maxLength} character${validation.maxLength === 1 ? "" : "s"}`;
    }

    // Pattern
    if (validation.pattern) {
        const regex = typeof validation.pattern === "string"
            ? new RegExp(validation.pattern)
            : validation.pattern;
        if (!regex.test(value)) {
            return `${fieldLabel} has an invalid format`;
        }
    }

    // Custom validator
    if (validation.custom) {
        const result = validation.custom(value);
        if (result !== true) {
            return typeof result === "string" ? result : `${fieldLabel} is invalid`;
        }
    }

    return null;
}

/**
 * Validate a number value
 */
function validateNumber(
    value: any,
    validation: NumberValidation | undefined,
    fieldLabel: string
): string | null {
    if (!validation) return null;

    // Required check
    if (validation.required && (value === undefined || value === null)) {
        return `${fieldLabel} is required`;
    }

    // Skip other validations if value is empty (unless required)
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value !== "number" || isNaN(value)) {
        return `${fieldLabel} must be a number`;
    }

    // Min
    if (validation.min !== undefined && value < validation.min) {
        return `${fieldLabel} must be at least ${validation.min}`;
    }

    // Max
    if (validation.max !== undefined && value > validation.max) {
        return `${fieldLabel} must be no more than ${validation.max}`;
    }

    // Custom validator
    if (validation.custom) {
        const result = validation.custom(value);
        if (result !== true) {
            return typeof result === "string" ? result : `${fieldLabel} is invalid`;
        }
    }

    return null;
}

/**
 * Validate a boolean value
 */
function validateBoolean(
    value: any,
    validation: BooleanValidation | undefined,
    fieldLabel: string
): string | null {
    if (!validation) return null;

    // Required check
    if (validation.required && (value === undefined || value === null)) {
        return `${fieldLabel} is required`;
    }

    // Skip other validations if value is empty (unless required)
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value !== "boolean") {
        return `${fieldLabel} must be true or false`;
    }

    // Custom validator
    if (validation.custom) {
        const result = validation.custom(value);
        if (result !== true) {
            return typeof result === "string" ? result : `${fieldLabel} is invalid`;
        }
    }

    return null;
}

/**
 * Validate an enum value
 */
function validateEnum(
    value: any,
    validation: EnumValidation | undefined,
    options: Record<string, string>,
    fieldLabel: string
): string | null {
    if (!validation) return null;

    // Required check
    if (validation.required && (value === undefined || value === null || value === "")) {
        return `${fieldLabel} is required`;
    }

    // Skip other validations if value is empty (unless required)
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value !== "string" || !(value in options)) {
        return `${fieldLabel} must be one of the available options`;
    }

    // Custom validator
    if (validation.custom) {
        const result = validation.custom(value);
        if (result !== true) {
            return typeof result === "string" ? result : `${fieldLabel} is invalid`;
        }
    }

    return null;
}

/**
 * Validate a date value
 */
function validateDate(
    value: any,
    validation: DateValidation | undefined,
    fieldLabel: string
): string | null {
    if (!validation) return null;

    // Required check
    if (validation.required && (value === undefined || value === null || value === "")) {
        return `${fieldLabel} is required`;
    }

    // Skip other validations if value is empty (unless required)
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value !== "string") {
        return `${fieldLabel} must be a date`;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
        return `${fieldLabel} must be a valid date (YYYY-MM-DD)`;
    }

    // Min date
    if (validation.minDate && value < validation.minDate) {
        const minDateFormatted = new Date(validation.minDate).toLocaleDateString();
        return `${fieldLabel} must be on or after ${minDateFormatted}`;
    }

    // Max date
    if (validation.maxDate && value > validation.maxDate) {
        const maxDateFormatted = new Date(validation.maxDate).toLocaleDateString();
        return `${fieldLabel} must be on or before ${maxDateFormatted}`;
    }

    // Future date check (default: prevent future dates unless allow_future is true)
    if (validation.allow_future !== true) {
        const today = new Date().toISOString().split('T')[0];
        if (value > today) {
            return `${fieldLabel} cannot be in the future`;
        }
    }

    // Custom validator
    if (validation.custom) {
        const result = validation.custom(value);
        if (result !== true) {
            return typeof result === "string" ? result : `${fieldLabel} is invalid`;
        }
    }

    return null;
}

/**
 * Validate a datetime value
 */
function validateDateTime(
    value: any,
    validation: DateTimeValidation | undefined,
    fieldLabel: string
): string | null {
    if (!validation) return null;

    // Required check
    if (validation.required && (value === undefined || value === null || value === "")) {
        return `${fieldLabel} is required`;
    }

    // Skip other validations if value is empty (unless required)
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value !== "string") {
        return `${fieldLabel} must be a date and time`;
    }

    // Validate datetime format (YYYY-MM-DD HH:MM:SS)
    const datetimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (!datetimeRegex.test(value)) {
        return `${fieldLabel} must be a valid date and time (YYYY-MM-DD HH:MM:SS)`;
    }

    // Min date
    if (validation.minDate && value < validation.minDate) {
        const minDateFormatted = new Date(validation.minDate.replace(" ", "T")).toLocaleString();
        return `${fieldLabel} must be on or after ${minDateFormatted}`;
    }

    // Max date
    if (validation.maxDate && value > validation.maxDate) {
        const maxDateFormatted = new Date(validation.maxDate.replace(" ", "T")).toLocaleString();
        return `${fieldLabel} must be on or before ${maxDateFormatted}`;
    }

    // Future date check (default: prevent future dates unless allow_future is true)
    if (validation.allow_future !== true) {
        const now = new Date();
        const todayDate = now.toISOString().split('T')[0];
        const todayTime = now.toTimeString().split(' ')[0];
        const today = `${todayDate} ${todayTime}`;
        if (value > today) {
            return `${fieldLabel} cannot be in the future`;
        }
    }

    // Custom validator
    if (validation.custom) {
        const result = validation.custom(value);
        if (result !== true) {
            return typeof result === "string" ? result : `${fieldLabel} is invalid`;
        }
    }

    return null;
}

/**
 * Validate an array value
 */
function validateArray(
    value: any,
    validation: ArrayValidation | undefined,
    itemSchema: Schema,
    rootSchema: Schema,
    path: (string | number)[],
    fieldLabel: string
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!validation) {
        // Still validate items even if no array-level validation
        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                const itemErrors = validateValue(item, itemSchema, rootSchema, [...path, index]);
                errors.push(...itemErrors);
            });
        }
        return errors;
    }

    // Required check
    if (validation.required && (value === undefined || value === null || !Array.isArray(value))) {
        return [{
            path,
            message: `${fieldLabel} is required`,
            fieldLabel
        }];
    }

    // Skip other validations if value is empty (unless required)
    if (value === undefined || value === null || !Array.isArray(value)) {
        return errors;
    }

    // Min length
    if (validation.minLength !== undefined && value.length < validation.minLength) {
        errors.push({
            path,
            message: `${fieldLabel} must have at least ${validation.minLength} item${validation.minLength === 1 ? "" : "s"}`,
            fieldLabel
        });
    }

    // Max length
    if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        errors.push({
            path,
            message: `${fieldLabel} must have no more than ${validation.maxLength} item${validation.maxLength === 1 ? "" : "s"}`,
            fieldLabel
        });
    }

    // Validate each item
    value.forEach((item, index) => {
        const itemErrors = validateValue(item, itemSchema, rootSchema, [...path, index]);
        errors.push(...itemErrors);
    });

    // Custom validator
    if (validation.custom) {
        const result = validation.custom(value);
        if (result !== true) {
            errors.push({
                path,
                message: typeof result === "string" ? result : `${fieldLabel} is invalid`,
                fieldLabel
            });
        }
    }

    return errors;
}

/**
 * Validate an object value (internal helper)
 */
function validateObjectValue(
    value: any,
    validation: ObjectValidation | undefined,
    fields: Record<string, Schema>,
    rootSchema: Schema,
    path: (string | number)[],
    fieldLabel: string
): ValidationError[] {
    const errors: ValidationError[] = [];

    // Create a temporary object schema for field label resolution
    const objectSchema: Schema = {
        type: "object",
        fields
    };

    if (!validation) {
        // Still validate fields even if no object-level validation
        if (value && typeof value === "object" && !Array.isArray(value)) {
            Object.entries(fields).forEach(([fieldName, fieldSchema]) => {
                // Skip validation for computed fields
                if (isComputedField(fieldSchema)) {
                    return;
                }
                const fieldErrors = validateValue(
                    value[fieldName],
                    fieldSchema,
                    rootSchema,
                    [...path, fieldName],
                    objectSchema
                );
                errors.push(...fieldErrors);
            });
        }
        return errors;
    }

    // Required check
    if (validation.required && (value === undefined || value === null)) {
        return [{
            path,
            message: `${fieldLabel} is required`,
            fieldLabel
        }];
    }

    // Skip other validations if value is empty (unless required)
    if (value === undefined || value === null) {
        return errors;
    }

    if (typeof value !== "object" || Array.isArray(value)) {
        errors.push({
            path,
            message: `${fieldLabel} must be an object`,
            fieldLabel
        });
        return errors;
    }

    // Validate each field - pass objectSchema as parentSchema for field label resolution
    // Skip computed fields as they are not user input
    Object.entries(fields).forEach(([fieldName, fieldSchema]) => {
        // Skip validation for computed fields
        if (isComputedField(fieldSchema)) {
            return;
        }
        const fieldErrors = validateValue(
            value[fieldName],
            fieldSchema,
            rootSchema,
            [...path, fieldName],
            objectSchema
        );
        errors.push(...fieldErrors);
    });

    // Custom validator
    if (validation.custom) {
        const result = validation.custom(value);
        if (result !== true) {
            errors.push({
                path,
                message: typeof result === "string" ? result : `${fieldLabel} is invalid`,
                fieldLabel
            });
        }
    }

    return errors;
}

/**
 * Validate a union value
 */
function validateUnion(
    value: any,
    validation: UnionValidation | undefined,
    variants: readonly any[],
    rootSchema: Schema,
    path: (string | number)[],
    fieldLabel: string
): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!validation) {
        // Still validate variant even if no union-level validation
        if (value && typeof value === "object") {
            const variant = variants.find(
                v => value[v.discriminator] === v.value
            ) || variants[0];
            // Use variant as rootSchema for nested field label resolution
            const variantErrors = validateValue(value, variant, variant, path, variant);
            errors.push(...variantErrors);
        }
        return errors;
    }

    // Required check
    if (validation.required && (value === undefined || value === null)) {
        return [{
            path,
            message: `${fieldLabel} is required`,
            fieldLabel
        }];
    }

    // Skip other validations if value is empty (unless required)
    if (value === undefined || value === null) {
        return errors;
    }

    if (typeof value !== "object" || Array.isArray(value)) {
        errors.push({
            path,
            message: `${fieldLabel} must be an object`,
            fieldLabel
        });
        return errors;
    }

    // Find matching variant
    const variant = variants.find(
        v => value[v.discriminator] === v.value
    );

    if (!variant) {
        errors.push({
            path,
            message: `${fieldLabel} has an invalid type`,
            fieldLabel
        });
        return errors;
    }

    // Validate the variant - use variant as rootSchema for nested field label resolution
    const variantErrors = validateValue(value, variant, variant, path, variant);
    errors.push(...variantErrors);

    // Custom validator
    if (validation.custom) {
        const result = validation.custom(value);
        if (result !== true) {
            errors.push({
                path,
                message: typeof result === "string" ? result : `${fieldLabel} is invalid`,
                fieldLabel
            });
        }
    }

    return errors;
}

/**
 * Validate a value against a schema (recursive core function)
 * 
 * Routes to type-specific validators and handles nested structures:
 * - Objects: validates each field recursively
 * - Arrays: validates each item recursively
 * - Unions: resolves variant and validates recursively
 */
function validateValue(
    value: any,
    schema: Schema,
    rootSchema: Schema,
    path: (string | number)[],
    parentSchema?: Schema
): ValidationError[] {
    const fieldLabel = getFieldLabel(rootSchema, path, parentSchema || schema);
    const errors: ValidationError[] = [];

    switch (schema.type) {
        case "string": {
            const error = validateString(value, schema.validation, fieldLabel);
            if (error) {
                errors.push({ path, message: error, fieldLabel });
            }
            break;
        }

        case "number": {
            const error = validateNumber(value, schema.validation, fieldLabel);
            if (error) {
                errors.push({ path, message: error, fieldLabel });
            }
            break;
        }

        case "boolean": {
            const error = validateBoolean(value, schema.validation, fieldLabel);
            if (error) {
                errors.push({ path, message: error, fieldLabel });
            }
            break;
        }

        case "enum": {
            const error = validateEnum(value, schema.validation, schema.options, fieldLabel);
            if (error) {
                errors.push({ path, message: error, fieldLabel });
            }
            break;
        }

        case "date": {
            const error = validateDate(value, schema.validation, fieldLabel);
            if (error) {
                errors.push({ path, message: error, fieldLabel });
            }
            break;
        }

        case "datetime": {
            const error = validateDateTime(value, schema.validation, fieldLabel);
            if (error) {
                errors.push({ path, message: error, fieldLabel });
            }
            break;
        }

        case "array": {
            const arrayErrors = validateArray(
                value,
                schema.validation,
                schema.itemSchema,
                rootSchema,
                path,
                fieldLabel
            );
            errors.push(...arrayErrors);
            break;
        }

        case "object": {
            const objectErrors = validateObjectValue(
                value,
                schema.validation,
                schema.fields,
                rootSchema,
                path,
                fieldLabel
            );
            errors.push(...objectErrors);
            break;
        }

        case "union": {
            const unionErrors = validateUnion(
                value,
                schema.validation,
                schema.variants,
                rootSchema,
                path,
                fieldLabel
            );
            errors.push(...unionErrors);
            break;
        }
    }

    return errors;
}

/**
 * Registry for schema computation functions
 * Maps schema objects to their computation functions
 */
const computationRegistry = new WeakMap<Schema, ComputedValueFunction>();

/**
 * Register a computation function for a schema
 * This function will be called during validateObject() to compute values
 * 
 * @param schema - The schema to register computation for
 * @param computeFn - Function that receives the object value and returns computed values
 * 
 * @example
 * ```ts
 * registerComputation(AddressSchema, (address) => ({
 *   is_valid: checkAddressValidity(address),
 *   formatted_address: formatAddress(address)
 * }));
 * ```
 */
export function registerComputation(
    schema: Schema,
    computeFn: ComputedValueFunction
): void {
    computationRegistry.set(schema, computeFn);
}

/**
 * Get computation function for a schema
 */
function getComputation(schema: Schema): ComputedValueFunction | undefined {
    return computationRegistry.get(schema);
}

/**
 * Apply computed values to an object based on its schema
 * Recursively processes nested objects and unions
 */
function applyComputedValues(
    value: any,
    schema: Schema,
    rootSchema: Schema
): any {
    // Handle array types first (before checking if value is array)
    if (schema.type === "array" && Array.isArray(value)) {
        return value.map((item: any) =>
            applyComputedValues(item, schema.itemSchema, rootSchema)
        );
    }

    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value;
    }

    let result = { ...value };

    // Handle union types - find the matching variant
    if (schema.type === "union") {
        const variant = schema.variants.find(
            v => value[v.discriminator] === v.value
        ) || schema.variants[0];

        if (variant) {
            // Recursively apply computations to variant fields
            Object.entries(variant.fields).forEach(([fieldName, fieldSchema]) => {
                if (isComputedField(fieldSchema)) {
                    // Skip computed fields in recursive processing - they'll be computed at the root level
                    return;
                }
                if (result[fieldName] !== undefined) {
                    result[fieldName] = applyComputedValues(
                        result[fieldName],
                        fieldSchema,
                        rootSchema
                    );
                }
            });

            // Apply computation for this union schema if registered
            const computeFn = getComputation(schema);
            if (computeFn) {
                const computed = computeFn(result);
                result = { ...result, ...computed };
            }

            // Apply description if schema has description function
            if (schema.description) {
                result.description = schema.description(result);
            }
        }
    }
    // Handle object types
    else if (schema.type === "object") {
        // Recursively apply computations to nested fields
        Object.entries(schema.fields).forEach(([fieldName, fieldSchema]) => {
            if (isComputedField(fieldSchema)) {
                // Skip computed fields in recursive processing
                return;
            }
            if (result[fieldName] !== undefined) {
                result[fieldName] = applyComputedValues(
                    result[fieldName],
                    fieldSchema,
                    rootSchema
                );
            }
        });

        // Apply computation for this object schema if registered
        const computeFn = getComputation(schema);
        if (computeFn) {
            const computed = computeFn(result);
            result = { ...result, ...computed };
        }

        // Apply description if schema has description function
        if (schema.description) {
            result.description = schema.description(result);
        }
    }

    return result;
}

/**
 * Validate an object against a schema
 * 
 * Flow:
 * 1. Recursively validate all fields against schema rules (required, min/max, patterns, custom)
 * 2. Collect errors with paths and user-friendly field labels
 * 3. Skip validation for computed fields (system-generated)
 * 4. Apply computed values after validation (derived fields from registered computation functions)
 * 5. Return validation result with errors and data including computed fields
 * 
 * @param schema - The schema to validate against
 * @param value - The value to validate (will be modified with computed values)
 * @returns Validation result with isValid flag and array of errors, and the value with computed fields applied
 * 
 * @example
 * ```ts
 * const result = validateObject(ClientSchema, clientData);
 * if (!result.isValid) {
 *   result.errors.forEach(error => {
 *     console.log(`${error.path.join('.')}: ${error.message}`);
 *   });
 * }
 * // result.value now contains computed fields
 * ```
 */
export function validateObject(
    schema: Schema,
    value: any
): ValidationResult & { value: any } {
    // Step 1-3: Validate all fields recursively, collecting errors
    const errors = validateValue(value, schema, schema, []);

    // Step 4: Apply computed values after validation
    const valueWithComputed = applyComputedValues(value, schema, schema);

    // Step 5: Return result with validation status and computed data
    return {
        isValid: errors.length === 0,
        errors,
        value: valueWithComputed
    };
}

