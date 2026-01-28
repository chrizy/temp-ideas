import type { ObjectSchema, SchemaToType, UnionSchema, UnionVariant } from "../base_schema_types";
import { registerComputation } from "~/utils/validation";

const uk_postcode_regex = /^[A-Za-z]{1,2}[0-9Rr][0-9A-Za-z] ?[0-9][ABD-HJLNP-UW-Zabd-hjlnp-uw-z]{2}$/;
export const UkCountryKeySchema = {
    type: "enum" as const,
    label: "UK Country",
    options: {
        england: "England",
        scotland: "Scotland",
        wales: "Wales",
        northern_ireland: "Northern Ireland"
    }
} as const;

export const EconomicRegionKeySchema = {
    type: "enum" as const,
    label: "Economic Region",
    options: {
        UK: "UK",
        EEA: "EEA",
        OE: "OE",
        MEA: "MEA",
        NA: "NA",
        CAC: "CAC",
        SA: "SA",
        A: "A",
        O: "O"
    }
} as const;

export const UkAddressSchema = {
    type: "object" as const,
    discriminator: "is_uk" as const,
    value: true as const,
    fields: {
        is_uk: { type: "boolean" as const },
        flat_number: {
            type: "string" as const,
            label: "Flat Number",
            validation: { maxLength: 100 }
        },
        house_number: {
            type: "string" as const,
            label: "House Number",
            validation: { maxLength: 100 }
        },
        building_name: {
            type: "string" as const,
            label: "Building Name",
            validation: { maxLength: 100 }
        },
        street: {
            type: "string" as const,
            label: "Street",
            validation: { maxLength: 100 }
        },
        district: {
            type: "string" as const,
            label: "District",
            validation: { maxLength: 100 }
        },
        town: {
            type: "string" as const,
            label: "Town",
            validation: { maxLength: 100 }
        },
        county: {
            type: "string" as const,
            label: "County",
            validation: { maxLength: 100 }
        },
        uk_country_key: {
            ...UkCountryKeySchema,
            label: "UK Country"
        },
        postcode: {
            type: "string" as const,
            label: "Postcode",
            validation: {
                maxLength: 8,
                minLength: 5,
                pattern: uk_postcode_regex,
                required: true
            }
        },
        uprn: {
            type: "string" as const,
            label: "UPRN",
            validation: { maxLength: 100 }
        },
    }
} as const satisfies UnionVariant<"is_uk", true>;

export const NonUkAddressSchema = {
    type: "object" as const,
    discriminator: "is_uk" as const,
    value: false as const,
    fields: {
        is_uk: { type: "boolean" as const },
        international_line_1: {
            type: "string" as const,
            label: "International Line 1",
            validation: { maxLength: 100 }
        },
        international_line_2: {
            type: "string" as const,
            label: "International Line 2",
            validation: { maxLength: 100 }
        },
        international_line_3: {
            type: "string" as const,
            label: "International Line 3",
            validation: { maxLength: 100 }
        },
        international_line_4: {
            type: "string" as const,
            label: "International Line 4",
            validation: { maxLength: 100 }
        },
        country_key: {
            type: "string" as const,
            label: "International Country",
            validation: { maxLength: 100 }
        },
        economic_region_key: {
            ...EconomicRegionKeySchema,
            label: "Economic Region"
        },
    }
} as const satisfies UnionVariant<"is_uk", false>;

const AddressBaseSchema = {
    type: "object" as const,
    fields: {
        /** Computed property - formatted address */
        formatted_address: {
            type: "string" as const,
            label: "Formatted Address",
            computed: true as const
        },
        /** Computed property - address validity */
        is_valid: {
            type: "boolean" as const,
            label: "Is Valid",
            computed: true as const,
            // compute: (address: any) => ({
            //     is_valid: /* logic */,
            //     formatted_address: /* logic */
            // })
        }
    }
} as const satisfies ObjectSchema;

export const AddressSchema = {
    type: "union" as const,
    label: "Address",
    description: (address: any) => {
        const computed = computeAddressValues(address);
        return computed.formatted_address || "";
    },
    variants: [
        {
            ...UkAddressSchema,
            fields: {
                ...UkAddressSchema.fields,
                ...AddressBaseSchema.fields
            }
        },
        {
            ...NonUkAddressSchema,
            fields: {
                ...NonUkAddressSchema.fields,
                ...AddressBaseSchema.fields
            }
        }
    ]
} as const satisfies UnionSchema;

export type Address = SchemaToType<typeof AddressSchema>;

/**
 * Check if a field value is present (not empty)
 */
function isFieldPresent(value: any): boolean {
    return value !== undefined && value !== null && value !== "";
}

/**
 * Format a UK address
 */
function formatUkAddress(address: any): string {
    const parts: string[] = [];

    if (address.flat_number) parts.push(address.flat_number);
    if (address.house_number) parts.push(address.house_number);
    if (address.building_name) parts.push(address.building_name);
    if (address.street) parts.push(address.street);
    if (address.district) parts.push(address.district);
    if (address.town) parts.push(address.town);
    if (address.county) parts.push(address.county);
    if (address.postcode) parts.push(address.postcode);
    if (address.uk_country_key) {
        const countryName = UkCountryKeySchema.options[address.uk_country_key as keyof typeof UkCountryKeySchema.options];
        if (countryName) parts.push(countryName);
    }

    return parts.join(", ");
}

/**
 * Format a non-UK address
 */
function formatNonUkAddress(address: any): string {
    const parts: string[] = [];

    if (address.international_line_1) parts.push(address.international_line_1);
    if (address.international_line_2) parts.push(address.international_line_2);
    if (address.international_line_3) parts.push(address.international_line_3);
    if (address.international_line_4) parts.push(address.international_line_4);
    if (address.country_key) parts.push(address.country_key);
    if (address.economic_region_key) {
        const regionName = EconomicRegionKeySchema.options[address.economic_region_key as keyof typeof EconomicRegionKeySchema.options];
        if (regionName) parts.push(regionName);
    }

    return parts.join(", ");
}

/**
 * Compute address validity and formatted address
 * - For UK addresses: requires postcode and street
 * - For non-UK addresses: requires international_line_1 and international_line_2
 */
function computeAddressValues(address: any): { is_valid: boolean; formatted_address: string } {
    if (!address || typeof address !== "object") {
        return { is_valid: false, formatted_address: "" };
    }

    // Backwards-compatible default: missing flag => treat as UK
    const isUk = address.is_uk !== false;

    let isValid: boolean;
    let formattedAddress: string;

    if (isUk) {
        // UK: requires postcode and street
        isValid = isFieldPresent(address.postcode) &&
            isFieldPresent(address.street);
        formattedAddress = formatUkAddress(address);
    } else {
        // Non-UK: requires Line 1 and Line 2
        isValid = isFieldPresent(address.international_line_1) &&
            isFieldPresent(address.international_line_2);
        formattedAddress = formatNonUkAddress(address);
    }

    return {
        is_valid: isValid,
        formatted_address: formattedAddress
    };
}

// Register the computation function for AddressSchema
registerComputation(AddressSchema, computeAddressValues);