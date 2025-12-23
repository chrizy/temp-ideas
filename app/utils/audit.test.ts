import { describe, it, expect } from "vitest";
import { generateAuditDiff } from "./audit";
import { GroupSchema, type Group } from "~/models/admin/group";

describe("generateAuditDiff - Group Schema", () => {
    // Helper to create a minimal group
    function createGroup(overrides: Partial<Group> = {}): Group {
        return {
            group_id: "group-123",
            entity_type: "Organization",
            parent_group_id: "group-001",
            reference: "REF-001",
            name: "Example Branch Office",
            linkage: "1.2.3",
            group_type_id: "Branch",
            account_id: 1001,
            created_by: "user-001",
            created_at: "2024-01-15T10:00:00Z",
            updated_by: "user-001",
            updated_at: "2024-01-20T14:30:00Z",
            deleted: false,
            lists: [],
            settings: [],
            task_configurations: [],
            section_field_requirements: [],
            address: {
                is_non_uk_address: false,
                house_number: "123",
                street: "Main Street",
                town: "London",
                county: "Greater London",
                postcode: "SW1A 1AA",
                uk_country_key: "england",
                formatted_address: "123 Main Street, London, Greater London, SW1A 1AA"
            },
            tel: "+44 20 1234 5678",
            email: "branch@example.com",
            time_stamp: 1705315200000,
            ...overrides
        };
    }

    describe("No Changes", () => {
        it("should return empty array when values are identical", () => {
            const oldValue = createGroup();
            const newValue = createGroup();

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes).toHaveLength(0);
        });

        it("should return empty array when both values are undefined", () => {
            const changes = generateAuditDiff(GroupSchema, undefined, undefined);

            expect(changes).toHaveLength(0);
        });
    });

    describe("Simple Field Changes", () => {
        it("should detect string field change", () => {
            const oldValue = createGroup({ name: "Old Name" });
            const newValue = createGroup({ name: "New Name" });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes).toHaveLength(1);
            expect(changes[0]).toEqual({
                label: "Name",
                path: "name",
                oldValue: "Old Name",
                newValue: "New Name"
            });
        });

        it("should detect number field change", () => {
            const oldValue = createGroup({ account_id: 1001 });
            const newValue = createGroup({ account_id: 2002 });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes).toHaveLength(1);
            expect(changes[0]).toEqual({
                label: "Account ID",
                path: "account_id",
                oldValue: 1001,
                newValue: 2002
            });
        });

        it("should detect boolean field change", () => {
            const oldValue = createGroup({ deleted: false });
            const newValue = createGroup({ deleted: true });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes).toHaveLength(1);
            expect(changes[0]).toEqual({
                label: "Deleted",
                path: "deleted",
                oldValue: false,
                newValue: true
            });
        });

        it("should detect enum field change and show label", () => {
            const oldValue = createGroup({ group_type_id: "Branch" });
            const newValue = createGroup({ group_type_id: "Admin" });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes).toHaveLength(1);
            expect(changes[0]).toEqual({
                label: "Group Type",
                path: "group_type_id",
                oldValue: "Branch",
                newValue: "Admin"
            });
        });
    });

    describe("Undefined to Value Changes", () => {
        it("should detect field added (undefined to value)", () => {
            const oldValue = createGroup({ tel: undefined });
            const newValue = createGroup({ tel: "+44 20 1234 5678" });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes).toHaveLength(1);
            expect(changes[0]).toEqual({
                label: "Telephone",
                path: "tel",
                oldValue: null,
                newValue: "+44 20 1234 5678"
            });
        });

        it("should detect field removed (value to undefined)", () => {
            const oldValue = createGroup({ tel: "+44 20 1234 5678" });
            const newValue = createGroup({ tel: undefined });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes).toHaveLength(1);
            expect(changes[0]).toEqual({
                label: "Telephone",
                path: "tel",
                oldValue: "+44 20 1234 5678",
                newValue: null
            });
        });
    });

    describe("Nested Object Changes", () => {
        it("should detect address field change", () => {
            const oldValue = createGroup({
                address: {
                    is_non_uk_address: false,
                    street: "Old Street",
                    town: "London",
                    postcode: "SW1A 1AA",
                    uk_country_key: "england",
                    formatted_address: "Old Street, London, SW1A 1AA"
                }
            });
            const newValue = createGroup({
                address: {
                    is_non_uk_address: false,
                    street: "New Street",
                    town: "London",
                    postcode: "SW1A 1AA",
                    uk_country_key: "england",
                    formatted_address: "New Street, London, SW1A 1AA"
                }
            });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            // Street change and formatted_address change (computed field)
            expect(changes.length).toBeGreaterThanOrEqual(1);
            const streetChange = changes.find(c => c.path === "address.street");
            expect(streetChange).toEqual({
                label: "Street",
                path: "address.street",
                oldValue: "Old Street",
                newValue: "New Street"
            });
        });

        it("should detect multiple address field changes", () => {
            const oldValue = createGroup({
                address: {
                    is_non_uk_address: false,
                    street: "Old Street",
                    town: "Old Town",
                    postcode: "SW1A 1AA",
                    uk_country_key: "england",
                    formatted_address: "Old Street, Old Town, SW1A 1AA"
                }
            });
            const newValue = createGroup({
                address: {
                    is_non_uk_address: false,
                    street: "New Street",
                    town: "New Town",
                    postcode: "SW1A 1AA",
                    uk_country_key: "england",
                    formatted_address: "New Street, New Town, SW1A 1AA"
                }
            });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            // Street, Town, and formatted_address changes
            expect(changes.length).toBeGreaterThanOrEqual(2);
            expect(changes).toContainEqual({
                label: "Street",
                path: "address.street",
                oldValue: "Old Street",
                newValue: "New Street"
            });
            expect(changes).toContainEqual({
                label: "Town",
                path: "address.town",
                oldValue: "Old Town",
                newValue: "New Town"
            });
        });

        it("should detect address enum field change", () => {
            const oldValue = createGroup({
                address: {
                    is_non_uk_address: false,
                    street: "Main Street",
                    town: "London",
                    postcode: "SW1A 1AA",
                    uk_country_key: "england",
                    formatted_address: "Main Street, London, SW1A 1AA"
                }
            });
            const newValue = createGroup({
                address: {
                    is_non_uk_address: false,
                    street: "Main Street",
                    town: "Edinburgh",
                    postcode: "EH1 1AA",
                    uk_country_key: "scotland",
                    formatted_address: "Main Street, Edinburgh, EH1 1AA"
                }
            });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes.length).toBeGreaterThanOrEqual(1);
            const countryChange = changes.find(c => c.path === "address.uk_country_key");
            expect(countryChange).toBeDefined();
            // Enum values are formatted to show labels, not keys
            expect(countryChange?.oldValue).toBe("England");
            expect(countryChange?.newValue).toBe("Scotland");
        });
    });

    describe("Array Changes", () => {
        it("should detect array item added", () => {
            const oldValue = createGroup({ settings: [] });
            const newValue = createGroup({
                settings: [
                    { key: "theme", value: "dark" }
                ]
            });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes.length).toBeGreaterThan(0);
            const keyChange = changes.find(c => c.path === "settings.[0].key");
            const valueChange = changes.find(c => c.path === "settings.[0].value");
            expect(keyChange).toBeDefined();
            expect(valueChange).toBeDefined();
            expect(keyChange?.newValue).toBe("theme");
            expect(valueChange?.newValue).toBe("dark");
        });

        it("should detect array item removed", () => {
            const oldValue = createGroup({
                settings: [
                    { key: "theme", value: "dark" }
                ]
            });
            const newValue = createGroup({ settings: [] });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes.length).toBeGreaterThan(0);
            const keyChange = changes.find(c => c.path === "settings.[0].key");
            const valueChange = changes.find(c => c.path === "settings.[0].value");
            expect(keyChange).toBeDefined();
            expect(valueChange).toBeDefined();
            expect(keyChange?.oldValue).toBe("theme");
            expect(valueChange?.oldValue).toBe("dark");
        });

        it("should detect array item field change", () => {
            const oldValue = createGroup({
                settings: [
                    { key: "theme", value: "light" }
                ]
            });
            const newValue = createGroup({
                settings: [
                    { key: "theme", value: "dark" }
                ]
            });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes).toHaveLength(1);
            expect(changes[0]).toEqual({
                label: "Value",
                path: "settings.[0].value",
                oldValue: "light",
                newValue: "dark"
            });
        });

        it("should detect changes in nested array items", () => {
            const oldValue = createGroup({
                lists: [
                    {
                        list_type: "TemplateVisibility",
                        items: [
                            { text_value: "Template 1" }
                        ]
                    }
                ]
            });
            const newValue = createGroup({
                lists: [
                    {
                        list_type: "TemplateVisibility",
                        items: [
                            { text_value: "Template 2" }
                        ]
                    }
                ]
            });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes).toHaveLength(1);
            expect(changes[0]).toEqual({
                label: "Text Value",
                path: "lists.[0].items.[0].text_value",
                oldValue: "Template 1",
                newValue: "Template 2"
            });
        });

        it("should detect changes in task_configurations array", () => {
            const oldValue = createGroup({
                task_configurations: [
                    {
                        task_document: {
                            category: "firm_disclosure",
                            sub_type: "disclosure"
                        },
                        enabled_business_types: ["residential_mortgage"]
                    }
                ]
            });
            const newValue = createGroup({
                task_configurations: [
                    {
                        task_document: {
                            category: "firm_disclosure",
                            sub_type: "disclosure"
                        },
                        enabled_business_types: ["residential_mortgage", "btl_mortgage"]
                    }
                ]
            });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            // Should detect the array length change or item addition
            expect(changes.length).toBeGreaterThan(0);
        });

        it("should detect changes in section_field_requirements", () => {
            const oldValue = createGroup({
                section_field_requirements: [
                    {
                        section_id: "fact_find.personal_details",
                        enabled_field_ids: ["first_name"]
                    }
                ]
            });
            const newValue = createGroup({
                section_field_requirements: [
                    {
                        section_id: "fact_find.personal_details",
                        enabled_field_ids: ["first_name", "date_of_birth"]
                    }
                ]
            });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            // Should detect the array length change
            expect(changes.length).toBeGreaterThan(0);
        });
    });

    describe("Multiple Changes", () => {
        it("should detect multiple unrelated field changes", () => {
            const oldValue = createGroup({
                name: "Old Name",
                email: "old@example.com",
                account_id: 1001
            });
            const newValue = createGroup({
                name: "New Name",
                email: "new@example.com",
                account_id: 2002
            });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes).toHaveLength(3);
            expect(changes).toContainEqual({
                label: "Name",
                path: "name",
                oldValue: "Old Name",
                newValue: "New Name"
            });
            expect(changes).toContainEqual({
                label: "Email",
                path: "email",
                oldValue: "old@example.com",
                newValue: "new@example.com"
            });
            expect(changes).toContainEqual({
                label: "Account ID",
                path: "account_id",
                oldValue: 1001,
                newValue: 2002
            });
        });

        it("should detect changes across nested objects and arrays", () => {
            const oldValue = createGroup({
                name: "Old Name",
                address: {
                    is_non_uk_address: false,
                    street: "Old Street",
                    town: "London",
                    postcode: "SW1A 1AA",
                    uk_country_key: "england",
                    formatted_address: "Old Street, London, SW1A 1AA"
                },
                settings: [
                    { key: "theme", value: "light" }
                ]
            });
            const newValue = createGroup({
                name: "New Name",
                address: {
                    is_non_uk_address: false,
                    street: "New Street",
                    town: "London",
                    postcode: "SW1A 1AA",
                    uk_country_key: "england",
                    formatted_address: "New Street, London, SW1A 1AA"
                },
                settings: [
                    { key: "theme", value: "dark" }
                ]
            });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes.length).toBeGreaterThanOrEqual(3);
            expect(changes).toContainEqual({
                label: "Name",
                path: "name",
                oldValue: "Old Name",
                newValue: "New Name"
            });
            expect(changes).toContainEqual({
                label: "Street",
                path: "address.street",
                oldValue: "Old Street",
                newValue: "New Street"
            });
            expect(changes).toContainEqual({
                label: "Value",
                path: "settings.[0].value",
                oldValue: "light",
                newValue: "dark"
            });
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty string to value change", () => {
            const oldValue = createGroup({ name: "" });
            const newValue = createGroup({ name: "New Name" });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes).toHaveLength(1);
            expect(changes[0].oldValue).toBe("");
            expect(changes[0].newValue).toBe("New Name");
        });

        it("should handle null to value change", () => {
            const oldValue = createGroup({ tel: null as any });
            const newValue = createGroup({ tel: "+44 20 1234 5678" });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes).toHaveLength(1);
            expect(changes[0].oldValue).toBe(null);
            expect(changes[0].newValue).toBe("+44 20 1234 5678");
        });

        it("should handle array with different lengths", () => {
            const oldValue = createGroup({
                settings: [
                    { key: "key1", value: "value1" }
                ]
            });
            const newValue = createGroup({
                settings: [
                    { key: "key1", value: "value1" },
                    { key: "key2", value: "value2" }
                ]
            });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            // Should detect the new item
            expect(changes.length).toBeGreaterThan(0);
            const key2Change = changes.find(c => c.path === "settings.[1].key");
            expect(key2Change).toBeDefined();
        });

        it("should format paths correctly with array indices", () => {
            const oldValue = createGroup({
                settings: [
                    { key: "theme", value: "light" }
                ]
            });
            const newValue = createGroup({
                settings: [
                    { key: "theme", value: "dark" }
                ]
            });

            const changes = generateAuditDiff(GroupSchema, oldValue, newValue);

            expect(changes[0].path).toBe("settings.[0].value");
        });
    });
});

