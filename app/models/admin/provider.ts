import type { ObjectSchema, SchemaToType, ArraySchema } from "../base_schema_types";
import { BusinessTypesSchema } from "./group";

export const BusinessTypeSchema = {
    type: "object" as const,
    fields: {
        type: {
            ...BusinessTypesSchema,
            validation: { required: true }
        },
        /** If true, the provider is active in the marketplace and can be used to create products */
        active: {
            type: "boolean" as const,
            label: "Active",
            validation: { required: true }
        }
    }
} as const satisfies ObjectSchema;

// Main Provider schema
export const ProviderSchema = {
    type: "object" as const,
    fields: {
        id: {
            type: "string" as const,
            label: "ID",
            validation: { required: true }
        },
        name: {
            type: "string" as const,
            label: "Name",
            validation: { required: true }
        },
        business_types: {
            type: "array" as const,
            label: "Business Types",
            itemSchema: BusinessTypeSchema
        } as const satisfies ArraySchema
    }
} as const satisfies ObjectSchema;

export type Provider = SchemaToType<typeof ProviderSchema>;
export type BusinessType = SchemaToType<typeof BusinessTypeSchema>;

const testProvider: Provider = {
    id: "1",
    name: "Test Provider",
    business_types: [
        {
            type: "residential_mortgage",
            active: true
        }
    ]
};
