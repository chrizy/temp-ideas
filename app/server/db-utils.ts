import type { Schema } from "~/models/base_schema_types";
import { validateObject, type ValidationResult } from "~/utils/validation";
import { generateAuditDiff } from "~/utils/audit";
import type { UserSession } from "./UserSession";
import { parseTableRow, serializeEntity, type TableRow } from "~/models/common/table";

/** Returns current UTC time in schema datetime format (YYYY-MM-DD HH:MM:SS). */
function nowDatetime(): string {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
}

/**
 * Valid table names — use this union for static checking. Do not interpolate arbitrary strings into SQL.
 */
export type TableName = "clients" | "client_dependants" | "users" | "groups" | "accounts";

/** Keys set by the DB or by processCreate; omit these when passing data to create a new record. */
export const CREATED_BY_SYSTEM_KEYS = [
    "id",
    "account_id",
    "created_at",
    "updated_at",
    "created_by",
    "created_by_user_type",
    "updated_by",
    "version",
] as const;

/** Payload for creating a new entity: entity type minus system-managed fields. */
export type CreateInput<T> = Omit<T, (typeof CREATED_BY_SYSTEM_KEYS)[number]>;

/** Minimum shape required for processUpdate; tracking fields are always set on create/update. */
export type EntityWithTracking = {
    id: number;
    account_id: number;
    version: number;
    created_at: string;
    updated_at: string;
    created_by: string;
    created_by_user_type: string;
    updated_by: string;
    [key: string]: unknown;
};

/** Result of processCreate or processUpdate. */
export type EntityMutationResult<T> =
    | { success: true; entity: T }
    | { success: false; validation: ValidationResult };

function versionConflictValidation(entityName: string, other = "unknown"): { success: false; validation: ValidationResult } {
    return {
        success: false,
        validation: {
            isValid: false,
            errors: [{
                path: ["version"],
                message: `Another user (${other}) has updated this ${entityName.toLowerCase()}. Please refresh and try again.`,
                fieldLabel: "Version"
            }]
        }
    };
}

/**
 * Read an entity from the database by id and account (tenant isolation).
 *
 * @param db - D1Database instance
 * @param tableName - Table name (must be a valid TableName)
 * @param entityId - Entity ID to retrieve
 * @param accountId - Account ID for tenant isolation
 * @returns Parsed entity with id from the row, or null if not found
 */
export async function readEntity<T extends { id?: number | null; updated_by: string }>(
    db: D1Database,
    tableName: TableName,
    entityId: number,
    accountId: number
): Promise<T | null> {
    const result = await db
        .prepare(`SELECT id, body, account_id FROM ${tableName} WHERE id = ? AND account_id = ?`)
        .bind(entityId, accountId)
        .first<TableRow>();

    if (!result) return null;

    const entity = parseTableRow<T & { id: number }>(result);
    return entity ?? null;
}

/**
 * Update an existing entity: validation, optimistic locking, and audit diff.
 *
 * @param db - D1Database instance
 * @param tableName - Table name (must be a valid TableName)
 * @param entityData - Full entity with id, version, and account_id from existing record
 * @param userSession - User session (user_id, account_id, db_shard_id)
 * @param schema - Schema for validation
 * @param entityName - Human-readable name for error messages
 * @returns Success with updated entity, or validation (including version conflict)
 * @throws Error if entity not found, unauthorized, or database operation fails
 */
export async function processUpdate<T extends EntityWithTracking>(
    db: D1Database,
    tableName: TableName,
    entityData: T,
    userSession: UserSession,
    schema: Schema,
    entityName: string
): Promise<EntityMutationResult<T>> {
    const entityId = entityData.id;
    if (!entityId) throw new Error(`${entityName} ID is required`);

    const existingEntity = await readEntity<T>(db, tableName, entityId, userSession.account_id);
    if (!existingEntity) throw new Error(`${entityName} with ID ${entityId} not found`);

    if (existingEntity.account_id !== userSession.account_id) {
        throw new Error(`Unauthorized: ${entityName} does not belong to your account`);
    }

    const expectedVersion = entityData.version;
    if (existingEntity.version !== expectedVersion) {
        return versionConflictValidation(entityName, existingEntity.updated_by);
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
        updated_at: nowDatetime(),
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

    if ((updateResult.meta?.changes ?? 0) === 0) {
        const latest = await readEntity<T>(db, tableName, entityId, userSession.account_id);
        return versionConflictValidation(entityName, latest?.updated_by);
    }

    return {
        success: true,
        entity: updatedEntity
    };
}

/**
 * Create a new entity: validation, tracking fields, and insert.
 *
 * @param db - D1Database instance
 * @param tableName - Table name (must be a valid TableName)
 * @param entityData - Entity data without system fields (use CreateInput&lt;T&gt;)
 * @param userSession - User session (user_id, account_id, user_type_key)
 * @param schema - Schema for validation
 * @param entityName - Human-readable name for error messages
 * @returns Success with created entity (including generated id), or validation errors
 * @throws Error if insert fails or generated id is missing
 */
export async function processCreate<T extends Record<string, unknown>>(
    db: D1Database,
    tableName: TableName,
    entityData: CreateInput<T>,
    userSession: UserSession,
    schema: Schema,
    entityName: string
): Promise<EntityMutationResult<T>> {
    const now = nowDatetime();
    const entityWithTracking = {
        ...entityData,
        id: 0, // placeholder for validation; real id from DB after insert
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

