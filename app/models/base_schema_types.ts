


// Base validation properties shared across all types
type BaseValidation = {
    required?: boolean;
    custom?: (value: any) => boolean | string; // custom validator returning true or error message
};

// Type-specific validation rules
export type StringValidation = BaseValidation & {
    minLength?: number;
    maxLength?: number;
    pattern?: string | RegExp; // regex pattern (string or RegExp)
};

export type NumberValidation = BaseValidation & {
    min?: number;
    max?: number;
};

export type BooleanValidation = BaseValidation; // Only required and custom

export type EnumValidation = BaseValidation; // Only required and custom

export type DateValidation = BaseValidation & {
    // Date/DateTime validation (ISO date strings: YYYY-MM-DD for date, YYYY-MM-DD HH:MM:SS for datetime)
    minDate?: string; // ISO date string (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
    maxDate?: string; // ISO date string (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
    /** If true, dates can be in the future */
    allow_future?: boolean; // If false or undefined, dates cannot be in the future (default: false)
};

export type DateTimeValidation = DateValidation; // Same as DateValidation

export type ArrayValidation = BaseValidation & {
    minLength?: number; // Minimum number of items
    maxLength?: number; // Maximum number of items
};

export type ObjectValidation = BaseValidation; // Only required and custom

export type UnionValidation = BaseValidation; // Only required and custom

// Legacy type for backward compatibility (deprecated - use specific types instead)
/** @deprecated Use type-specific validation types instead (StringValidation, NumberValidation, etc.) */
export type ValidationRule = StringValidation | NumberValidation | BooleanValidation | EnumValidation | DateValidation | ArrayValidation | ObjectValidation | UnionValidation;

export type StringSchema = {
    type: "string";
    label?: string;
    validation?: StringValidation;
    computed?: boolean; // Mark field as computed (not user-input)
};

export type NumberSchema = {
    type: "number";
    label?: string;
    validation?: NumberValidation;
};

export type BooleanSchema = {
    type: "boolean";
    label?: string;
    validation?: BooleanValidation;
    computed?: boolean; // Mark field as computed (not user-input)
};

export type EnumSchema = {
    type: "enum";
    label?: string;
    options: Record<string, string>; // runtime options → union type
    validation?: EnumValidation;
};

/** Date Only */
export type DateSchema = {
    /** Date only */
    type: "date";
    label?: string;
    /** by default, dates cannot be in the future */
    validation?: DateValidation;
};

export type DateTimeSchema = {
    type: "datetime";
    label?: string;
    validation?: DateTimeValidation;
};

export type ObjectSchema = {
    type: "object";
    label?: string;
    fields: Record<string, Schema>;
    validation?: ObjectValidation;
    /** Optional function to compute a description string for this object */
    description?: (value: any) => string;
};

export type ArraySchema = {
    type: "array";
    label?: string;
    itemSchema: Schema;
    validation?: ArrayValidation;
};

// Union variant with type-safe discriminator value
export type UnionVariant<D extends string = string, V extends string | number | boolean = string | number | boolean> = {
    type: "object";
    discriminator: D;
    value: V;
    fields: Record<string, Schema>;
};

export type UnionSchema = {
    type: "union";
    label?: string;
    // Discriminated union variants
    variants: UnionVariant[] | readonly UnionVariant[];
    validation?: UnionValidation;
    /** Optional function to compute a description string for this union */
    description?: (value: any) => string;
};

export type Schema =
    | StringSchema
    | NumberSchema
    | BooleanSchema
    | EnumSchema
    | DateSchema
    | DateTimeSchema
    | ArraySchema
    | ObjectSchema
    | UnionSchema;


/**
 * Convert a single union variant to its type
 * This creates a discriminated union type where the discriminator field has the variant's value
 */
type UnionVariantToType<V> = V extends {
    type: "object";
    discriminator: infer D;
    value: infer Val;
    fields: infer F
}
    ? D extends string
    ? F extends Record<string, Schema>
    ? { [K in D]: Val } & {
        -readonly [K in keyof F as F[K] extends { validation: { required: true } } ? K : never]:
        SchemaToType<F[K]>
    } & {
        -readonly [K in keyof F as F[K] extends { validation: { required: true } } ? never : K]?:
        SchemaToType<F[K]> | null | undefined
    }
    : never
    : never
    : never;

/**
 * Convert an array of union variants to a discriminated union type
 */
type UnionVariantsToType<V extends readonly any[]> =
    V extends readonly [infer First, ...infer Rest]
    ? Rest extends readonly any[]
    ? UnionVariantToType<First> | UnionVariantsToType<Rest>
    : UnionVariantToType<First>
    : never;

/**
 * Convert a schema to a type
 * @param S - The schema to convert
 * @returns The type with optional properties and null/undefined allowed for non-required fields
 */
export type SchemaToType<S> =
    // primitives
    S extends { type: "string", validation?: { required: true } } ? string :
    S extends { type: "string" } ? string | null | undefined :

    S extends { type: "number", validation?: { required: true } } ? number :
    S extends { type: "number" } ? number | null | undefined :

    S extends { type: "boolean", validation?: { required: true } } ? boolean :
    S extends { type: "boolean" } ? boolean | null | undefined :

    S extends { type: "enum", options: infer O, validation?: { required: true } } ? keyof O :
    S extends { type: "enum", options: infer O } ? keyof O | null | undefined :

    // date types (stored as strings: YYYY-MM-DD for date, YYYY-MM-DD HH:MM:SS for datetime)
    S extends { type: "date", validation?: { required: true } } ? string :
    S extends { type: "date" } ? string | null | undefined :

    S extends { type: "datetime", validation?: { required: true } } ? string :
    S extends { type: "datetime" } ? string | null | undefined :

    // arrays
    S extends { type: "array", itemSchema: infer I, validation?: { required: true } }
    ? SchemaToType<I>[] :
    S extends { type: "array", itemSchema: infer I }
    ? SchemaToType<I>[] | null | undefined :

    // union - must check before object to avoid conflicts
    S extends { type: "union", variants: infer V, validation?: { required: true } }
    ? V extends readonly any[]
    ? UnionVariantsToType<V>
    : never :
    S extends { type: "union", variants: infer V }
    ? V extends readonly any[]
    ? UnionVariantsToType<V> | null | undefined
    : never :

    // union variant - must check before object to avoid conflicts
    S extends UnionVariant
    ? UnionVariantToType<S> :

    // object (but not union variant)
    S extends { type: "object", fields: infer F }
    ? S extends UnionVariant ? never // exclude union variants from this branch
    : {
        -readonly [K in keyof F as F[K] extends { validation: { required: true } } ? K : never]:
        SchemaToType<F[K]>
    } & {
        -readonly [K in keyof F as F[K] extends { validation: { required: true } } ? never : K]?:
        SchemaToType<F[K]> | null | undefined
    } :

    // nested plain object
    S extends Record<string, any>
    ? S extends Schema ? never // exclude schemas from this branch
    : { -readonly [K in keyof S]?: SchemaToType<S[K]> | null } :

    never;

/**  */
export function resolveFieldSchema(schema: Schema, path: (string | number)[], value?: any): Schema {
    let node: Schema = schema;
    let currentValue: any = value;

    for (let i = 0; i < path.length; i++) {
        const segment = path[i];

        // Union → choose correct variant based on value if available
        if (node.type === "union") {
            if (currentValue && typeof currentValue === "object") {
                const variant = node.variants.find(
                    v => currentValue[v.discriminator] === v.value
                );
                if (variant) {
                    node = variant;
                } else {
                    // default to first variant if no matching value
                    node = node.variants[0];
                }
            } else {
                // default to first variant if no value yet
                node = node.variants[0];
            }
            // After resolving union, continue processing the current segment with the variant
            // Don't continue to next iteration yet
        }

        // Array
        if (node.type === "array") {
            if (typeof segment === "number" && Array.isArray(currentValue)) {
                currentValue = currentValue[segment];
            }
            node = node.itemSchema;
            continue;
        }

        // Object
        if (node.type === "object") {
            if (typeof segment === "string" && segment in node.fields) {
                if (currentValue && typeof currentValue === "object") {
                    currentValue = currentValue[segment];
                }
                node = node.fields[segment];
                continue;
            } else {
                throw new Error(`Path segment "${segment}" does not exist in object schema`);
            }
        }

        throw new Error(`Cannot resolve path segment "${segment}" for schema type "${node.type}"`);
    }

    return node;
}


