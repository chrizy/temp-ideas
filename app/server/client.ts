import { ClientSchema, type Client } from "~/models/client/client";
import { type ValidationResult } from "~/utils/validation";
import { processUpdate, readEntity, processCreate } from "./db-utils";

/**
 * User session information for database operations
 */
export type UserSession = {
    user_type_key: "user" | "introducer" | "client";
    user_id: string;
    account_id: number;
    db_shard_id: string;
};

/**
 * Client database access helper
 * Provides CRUD operations for client records with validation and audit logging
 */
export class ClientDB {
    constructor(
        private readonly db: D1Database,
        private readonly accountId: number
    ) { }

    /**
     * Create a new client record
     * @param clientData - The client data to create (without tracking fields)
     * @param userId - User ID creating the record
     * @returns The created client with generated ID and tracking fields
     */
    async create(
        clientData: Omit<Client, "id" | "created_at" | "updated_at" | "created_by" | "updated_by" | "version" | "account_id" | "is_deleted">,
        userSession: UserSession
    ): Promise<{ success: true; client: Client } | { success: false; validation: ValidationResult }> {
        const result = await processCreate(
            this.db,
            "clients",
            clientData as any,
            userSession,
            ClientSchema,
            "Client"
        );

        return result.success
            ? { success: true as const, client: result.entity }
            : result;
    }

    /**
     * Get a client by ID
     * @param clientId - The client ID to retrieve (always a number)
     * @returns The client record or null if not found
     */
    async get(clientId: number): Promise<Client | null> {
        const result = await readEntity<Client>(this.db, "clients", clientId, this.accountId);
        return result?.entity ?? null;
    }

    /**
     * Update an existing client record
     * Validates the data and generates audit trail of changes
     * @param clientData - The updated client data (must contain id and version from existing client)
     * @param userSession - User session containing user_id, account_id, and db_shard_id
     * @returns Success with updated client, or validation errors in standardized format
     * @throws Error if client not found or database operation fails
     */
    async update(
        clientData: Client & { id: number; version: number; account_id: number },
        userSession: UserSession
    ): Promise<{ success: true; client: Client } | { success: false; validation: ValidationResult }> {
        const result = await processUpdate(this.db, "clients", clientData, userSession, ClientSchema, "Client");

        // TODO: add permissions check,  
        // does user have write access to this client?
        // linkage check
        // notification to user that the client has been updated
        // audit
        // maybe cache permission check in KV. if user has write access to this client, then cache the result in KV.

        return result.success
            ? { success: true as const, client: result.entity }
            : result;
    }
}
