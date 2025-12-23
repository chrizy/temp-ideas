import { describe, it, expect } from "vitest";
import { checkSectionCompletion } from "./isComplete";
import { ClientSchema, type Client } from "~/models/client/client";
import type { Group } from "~/models/admin/group";

describe("Section Is Complete Validation", () => {
  // Helper to create a minimal group config
  function createGroupConfig(
    sectionId: string,
    enabledFieldIds: string[]
  ): Group {
    return {
      group_id: "test-group",
      entity_type: "Organization",
      name: "Test Group",
      group_type_id: "Branch",
      account_id: 1,
      created_by: "test",
      created_at: "2024-01-01T00:00:00Z",
      updated_by: "test",
      updated_at: "2024-01-01T00:00:00Z",
      deleted: false,
      section_field_requirements: [
        {
          section_id: sectionId,
          enabled_field_ids: enabledFieldIds,
        },
      ],
    } as Group;
  }

  describe("Personal Details Section", () => {
    it("should return complete when all required fields are present", () => {
      const client: Client = {
        client_type: "individual",
        version: 1,
        first_name: "John",
        dob: "1990-01-01",
        addresses: [],
      };

      const group = createGroupConfig("fact_find.personal_details", [
        "first_name",
        "date_of_birth",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.personal_details"
      );

      expect(result.complete).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should return incomplete when firstName is missing", () => {
      const client = {
        dob: "1990-01-01",
        addresses: [],
      };

      const group = createGroupConfig("fact_find.personal_details", [
        "first_name",
        "date_of_birth",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.personal_details"
      );

      expect(result.complete).toBe(false);
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].fieldLabel).toBe("First Name");
      expect(result.missing[0].path).toEqual(["firstName"]);
    });

    it("should return incomplete when firstName is empty string", () => {
      const client = {
        firstName: "",
        dob: "1990-01-01",
        addresses: [],
      };

      const group = createGroupConfig("fact_find.personal_details", [
        "first_name",
        "date_of_birth",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.personal_details"
      );

      expect(result.complete).toBe(false);
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].fieldLabel).toBe("First Name");
    });

    it("should return incomplete when dob is missing", () => {
      const client = {
        firstName: "John",
        addresses: [],
      };

      const group = createGroupConfig("fact_find.personal_details", [
        "first_name",
        "date_of_birth",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.personal_details"
      );

      expect(result.complete).toBe(false);
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].fieldLabel).toBe("Date of Birth");
      expect(result.missing[0].path).toEqual(["dob"]);
    });

    it("should return complete when only enabled fields are required", () => {
      const client = {
        firstName: "John",
        dob: "1990-01-01",
        // sex is not in enabled_field_ids, so it's not required
        addresses: [],
      };

      const group = createGroupConfig("fact_find.personal_details", [
        "first_name",
        "date_of_birth",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.personal_details"
      );

      expect(result.complete).toBe(true);
    });
  });

  describe("Address Details Section", () => {
    it("should return complete when all required address fields are present", () => {
      const client = {
        firstName: "John",
        addresses: [
          {
            client_address_id: "addr-1",
            address: {
              is_non_uk_address: false,
              street: "123 Main St",
              town: "London",
              postcode: "SW1A 1AA",
              uk_country_key: "england",
            },
            is_current_address: true,
            residency_start_date: "2022-01-01",
            occupancy_type: "owned_mortgage",
          },
        ],
      };

      const group = createGroupConfig("fact_find.address_details", [
        "current_address_street",
        "current_address_town",
        "current_address_postcode",
        "residency_start_date",
        "occupancy_type",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.address_details"
      );

      expect(result.complete).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should return incomplete when required address fields are missing", () => {
      const client = {
        firstName: "John",
        addresses: [
          {
            client_address_id: "addr-1",
            address: {
              is_non_uk_address: false,
              // street, town, postcode missing
              uk_country_key: "england",
            },
            is_current_address: true,
            residency_start_date: "2022-01-01",
            occupancy_type: "owned_mortgage",
          },
        ],
      };

      const group = createGroupConfig("fact_find.address_details", [
        "current_address_street",
        "current_address_town",
        "current_address_postcode",
        "residency_start_date",
        "occupancy_type",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.address_details"
      );

      expect(result.complete).toBe(false);
      // Should find missing street, town, and postcode
      // Labels come from schema, not from field requirements
      expect(result.missing.length).toBeGreaterThan(0);
      const missingFields = result.missing.map((m) => m.fieldLabel);
      expect(missingFields).toContain("Street");
      expect(missingFields).toContain("Town");
      expect(missingFields).toContain("Postcode");
    });

    it("should require residency_end_date only for past addresses (via schema variant)", () => {
      const client = {
        firstName: "John",
        addresses: [
          {
            client_address_id: "addr-1",
            address: {
              is_non_uk_address: false,
              street: "123 Main St",
              town: "London",
              postcode: "SW1A 1AA",
              uk_country_key: "england",
            },
            is_current_address: false, // Past address - schema variant includes residency_end_date
            residency_start_date: "2022-01-01",
            // residency_end_date is missing but should be required for past addresses
            occupancy_type: "owned_mortgage",
          },
        ],
      };

      const group = createGroupConfig("fact_find.address_details", [
        "residency_end_date",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.address_details"
      );

      // Schema variant for is_current_address === false includes residency_end_date
      // Since it's missing, the section should be incomplete
      expect(result.complete).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      // Label comes from schema - check the path contains residency_end_date
      const missingPaths = result.missing.map((m) => m.path);
      expect(
        missingPaths.some((path) =>
          Array.isArray(path) && path.includes("residency_end_date")
        )
      ).toBe(true);
    });

    it("should not require residency_end_date for current addresses (schema variant excludes it)", () => {
      const client = {
        firstName: "John",
        addresses: [
          {
            client_address_id: "addr-1",
            address: {
              is_non_uk_address: false,
              street: "123 Main St",
              town: "London",
              postcode: "SW1A 1AA",
              uk_country_key: "england",
            },
            is_current_address: true, // Current address - schema variant does NOT include residency_end_date
            residency_start_date: "2022-01-01",
            // residency_end_date is missing but should NOT be required for current addresses
            occupancy_type: "owned_mortgage",
          },
        ],
      };

      const group = createGroupConfig("fact_find.address_details", [
        "residency_end_date",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.address_details"
      );

      // Schema variant for is_current_address === true does NOT include residency_end_date
      // So the field path cannot be resolved and is skipped
      expect(result.complete).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should check ALL addresses when using array notation", () => {
      const client: Client = {
        client_type: "individual",
        version: 1,
        first_name: "John",
        addresses: [
          {
            client_address_id: "addr-1",
            address: {
              is_non_uk_address: false,
              street: "123 Main St", // Has street
              town: "London",
              postcode: "SW1A 1AA",
              uk_country_key: "england",
            },
            is_current_address: true,
            residency_start_date: "2022-01-01",
            occupancy_type: "owned_mortgage",
          },
          {
            client_address_id: "addr-2",
            address: {
              is_non_uk_address: false,
              // Missing street
              town: "Manchester",
              postcode: "M1 1AA",
              uk_country_key: "england",
            },
            is_current_address: false,
            residency_start_date: "2020-01-01",
            residency_end_date: "2022-12-31",
            occupancy_type: "rented_private",
          },
        ],
      };

      const group = createGroupConfig("fact_find.address_details", [
        "current_address_street",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.address_details"
      );

      // Should find missing street in the second address (index 1)
      // ALL addresses are checked, not just the first one
      expect(result.complete).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      // Should have missing street for address at index 1
      const missingPaths = result.missing.map((m) => m.path);
      expect(
        missingPaths.some(
          (path) =>
            Array.isArray(path) &&
            path.includes(1) &&
            path.includes("address") &&
            path.includes("street")
        )
      ).toBe(true);
    });

    it("should check ALL array items - multiple missing fields across different addresses", () => {
      const client = {
        firstName: "John",
        addresses: [
          {
            client_address_id: "addr-1",
            address: {
              is_non_uk_address: false,
              street: "123 Main St",
              // Missing town
              postcode: "SW1A 1AA",
              uk_country_key: "england",
            },
            is_current_address: true,
            residency_start_date: "2022-01-01",
            occupancy_type: "owned_mortgage",
          },
          {
            client_address_id: "addr-2",
            address: {
              is_non_uk_address: false,
              street: "456 Oak Ave",
              town: "Manchester",
              // Missing postcode
              uk_country_key: "england",
            },
            is_current_address: true,
            residency_start_date: "2020-01-01",
            occupancy_type: "rented_private",
          },
          {
            client_address_id: "addr-3",
            address: {
              is_non_uk_address: false,
              street: "789 Pine Rd",
              town: "Birmingham",
              postcode: "B1 1AA",
              uk_country_key: "england",
            },
            is_current_address: true,
            residency_start_date: "2018-01-01",
            occupancy_type: "owned_outright",
          },
        ],
      };

      const group = createGroupConfig("fact_find.address_details", [
        "current_address_street",
        "current_address_town",
        "current_address_postcode",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.address_details"
      );

      // Should find missing town in address[0] and missing postcode in address[1]
      // ALL 3 addresses should be checked
      expect(result.complete).toBe(false);
      expect(result.missing.length).toBe(2);

      const missingPaths = result.missing.map((m) => m.path);
      const missingLabels = result.missing.map((m) => m.fieldLabel);

      // Address 0 should have missing town
      expect(
        missingPaths.some(
          (path) =>
            Array.isArray(path) &&
            path.includes(0) &&
            path.includes("address") &&
            path.includes("town")
        )
      ).toBe(true);

      // Address 1 should have missing postcode
      expect(
        missingPaths.some(
          (path) =>
            Array.isArray(path) &&
            path.includes(1) &&
            path.includes("address") &&
            path.includes("postcode")
        )
      ).toBe(true);

      // Address 2 should be complete (no missing fields)
      expect(
        missingPaths.some(
          (path) =>
            Array.isArray(path) &&
            path.includes(2)
        )
      ).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should return complete when no requirements are configured", () => {
      const client = {
        firstName: "John",
        addresses: [],
      };

      const group = createGroupConfig("fact_find.personal_details", []);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.personal_details"
      );

      expect(result.complete).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should return complete when section is not configured in group", () => {
      const client = {
        firstName: "John",
        addresses: [],
      };

      const group: Group = {
        group_id: "test-group",
        entity_type: "Organization",
        name: "Test Group",
        group_type_id: "Branch",
        account_id: 1,
        created_by: "test",
        created_at: "2024-01-01T00:00:00Z",
        updated_by: "test",
        updated_at: "2024-01-01T00:00:00Z",
        deleted: false,
        section_field_requirements: [],
      } as Group;

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.personal_details"
      );

      expect(result.complete).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should return complete when section does not exist in master list", () => {
      const client = {
        firstName: "John",
        addresses: [],
      };

      const group = createGroupConfig("nonexistent.section", ["field1"]);

      const result = checkSectionCompletion(
        client,
        group,
        "nonexistent.section"
      );

      expect(result.complete).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should handle null and undefined values correctly", () => {
      const client = {
        firstName: null,
        dob: undefined,
        addresses: [],
      };

      const group = createGroupConfig("fact_find.personal_details", [
        "first_name",
        "date_of_birth",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.personal_details"
      );

      expect(result.complete).toBe(false);
      expect(result.missing.length).toBe(2);
    });

    it("should handle empty arrays correctly - no items to check means complete", () => {
      const client = {
        firstName: "John",
        dob: "1990-01-01",
        addresses: [], // Empty array
      };

      const group = createGroupConfig("fact_find.address_details", [
        "current_address_street",
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.address_details"
      );

      // Empty array means no items to validate
      // Since there are no addresses, there's nothing to check, so it's considered complete
      expect(result.complete).toBe(true);
      expect(result.missing.length).toBe(0);
    });

    it("should handle missing addresses field", () => {
      const client = {
        firstName: "John",
        dob: "1990-01-01",
        // addresses field is missing entirely
      };

      const group = createGroupConfig("fact_find.address_details", [
        "residency_start_date", // Field without condition
      ]);

      const result = checkSectionCompletion(
        client,
        group,
        "fact_find.address_details"
      );

      // When addresses is undefined, path resolution may create paths that point to undefined values
      // which are considered missing, so the section is incomplete
      expect(result.complete).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });
});
