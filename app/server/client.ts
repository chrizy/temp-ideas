import { ClientSchema, type Client } from "~/models/client/client";
import type { ValidationResult } from "~/utils/validation";
import { processUpdate, readEntity, processCreate, type CreateInput } from "./db-utils";
import type { UserSession } from "./UserSession";

export { userClientPermission } from "./client-access";

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
     * @param clientData - Client data without system-managed fields (id, account_id, tracking, version)
     * @param userSession - User session for creator and account
     * @returns The created client with generated id and tracking, or validation errors
     */
    async create(
        clientData: CreateInput<Client>,
        userSession: UserSession
    ): Promise<{ success: true; client: Client } | { success: false; validation: ValidationResult }> {
        const result = await processCreate<Client>(
            this.db,
            "clients",
            clientData,
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
        return result ?? null;
    }

    /**
     * Update an existing client record (validation, optimistic lock, audit diff).
     * @param clientData - Full client with id, version, and account_id from existing record
     * @param userSession - User session for updater and account
     * @returns Success with updated client, or validation (e.g. version conflict)
     * @throws Error if client not found or database operation fails
     */
    async update(
        clientData: Client,
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
