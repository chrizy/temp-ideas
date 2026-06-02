import type { ObjectSchema, SchemaToType } from "../base_schema_types";
import { ImportedDataSchema } from "../common/import";
import { TrackingSchema } from "../common/tracking";

/**
 * A dependant can be linked to multiple parent client IDs via `client_ids`.
 */
export const ClientDependantSchema = {
    type: "object" as const,
    label: "Client Dependant",
    fields: {
        ...TrackingSchema.fields,
        client_ids: {
            type: "array" as const,
            itemSchema: { type: "number" as const },
            label: "Client IDs",
        },
        birth_date: {
            type: "datetime" as const,
            label: "Date of birth",
        },
        relationship_to_client: {
            type: "enum" as const,
            label: "Relationship to client(s)",
            options: {
                child: "Child",
                spouse: "Spouse",
                civil_partner: "Civil partner",
                partner: "Partner",
                friend: "Friend",
                parent: "Parent",
                other_family_member: "Other family member",
            }
        },
        is_financially_dependant: {
            type: "boolean" as const,
            label: "Are they financially dependent?",
            validation: { required: true }
        },
        is_dependent_end_date_known: {
            type: "boolean" as const,
            label: "Is dependency end date known?",
        },
        dependent_until_age: {
            type: "number" as const,
            label: "What age will they be dependent until?",
            validation: { min: 0, max: 120 },
        },
        dependant_occupancy_type_key: {
            type: "enum" as const,
            label: "Occupancy status",
            options: {
                living_with_clients: "Living with client(s)",
                other_accommodation: "Other accommodation",
            }
        },

        import: { ...ImportedDataSchema }
    }
} as const satisfies ObjectSchema;

export type ClientDependant = SchemaToType<typeof ClientDependantSchema>;

