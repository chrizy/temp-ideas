import type { Schema } from "~/models/base_schema_types";
import { validateObject, type ValidationResult } from "~/utils/validation";
import { generateAuditDiff } from "~/utils/audit";
import type { UserSession } from "./UserSession";
import { parseTableRow, serializeEntity, type TableRow } from "~/models/common/table";

/**
 * Valid table names — use this union type for static checking (no runtime validation).
 */
type TableName = "clients" | "client_dependants" | "users" | "groups" | "accounts";

/** Keys set by the DB or by processCreate; omit these when passing data to create a new record. */
const CREATED_BY_SYSTEM_KEYS = [
    "id",
    "account_id",
    "created_at",
    "updated_at",
    "created_by",
    "created_by_user_type",
    "updated_by",
    "version",
] as const;

/** Payload type for creating a new entity: entity type minus system-managed fields (id, version, tracking, etc.). */
export type CreateInput<T> = Omit<T, (typeof CREATED_BY_SYSTEM_KEYS)[number]>;

/**
 * Read an entity from the database
 * @param db - D1Database instance
 * @param tableName - Name of the table (e.g., "clients", "users", "groups")
 * @param entityId - Entity ID to retrieve
 * @param accountId - Account ID for tenant isolation
 * @returns The parsed entity (id from DB row), or null if not found
 */
export async function readEntity<T extends { id?: number | null }>(
    db: D1Database,
    tableName: TableName,
    entityId: number,
    accountId: number
): Promise<T | null> {

    const result = await db.prepare(
        `SELECT id, body, account_id FROM ${tableName} WHERE id = ? AND account_id = ?`
    )
        .bind(entityId, accountId)
        .first<TableRow>();

    if (!result) {
        return null;
    }

    const entity = parseTableRow<T & { id: number }>(result);
    if (!entity) {
        return null;
    }

    return entity;
}

/**
 * Common update logic for all entity types
 * Handles validation, version checking, account validation, and audit generation
 * @param db - D1Database instance
 * @param tableName - Name of the table (e.g., "clients", "users", "groups")
 * @param entityData - The updated entity data (must contain id and version from existing entity)
 * @param userSession - User session containing user_id, account_id, and db_shard_id
 * @param schema - Schema for validation
 * @param entityName - Human-readable entity name for error messages
 * @returns Success with updated entity, or validation errors in standardized format
 * @throws Error if entity not found, unauthorized access, or database operation fails
 */
export async function processUpdate<T extends Record<string, any> & { id: number; version: number; account_id: number }>(
    db: D1Database,
    tableName: TableName,
    entityData: T,
    userSession: UserSession,
    schema: Schema,
    entityName: string
): Promise<{ success: true; entity: T } | { success: false; validation: ValidationResult }> {

    // Extract entity ID from entityData
    const entityId = entityData.id;
    if (!entityId) {
        throw new Error(`${entityName} ID is required`);
    }

    // Read existing entity from database
    const existingResult = await readEntity<T>(db, tableName, entityId, userSession.account_id);

    if (!existingResult) {
        throw new Error(`${entityName} with ID ${entityId} not found`);
    }

    const existingEntity = existingResult;

    // Account ownership is already validated by WHERE clause in readEntity
    // This check is redundant but kept for explicit error messaging
    if (existingEntity.account_id !== userSession.account_id) {
        throw new Error(`Unauthorized: ${entityName} does not belong to your account`);
    }

    const expectedVersion = entityData.version;
    // Check version for optimistic concurrency control
    if ((existingEntity as any).version !== expectedVersion) {
        const otherUserId = existingEntity.updated_by ?? "unknown";
        return {
            success: false,
            validation: {
                isValid: false,
                errors: [{
                    path: ["version"],
                    message: `Another user (${otherUserId}) has updated this ${entityName.toLowerCase()}. Please refresh and try again.`,
                    fieldLabel: "Version"
                }]
            }
        };
    }

    // Merge with existing data, preserving tracking fields
    // Extract fields to avoid spreading entire objects
    const { id: _id, version: _version, ...entityDataWithoutMeta } = entityData;
    const { id: _existingId, ...entityWithoutId } = existingEntity;

    const updatedData = {
        ...entityWithoutId,
        ...entityDataWithoutMeta,
        id: entityId,
        // Preserve immutable tracking fields
        created_at: existingEntity.created_at,
        created_by_user_type: existingEntity.created_by_user_type,
        created_by: existingEntity.created_by,
        // Increment version
        version: existingEntity.version + 1,
        // Update mutable tracking fields
        updated_at: new Date().toISOString(),
        updated_by: userSession.user_id,
        // Ensure account_id matches user session
        account_id: userSession.account_id
    } as unknown as T;

    // Validate the updated data
    const validationResult = validateObject(schema, updatedData);
    if (!validationResult.isValid) {
        return {
            success: false,
            validation: {
                isValid: false,
                errors: validationResult.errors
            }
        };
    }

    // Generate audit diff for audit logging
    // TODO: Save audit changes to database
    generateAuditDiff(schema, existingEntity, validationResult.value);

    // Build the updated entity with id
    const updatedEntity = {
        ...validationResult.value,
        id: entityId,
        account_id: userSession.account_id
    } as T;

    // Serialize and update database
    const bodyJson = serializeEntity(updatedEntity);

    const updateResult = await db.prepare(
        `UPDATE ${tableName}
         SET body = ?
         WHERE id = ?
           AND account_id = ?
           AND json_extract(body, '$.version') = ?`
    )
        .bind(bodyJson, entityId, userSession.account_id, expectedVersion)
        .run();

    if (!updateResult.success) {
        throw new Error(`Failed to update ${entityName} in database`);
    }

    // If 0 rows changed, another writer updated the record after we read it.
    if ((updateResult.meta?.changes ?? 0) === 0) {
        const latest = await readEntity<T>(db, tableName, entityId, userSession.account_id);
        const otherUserId = latest?.updated_by ?? "unknown";
        return {
            success: false,
            validation: {
                isValid: false,
                errors: [{
                    path: ["version"],
                    message: `Another user (${otherUserId}) has updated this ${entityName.toLowerCase()}. Please refresh and try again.`,
                    fieldLabel: "Version"
                }]
            }
        };
    }

    return {
        success: true,
        entity: updatedEntity
    };
}

/**
 * Common create logic for all entity types
 * Handles validation, setting base tracking fields, and database insertion
 * Auto-generated IDs are always integers and come from the database
 * @param db - D1Database instance
 * @param tableName - Name of the table (e.g., "clients", "users", "groups")
 * @param entityData - The entity data to create (without tracking fields)
 * @param userSession - User session containing user_id, account_id, and db_shard_id
 * @param schema - Schema for validation
 * @param entityName - Human-readable entity name for error messages
 * @returns Success with created entity, or validation errors in standardized format
 * @throws Error if database operation fails
 */
export async function processCreate<T extends Record<string, any>>(
    db: D1Database,
    tableName: TableName,
    entityData: CreateInput<T>,
    userSession: UserSession,
    schema: Schema,
    entityName: string
): Promise<{ success: true; entity: T } | { success: false; validation: ValidationResult }> {

    // Set base tracking fields (id placeholder for validation; real id from DB after insert)
    const now = new Date().toISOString();
    const entityWithTracking = {
        ...entityData,
        id: 0,
        account_id: userSession.account_id,
        created_at: now,
        updated_at: now,
        created_by: userSession.user_id,
        created_by_user_type: userSession.user_type_key,
        updated_by: userSession.user_id,
        version: 1
    } as unknown as T;

    // Validate the entity data
    const validationResult = validateObject(schema, entityWithTracking);
    if (!validationResult.isValid) {
        return {
            success: false,
            validation: {
                isValid: false,
                errors: validationResult.errors
            }
        };
    }

    // Serialize entity to JSON for storage
    const bodyJson = serializeEntity(validationResult.value);

    // Insert into database (id is auto-incremented)
    const insertResult = await db.prepare(
        `INSERT INTO ${tableName} (account_id, body) VALUES (?, ?)`
    )
        .bind(userSession.account_id, bodyJson)
        .run();

    if (!insertResult.success) {
        throw new Error(`Failed to create ${entityName} in database`);
    }

    // Get the auto-generated ID from the INSERT result metadata
    const entityId = insertResult.meta.last_row_id;
    if (!entityId || entityId === 0) {
        throw new Error(`Failed to retrieve generated ID for ${entityName}`);
    }

    // Build the final entity with the generated ID
    const finalEntity = {
        ...validationResult.value,
        id: entityId
    } as unknown as T;

    return {
        success: true,
        entity: finalEntity
    };
}

