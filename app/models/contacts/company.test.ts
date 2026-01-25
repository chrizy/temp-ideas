import { describe, it, expect } from "vitest";
import type { Company, CompanyBranch } from "./company";
import type { Individual } from "./individual";

describe("Company Type Inference", () => {
    it("should create a company object with correct type inference", () => {
        const company: Company = {
            id: 1,
            account_id: 100,
            version: 1,
            name: "Acme Corporation",
            company_type: "estate_agent",
            website_url: "https://acme.com",
            address: {
                is_non_uk_address: false,
                postcode: "SW1A 1AA",
                street: "10 Downing Street",
                town: "London",
            },
            phones: [
                {
                    purpose: "work",
                    phone_number: "020 1234 5678",
                    department: "Sales",
                },
            ],
            emails: [
                {
                    purpose: "work",
                    email: "info@acme.com",
                    department: "General",
                },
            ],
            branches: [
                {
                    branch_id: "branch-001",
                    business_branch_name: "London Branch",
                    address: {
                        is_non_uk_address: false,
                        postcode: "EC1A 1BB",
                        street: "123 High Street",
                        town: "London",
                    },
                    phones: [
                        {
                            purpose: "work",
                            phone_number: "020 9876 5432",
                            department: "Branch Office",
                        },
                    ],
                    emails: [
                        {
                            purpose: "work",
                            email: "london@acme.com",
                            department: "Branch",
                        },
                    ],
                },
                {
                    branch_id: "branch-002",
                    business_branch_name: "Manchester Branch",
                    address: {
                        is_non_uk_address: false,
                        postcode: "M1 1AA",
                        street: "456 Main Street",
                        town: "Manchester",
                    },
                },
            ],
            referral_partner: {
                referral_partner_status: "active",
            },
            introducer: {
                introducer_status: "active",
                introducer_parent_status: "approved",
                requests: [],
            },
        };

        const indv1: Individual = {
            id: 1,
            account_id: 100,
            version: 1,
            first_name: "John",
            last_name: "Doe",
            company_id: 1,
            business_role: "Sales Progresser",
            phones: [
                {
                    purpose: "work",
                    phone_number: "020 1234 5678",
                },
            ],
            emails: [
                {
                    purpose: "work",
                    email: "info@acme.com",
                },
            ],
        };

        // Type check: company should be of type Company
        expect(company).toBeDefined();
        expect(company.name).toBe("Acme Corporation");
        expect(company.company_type).toBe("estate_agent");
        expect(company.branches).toBeDefined();
        expect(company.branches?.length).toBe(2);

        // Type check: branches should be of type CompanyBranch[]
        const branches: CompanyBranch[] | null | undefined = company.branches;
        expect(branches).toBeDefined();
        if (branches) {
            expect(branches[0].branch_id).toBe("branch-001");
            expect(branches[0].business_branch_name).toBe("London Branch");
            expect(branches[1].branch_id).toBe("branch-002");
            expect(branches[1].business_branch_name).toBe("Manchester Branch");
        }

        // Type check: verify nested types
        expect(company.address?.is_non_uk_address).toBe(false);
        expect(company.phones?.[0]?.phone_number).toBe("020 1234 5678");
        expect(company.emails?.[0]?.email).toBe("info@acme.com");
        expect(company.referral_partner?.referral_partner_status).toBe("active");
        expect(company.introducer?.introducer_status).toBe("active");
    });

    it("should allow company with minimal required fields", () => {
        const minimalCompany: Company = {
            id: 2,
            account_id: 101,
            version: 1,
            name: "Minimal Company", // name is now required
            // All other fields are optional
        };

        expect(minimalCompany.account_id).toBe(101);
        expect(minimalCompany.version).toBe(1);
        expect(minimalCompany.name).toBe("Minimal Company");
        expect(minimalCompany.branches).toBeUndefined();
    });

    it("should allow company with empty branches array", () => {
        const company: Company = {
            id: 3,
            account_id: 102,
            version: 1,
            name: "Single Location Corp",
            company_type: "solicitor",
            branches: [],
        };

        expect(company.branches).toBeDefined();
        expect(company.branches?.length).toBe(0);
    });

    it("should allow company with non-UK address", () => {
        const company: Company = {
            id: 4,
            account_id: 103,
            version: 1,
            name: "International Corp",
            company_type: "accountant",
            address: {
                is_non_uk_address: true,
                international_line_1: "123 Main Street",
                international_line_2: "Suite 100",
                country_key: "USA",
                economic_region_key: "NA",
            },
        };

        expect(company.address?.is_non_uk_address).toBe(true);
        if (company.address && "international_line_1" in company.address) {
            expect(company.address.international_line_1).toBe("123 Main Street");
        }
    });

    it("should allow company with introducer requests", () => {
        const company: Company = {
            id: 5,
            account_id: 104,
            version: 1,
            name: "Introducer Corp",
            company_type: "ifa",
            introducer: {
                introducer_status: "active",
                introducer_parent_status: "pending",
                requests: [
                    {
                        company_introducer_parent_status: "pending",
                        company_introducer_management_request_status: "request_set_up",
                        requested_by_user_id: "user-123",
                        requested_at: "2024-01-15 10:00:00",
                        note: "Initial setup request",
                    },
                ],
            },
        };

        expect(company.introducer?.requests).toBeDefined();
        expect(company.introducer?.requests?.length).toBe(1);
        expect(company.introducer?.requests?.[0]?.requested_by_user_id).toBe("user-123");
    });

    it("should allow optional/nullable fields in company branch", () => {
        const branch: CompanyBranch = {
            branch_id: "branch-003",
            // business_branch_name is optional/nullable
            // address is optional/nullable
            // phones is optional/nullable
            // emails is optional/nullable
        };

        expect(branch.branch_id).toBe("branch-003");
        expect(branch.business_branch_name).toBeUndefined();
        expect(branch.address).toBeUndefined();
        expect(branch.phones).toBeUndefined();
        expect(branch.emails).toBeUndefined();
    });

    it("should allow nullable arrays in company branch", () => {
        const branch: CompanyBranch = {
            branch_id: "branch-004",
            business_branch_name: "Test Branch",
            phones: null,
            emails: null,
        };

        expect(branch.branch_id).toBe("branch-004");
        expect(branch.phones).toBeNull();
        expect(branch.emails).toBeNull();
    });

    it("should allow branch with empty arrays for phones and emails", () => {
        const branch: CompanyBranch = {
            branch_id: "branch-005",
            business_branch_name: "Empty Arrays Branch",
            phones: [],
            emails: [],
        };

        expect(branch.phones).toBeDefined();
        expect(branch.phones?.length).toBe(0);
        expect(branch.emails).toBeDefined();
        expect(branch.emails?.length).toBe(0);
    });

    it("should allow branch with non-UK address", () => {
        const branch: CompanyBranch = {
            branch_id: "branch-006",
            business_branch_name: "International Branch",
            address: {
                is_non_uk_address: true,
                international_line_1: "456 Global Ave",
                international_line_2: "Floor 5",
                country_key: "CAN",
                economic_region_key: "NA",
            },
        };

        expect(branch.address?.is_non_uk_address).toBe(true);
        if (branch.address && "international_line_1" in branch.address) {
            expect(branch.address.international_line_1).toBe("456 Global Ave");
        }
    });

    it("should enforce required branch_id field", () => {
        // TypeScript should enforce this at compile time
        // This test verifies the type system works correctly
        const branch: CompanyBranch = {
            branch_id: "required-field",
        };

        // branch_id is required, so this should compile
        expect(branch.branch_id).toBe("required-field");
    });
});
