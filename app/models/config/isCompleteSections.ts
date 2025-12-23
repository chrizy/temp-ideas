import type { Schema } from "../base_schema_types";
import { ClientSchema } from "../client/client";

/**
 * Predefined field requirements organized by section
 * Groups can enable/disable these fields to customize completion requirements
 */

export type SectionFieldRequirement = {
    field_id: string; // Unique identifier for this field requirement
    field_path: string; // Path to the field (e.g., "firstName", "addresses[].address.street")
    // Label is derived from the schema, not stored here
    // Conditions are handled via schema variants (discriminated unions)
};

export type SectionDefinition = {
    section_id: string; // e.g., "fact_find.personal_details"
    section_label: string; // Human-readable section name
    schema: Schema; // The schema this section applies to
    fields: readonly SectionFieldRequirement[];
};

/**
 * All available section field requirements
 * This is the master list - groups can enable/disable specific fields
 */
export const SectionFieldRequirements: readonly SectionDefinition[] = [
    {
        section_id: "fact_find.personal_details",
        section_label: "Personal Details",
        schema: ClientSchema,
        fields: [
            {
                field_id: "first_name",
                field_path: "firstName"
            },
            {
                field_id: "date_of_birth",
                field_path: "dob"
            },
            {
                field_id: "sex",
                field_path: "sex"
            }
        ]
    },
    {
        section_id: "fact_find.address_details",
        section_label: "Address Details",
        schema: ClientSchema,
        fields: [
            {
                field_id: "current_address_street",
                field_path: "addresses[].address.street"
            },
            {
                field_id: "current_address_town",
                field_path: "addresses[].address.town"
            },
            {
                field_id: "current_address_postcode",
                field_path: "addresses[].address.postcode"
            },
            {
                field_id: "residency_start_date",
                field_path: "addresses[].residency_start_date"
            },
            {
                field_id: "residency_end_date",
                field_path: "addresses[].residency_end_date"
            },
            {
                field_id: "occupancy_type",
                field_path: "addresses[].occupancy_type"
            }
        ]
    }
] as const;

/**
 * Get all field requirements for a section
 */
export function getSectionFields(sectionId: string): SectionDefinition | undefined {
    return SectionFieldRequirements.find((section) => section.section_id === sectionId);
}

/**
 * Get a specific field requirement by section and field ID
 */
export function getFieldRequirement(
    sectionId: string,
    fieldId: string
): SectionFieldRequirement | undefined {
    const section = getSectionFields(sectionId);
    return section?.fields.find((field) => field.field_id === fieldId);
}

/**
 * Get all sections for a schema
 */
export function getSectionsForSchema(schema: Schema): readonly SectionDefinition[] {
    return SectionFieldRequirements.filter((section) => section.schema === schema);
}

/**
 * Get all available section IDs
 */
export function getAllSectionIds(): readonly string[] {
    return SectionFieldRequirements.map((section) => section.section_id);
}

/**
 * Get all available field IDs for a section
 */
export function getFieldIdsForSection(sectionId: string): readonly string[] {
    const section = getSectionFields(sectionId);
    return section?.fields.map((field) => field.field_id) || [];
}
