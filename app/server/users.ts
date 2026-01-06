import { UserSchema, type User } from "~/models/admin/user";
import { GroupSchema, type Group } from "~/models/admin/group";
import { type ValidationResult } from "~/utils/validation";
import { processUpdate, readEntity, processCreate } from "./db-utils";
import type { UserSession } from "./client";

/**
 * User database access helper
 * Provides CRUD operations for user records with validation and audit logging
 */
export class UserDB {
    constructor(
        private readonly db: D1Database,
        private readonly accountId: number
    ) { }

    /**
     * Create a new user record
     * @param userData - The user data to create (without tracking fields)
     * @param userId - User ID creating the record
     * @returns The created user with generated ID and tracking fields
     */
    async create(
        userData: Omit<User, "id" | "created_at" | "updated_at" | "created_by" | "updated_by" | "version" | "account_id" | "is_deleted">,
        userSession: UserSession
    ): Promise<{ success: true; user: User } | { success: false; validation: ValidationResult }> {
        const result = await processCreate(
            this.db,
            "users",
            userData as any,
            userSession,
            UserSchema,
            "User"
        );

        return result.success
            ? { success: true as const, user: result.entity }
            : result;
    }

    /**
     * Get a user by ID
     * @param userId - The user ID to retrieve
     * @returns The user record or null if not found
     */
    async get(userId: number): Promise<User | null> {
        const result = await readEntity<User>(this.db, "users", userId, this.accountId);
        return result?.entity ?? null;
    }

    /**
     * Update an existing user record
     * Validates the data and generates audit trail of changes
     * @param userId - The user ID to update
     * @param userData - The updated user data (should contain id and version from existing user)
     * @param userSession - User session containing user_id, account_id, and db_shard_id
     * @returns Success with updated user, or validation errors in standardized format
     * @throws Error if user not found or database operation fails
     */
    async update(
        userId: number,
        userData: User & { id?: number; version?: number },
        userSession: UserSession
    ): Promise<{ success: true; user: User } | { success: false; validation: ValidationResult }> {
        // Merge id directly into existing object to avoid unnecessary spread
        const userDataWithId = Object.assign(userData, { id: userId }) as User & { id: number; version: number; account_id: number };
        const result = await processUpdate(this.db, "users", userDataWithId, userSession, UserSchema, "User");

        return result.success
            ? { success: true as const, user: result.entity }
            : result;
    }
}

/**
 * Group database access helper
 * Provides CRUD operations for group records with validation and audit logging
 */
export class GroupDB {
    constructor(
        private readonly db: D1Database,
        private readonly accountId: number
    ) { }

    /**
     * Create a new group record
     * @param groupData - The group data to create (without tracking fields)
     * @param userId - User ID creating the record
     * @returns The created group with generated ID and tracking fields
     */
    async create(
        groupData: Omit<Group, "id" | "created_at" | "updated_at" | "created_by" | "updated_by" | "version" | "account_id">,
        userSession: UserSession
    ): Promise<{ success: true; group: Group } | { success: false; validation: ValidationResult }> {
        const result = await processCreate(
            this.db,
            "groups",
            groupData as any,
            userSession,
            GroupSchema,
            "Group"
        );

        return result.success
            ? { success: true as const, group: result.entity }
            : result;
    }

    /**
     * Get a group by ID
     * @param groupId - The group ID to retrieve
     * @returns The group record or null if not found
     */
    async get(groupId: number): Promise<Group | null> {
        const result = await readEntity<Group>(this.db, "groups", groupId, this.accountId);
        return result?.entity ?? null;
    }

    /**
     * Update an existing group record
     * Validates the data and generates audit trail of changes
     * @param groupId - The group ID to update
     * @param groupData - The updated group data (should contain id and version from existing group)
     * @param userSession - User session containing user_id, account_id, and db_shard_id
     * @returns Success with updated group, or validation errors in standardized format
     * @throws Error if group not found or database operation fails
     */
    async update(
        groupId: number,
        groupData: Group & { id?: number; version?: number },
        userSession: UserSession
    ): Promise<{ success: true; group: Group } | { success: false; validation: ValidationResult }> {
        // Merge id directly into existing object to avoid unnecessary spread
        const groupDataWithId = Object.assign(groupData, { id: groupId }) as Group & { id: number; version: number; account_id: number };
        const result = await processUpdate(this.db, "groups", groupDataWithId, userSession, GroupSchema, "Group");

        return result.success
            ? { success: true as const, group: result.entity }
            : result;
    }
}
