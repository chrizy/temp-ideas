/**
 * User session information for database operations
 */
export type UserSession = {
    display_name: string;
    /** User type key - identifies the type of user */
    user_type_key: "user" | "introducer" | "client";
    /** User ID - identifies the user */
    user_id: string;
    /** Group ID - identifies the group that the user belongs to */
    group_id: string;
    /** Group linkage - identifies the hierarchical path to the group */
    group_linkage: string;
    /** Tenant/Account ID - identifies which account owns this record */
    account_id: number;
    /** Account stack binding ID — routes to this account's dedicated Worker + Account D1 */
    db_shard_id: string;

};
