import type { Client } from "./client";

const test_client: Client = {
    client_type: "individual",
    first_name: "John",
    last_name: "Doe",
    primary_advisor_id: "123",
    group_id: "456",
    account_id: 1,
    version: 1,
    has_dual_nationality: false,
    nationality_secondary: null,
    is_deceased: false,
    updated_by: "123",
    health_and_lifestyle: {
        height_in_cm: 180,
        weight_in_kg: 70,
        has_any_medical_conditions: false,
        medical_conditions_details_note: null,
        has_family_member_died_or_serious_illness_before_age_65: false,
        family_member_illness_note: null,
    },
    addresses: [
        {
            client_address_id: "123",
            address: {
                postcode: "AB1 2CD",
                is_uk: true,
            },
            residency_start_date: new Date().toISOString(),
            is_current_address: true,
            occupancy_type: "owned_outright"
        }
    ],
    contact_details:
    {
        preferred_method_of_contact: "email",
        emails: [
            {
                email: "john.doe@example.com",
                purpose: "work",
                is_default: true,
            }
        ],
        phones: [
            {
                purpose: "work",
                country_code: "44",
                phone_number: "020 1234 5678",
            },
        ]
    }
};    
