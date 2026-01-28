import { describe, it, expect, beforeEach } from "vitest";
import { validateObject, registerComputation } from "./validation";
import { AddressSchema, type Address } from "~/models/common/address";
import { ClientSchema, type Client } from "~/models/client/client";
import type { Schema } from "~/models/base_schema_types";

describe("validateObject - Computed Values", () => {
  describe("Address Schema Computed Values", () => {
    it("should compute is_valid and formatted_address for valid UK address", () => {
      const ukAddress: Address = {
        is_uk: true,
        postcode: "SW1A 1AA",
        street: "10 Downing Street",
        town: "London",
      };

      const result = validateObject(AddressSchema, ukAddress);

      expect(result.value.is_valid).toBe(true);
      expect(result.value.formatted_address).toBe("10 Downing Street, London, SW1A 1AA");
      expect(result.isValid).toBe(true);
    });

    it("should compute is_valid as false for UK address missing postcode", () => {
      const ukAddress: Address = {
        is_uk: true,
        street: "10 Downing Street",
        town: "London",
        postcode: "",
      };

      const result = validateObject(AddressSchema, ukAddress);

      expect(result.value.is_valid).toBe(false);
      expect(result.value.formatted_address).toBe("10 Downing Street, London");
      // Should have validation error for missing required postcode
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should compute is_valid as false for UK address missing street", () => {
      const ukAddress: Address = {
        is_uk: true,
        postcode: "SW1A 1AA",
        town: "London",
      };

      const result = validateObject(AddressSchema, ukAddress);

      expect(result.value.is_valid).toBe(false);
      expect(result.value.formatted_address).toBe("London, SW1A 1AA");
    });

    it("should compute is_valid and formatted_address for valid non-UK address", () => {
      const nonUkAddress: Address = {
        is_uk: false,
        international_line_1: "123 Main Street",
        international_line_2: "Downtown",
        country_key: "USA",
      };

      const result = validateObject(AddressSchema, nonUkAddress);

      expect(result.value.is_valid).toBe(true);
      expect(result.value.formatted_address).toBe("123 Main Street, Downtown, USA");
    });

    it("should compute is_valid as false for non-UK address missing line 1", () => {
      const nonUkAddress: Address = {
        is_uk: false,
        international_line_2: "Downtown",
        country_key: "USA",
      };

      const result = validateObject(AddressSchema, nonUkAddress);

      expect(result.value.is_valid).toBe(false);
      expect(result.value.formatted_address).toBe("Downtown, USA");
    });

    it("should compute is_valid as false for non-UK address missing line 2", () => {
      const nonUkAddress: Address = {
        is_uk: false,
        international_line_1: "123 Main Street",
        country_key: "USA",
      };

      const result = validateObject(AddressSchema, nonUkAddress);

      expect(result.value.is_valid).toBe(false);
      expect(result.value.formatted_address).toBe("123 Main Street, USA");
    });

    it("should format UK address with all optional fields", () => {
      const ukAddress: Address = {
        is_uk: true,
        flat_number: "Flat 5",
        house_number: "10",
        building_name: "The Building",
        street: "Downing Street",
        district: "Westminster",
        town: "London",
        county: "Greater London",
        postcode: "SW1A 1AA",
        uk_country_key: "england",
      };

      const result = validateObject(AddressSchema, ukAddress);

      expect(result.value.is_valid).toBe(true);
      expect(result.value.formatted_address).toBe(
        "Flat 5, 10, The Building, Downing Street, Westminster, London, Greater London, SW1A 1AA, England"
      );
    });

    it("should format non-UK address with all optional fields", () => {
      const nonUkAddress: Address = {
        is_uk: false,
        international_line_1: "123 Main Street",
        international_line_2: "Downtown",
        international_line_3: "Suite 100",
        international_line_4: "Building A",
        country_key: "USA",
        economic_region_key: "NA",
      };

      const result = validateObject(AddressSchema, nonUkAddress);

      expect(result.value.is_valid).toBe(true);
      expect(result.value.formatted_address).toBe(
        "123 Main Street, Downtown, Suite 100, Building A, USA, NA"
      );
    });

    it("should handle empty address object", () => {
      const emptyAddress: any = {
        is_uk: true,
      };

      const result = validateObject(AddressSchema, emptyAddress);

      expect(result.value.is_valid).toBe(false);
      expect(result.value.formatted_address).toBe("");
    });

    it("should handle null address", () => {
      const result = validateObject(AddressSchema, null);

      expect(result.value).toBe(null);
    });
  });

  describe("Computed Fields Validation", () => {
    it("should not validate computed fields as user input", () => {
      const ukAddress: Address = {
        is_uk: true,
        postcode: "SW1A 1AA",
        street: "10 Downing Street",
        // Manually set computed fields (should be ignored/overwritten)
        is_valid: false as any,
        formatted_address: "wrong" as any,
      };

      const result = validateObject(AddressSchema, ukAddress);

      // Computed values should be recalculated, not validated
      expect(result.value.is_valid).toBe(true);
      expect(result.value.formatted_address).toBe("10 Downing Street, SW1A 1AA");
      // Should not have validation errors for computed fields
      const computedFieldErrors = result.errors.filter(
        (e) => e.path.includes("is_valid") || e.path.includes("formatted_address")
      );
      expect(computedFieldErrors.length).toBe(0);
    });
  });

  describe("Custom Computation Registration", () => {
    it("should allow registering custom computation functions", () => {
      const TestSchema: Schema = {
        type: "object",
        fields: {
          name: { type: "string", label: "Name" },
          computed_field: {
            type: "string",
            label: "Computed Field",
            computed: true,
          },
        },
      };

      registerComputation(TestSchema, (value: any) => ({
        computed_field: value.name ? `Computed: ${value.name}` : "No name",
      }));

      const testData = { name: "Test" };
      const result = validateObject(TestSchema, testData);

      expect(result.value.computed_field).toBe("Computed: Test");
    });

    it("should compute values for nested objects", () => {
      const NestedSchema: Schema = {
        type: "object",
        fields: {
          address: AddressSchema,
          name: { type: "string", label: "Name" },
        },
      };

      const testData = {
        name: "John",
        address: {
          is_uk: true,
          postcode: "SW1A 1AA",
          street: "10 Downing Street",
        },
      };

      const result = validateObject(NestedSchema, testData);

      expect(result.value.address.is_valid).toBe(true);
      expect(result.value.address.formatted_address).toBe("10 Downing Street, SW1A 1AA");
      expect(result.value.name).toBe("John");
    });

    it("should compute values for arrays of objects with computed fields", () => {
      const ArraySchema: Schema = {
        type: "array",
        itemSchema: AddressSchema,
      };

      const testData = [
        {
          is_uk: true,
          postcode: "SW1A 1AA",
          street: "10 Downing Street",
        },
        {
          is_uk: false,
          international_line_1: "123 Main St",
          international_line_2: "Downtown",
        },
      ];

      const result = validateObject(ArraySchema, testData);

      expect(result.value).toHaveLength(2);
      expect(result.value[0].is_valid).toBe(true);
      expect(result.value[0].formatted_address).toBe("10 Downing Street, SW1A 1AA");
      expect(result.value[1].is_valid).toBe(true);
      expect(result.value[1].formatted_address).toBe("123 Main St, Downtown");
    });
  });

  describe("Computed Values with Validation Errors", () => {
    it("should still compute values even when validation fails", () => {
      const ukAddress: Address = {
        is_uk: true,
        // Missing required postcode
        street: "10 Downing Street",
        postcode: "",
      };

      const result = validateObject(AddressSchema, ukAddress);

      // Should have validation errors
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // But computed values should still be set
      expect(result.value.is_valid).toBe(false);
      expect(result.value.formatted_address).toBe("10 Downing Street");
    });
  });

  describe("Description Field Computation", () => {
    describe("Address Schema Description", () => {
      it("should compute description for UK address", () => {
        const ukAddress: Address = {
          is_uk: true,
          postcode: "SW1A 1AA",
          street: "10 Downing Street",
          town: "London",
        };

        const result = validateObject(AddressSchema, ukAddress);

        expect(result.value.description).toBe("10 Downing Street, London, SW1A 1AA");
        expect(result.value.formatted_address).toBe("10 Downing Street, London, SW1A 1AA");
        // Description should match formatted_address for addresses
        expect(result.value.description).toBe(result.value.formatted_address);
      });

      it("should compute description for non-UK address", () => {
        const nonUkAddress: Address = {
          is_uk: false,
          international_line_1: "123 Main Street",
          international_line_2: "Downtown",
          country_key: "USA",
        };

        const result = validateObject(AddressSchema, nonUkAddress);

        expect(result.value.description).toBe("123 Main Street, Downtown, USA");
        expect(result.value.formatted_address).toBe("123 Main Street, Downtown, USA");
        expect(result.value.description).toBe(result.value.formatted_address);
      });

      it("should compute description for empty address", () => {
        const emptyAddress: any = {
          is_uk: true,
        };

        const result = validateObject(AddressSchema, emptyAddress);

        expect(result.value.description).toBe("");
      });

      it("should compute description even when validation fails", () => {
        const invalidAddress: Address = {
          is_uk: true,
          street: "10 Downing Street",
          // Missing required postcode
          postcode: "",
        };

        const result = validateObject(AddressSchema, invalidAddress);

        // Should have validation errors
        expect(result.isValid).toBe(false);
        // But description should still be computed
        expect(result.value.description).toBe("10 Downing Street");
      });
    });

    describe("Client Schema Description", () => {
      it("should compute description from firstName", () => {
        const client: Client = {
          client_type: "individual",
          version: 1,
          first_name: "John",
          dob: "1990-01-01",
        } as Client;

        const result = validateObject(ClientSchema, client);

        expect(result.value.description).toBe("John");
      });

      it("should compute description from firstName when lastName is undefined", () => {
        const client: Client = {
          client_type: "individual",
          version: 1,
          first_name: "Jane",
          dob: "1990-01-01",
        } as Client;

        const result = validateObject(ClientSchema, client);

        expect(result.value.description).toBe("Jane");
      });

      it("should compute description as 'Unnamed Client' when both names are missing", () => {
        const client: Client = {
          client_type: "individual",
          version: 1,
          dob: "1990-01-01",
        } as Client;

        const result = validateObject(ClientSchema, client);

        expect(result.value.description).toBe("Unnamed Client");
      });

      it("should compute description with empty strings handled correctly", () => {
        const client: Client = {
          client_type: "individual",
          version: 1,
          first_name: "",
          dob: "1990-01-01",
        } as Client;

        const result = validateObject(ClientSchema, client);

        expect(result.value.description).toBe("Unnamed Client");
      });

      it("should compute description for company from business_name", () => {
        const client: Client = {
          client_type: "company",
          business_name: "Acme Corp",
          version: 1,
        } as Client;

        const result = validateObject(ClientSchema, client);

        expect(result.value.description).toBe("Acme Corp");
      });

      it("should compute description as 'Unnamed Company' when business_name is missing", () => {
        const client: Client = {
          client_type: "company",
          version: 1,
        } as Client;

        const result = validateObject(ClientSchema, client);

        expect(result.value.description).toBe("Unnamed Company");
      });
    });

    describe("Description with Nested Objects", () => {
      it("should compute description for nested address objects", () => {
        const NestedSchema: Schema = {
          type: "object",
          fields: {
            address: AddressSchema,
            name: { type: "string", label: "Name" },
          },
        };

        const testData = {
          name: "John",
          address: {
            is_uk: true,
            postcode: "SW1A 1AA",
            street: "10 Downing Street",
            town: "London",
          },
        };

        const result = validateObject(NestedSchema, testData);

        expect(result.value.address.description).toBe("10 Downing Street, London, SW1A 1AA");
        expect(result.value.name).toBe("John");
      });

      it("should compute description for arrays of objects with description", () => {
        const ArraySchema: Schema = {
          type: "array",
          itemSchema: AddressSchema,
        };

        const testData = [
          {
            is_uk: true,
            postcode: "SW1A 1AA",
            street: "10 Downing Street",
            town: "London",
          },
          {
            is_uk: false,
            international_line_1: "123 Main St",
            international_line_2: "Downtown",
            country_key: "USA",
          },
        ];

        const result = validateObject(ArraySchema, testData);

        expect(result.value).toHaveLength(2);
        expect(result.value[0].description).toBe("10 Downing Street, London, SW1A 1AA");
        expect(result.value[1].description).toBe("123 Main St, Downtown, USA");
      });
    });

    describe("Description Field Validation", () => {
      it("should not validate description field as user input", () => {
        const ukAddress: any = {
          is_uk: true,
          postcode: "SW1A 1AA",
          street: "10 Downing Street",
          // Manually set description (should be overwritten)
          description: "wrong description" as any,
        };

        const result = validateObject(AddressSchema, ukAddress);

        // Description should be recalculated, not validated
        expect(result.value.description).toBe("10 Downing Street, SW1A 1AA");
        // Should not have validation errors for description field
        const descriptionErrors = result.errors.filter(
          (e) => e.path.includes("description")
        );
        expect(descriptionErrors.length).toBe(0);
      });

      it("should compute description after other computed values", () => {
        // Description should be able to use other computed values
        const ukAddress: Address = {
          is_uk: true,
          postcode: "SW1A 1AA",
          street: "10 Downing Street",
          town: "London",
        };

        const result = validateObject(AddressSchema, ukAddress);

        // Both formatted_address and description should be computed
        expect(result.value.formatted_address).toBe("10 Downing Street, London, SW1A 1AA");
        expect(result.value.description).toBe("10 Downing Street, London, SW1A 1AA");
        // Description uses formatted_address, so they should match
        expect(result.value.description).toBe(result.value.formatted_address);
      });
    });

    describe("Schema without Description", () => {
      it("should not add description field when schema has no description function", () => {
        const TestSchema: Schema = {
          type: "object",
          fields: {
            name: { type: "string", label: "Name" },
          },
        };

        const testData = { name: "Test" };
        const result = validateObject(TestSchema, testData);

        // Should not have description field
        expect(result.value.description).toBeUndefined();
        expect(result.value.name).toBe("Test");
      });
    });
  });
});
