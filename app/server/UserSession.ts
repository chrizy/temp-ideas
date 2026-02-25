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
    /** Database shard ID - identifies which database shard to use */
    db_shard_id: string;

};
