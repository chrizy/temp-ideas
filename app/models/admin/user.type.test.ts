import type { User } from "./user";

const test_user: User = {
    account_id: 1,
    version: 1,
    group_id: "123",
    login_detail: {
        email: "test@example.com",
        password: "password"
    },
    access_to_all_users_in_group: {
        read: true,
        write: true,
        delete: true
    },
    access_to_user_entries: [
        {
            user_ids: ["123"],
            capabilities: {
                read: true,
                write: true,
                delete: true
            }
        }
    ],
    access_to_all_sub_groups: {
        read: true,
        write: true,
        delete: true
    }
};