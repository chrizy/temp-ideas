import type { Schema } from "~/models/base_schema_types";
import { validateObject, type ValidationResult } from "~/utils/validation";
import { generateAuditDiff } from "~/utils/audit";
import type { UserSession } from "./client";

/**
 * Common update logic for all entity types
 * Handles validation, version checking, account validation, and audit generation
 */
export async function processUpdate<T extends Record<string, any>>(
    db: D1Database,
    existingEntity: T | null,
    entityId: string | number,
    entityData: T,
    userSession: UserSession,
    schema: Schema,
    entityName: string
): Promise<{ success: true; entity: T } | { success: false; validation: ValidationResult }> {
    // Check if entity exists
    if (!existingEntity) {
        throw new Error(`${entityName} with ID ${entityId} not found`);
    }

    // Validate that entity's account_id matches user session's account_id
    const entityAccountId = (existingEntity as any).account_id;
    const sessionAccountId = userSession.account_id;
    if (entityAccountId !== undefined && String(entityAccountId) !== String(sessionAccountId)) {
        throw new Error(`Unauthorized: ${entityName} does not belong to your account`);
    }

    // Extract version from entityData for optimistic concurrency control
    const expectedVersion = (entityData as any).version;
    if ((entityData as any).version === undefined) {
        throw new Error("Version is required for optimistic concurrency control");
    }

    // Check version for optimistic concurrency control
    if ((existingEntity as any).version !== expectedVersion) {
        const otherUserId = (existingEntity as any).updated_by || "unknown";
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

    // Merge with existing data (exclude id and version from entityData as they're handled separately)
    const { id: _, version: __, ...entityDataWithoutMeta } = entityData as any;
    const { id: ___, ...entityWithoutId } = existingEntity as any;
    const updatedData = {
        ...entityWithoutId,
        ...entityDataWithoutMeta,
        // Preserve tracking fields from existing entity
        created_at: (existingEntity as any).created_at,
        created_by: (existingEntity as any).created_by,
        version: (existingEntity as any).version + 1,
        // Update tracking fields
        updated_at: new Date().toISOString(),
        updated_by: userSession.user_id,
        // Ensure account_id matches user session
        account_id: Number(sessionAccountId)
    } as T;

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
    // Store audit changes in audit table with entity_id, user_id, timestamp, and changes array
    generateAuditDiff(schema, existingEntity, validationResult.value);

    // Build the updated entity with id
    const updatedEntity = {
        ...validationResult.value,
        id: entityId,
        account_id: Number(sessionAccountId)
    } as T;

    return {
        success: true,
        entity: updatedEntity
    };
}
