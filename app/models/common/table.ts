/**
 * Generic database table row structure
 * Based on the document-style storage model where JSON is stored in body column
 * id is always a number (auto-increment) and exists in the database
 */
export type TableRow = {
    id: number; // Auto-increment primary key, always exists in DB
    body: string; // JSON document
    account_id: number; // Tenant/account identifier
};

/**
 * Helper to parse a table row into an entity
 * Extracts the JSON body and ensures the id from the database row is included
 * The id always exists in the database row and is always a number
 */
export function parseTableRow<T extends { id: number }>(
    row: TableRow
): T | null {
    if (!row?.body) {
        return null;
    }

    try {
        const entity = JSON.parse(row.body) as Omit<T, "id">;
        // Ensure id from database row is included (id always exists in DB as number)
        return {
            ...entity,
            id: row.id
        } as T;
    } catch (error) {
        throw new Error(`Failed to parse table row body: ${error}`);
    }
}

/**
 * Helper to serialize an entity to a table row body
 */
export function serializeEntity(entity: Record<string, any>): string {
    return JSON.stringify(entity);
}

/**
 * Convert ISO datetime string to Unix timestamp (seconds since epoch)
 */
export function toUnixTimestamp(isoString: string): number {
    return Math.floor(new Date(isoString).getTime() / 1000);
}

/**
 * Convert Unix timestamp to ISO datetime string
 */
export function fromUnixTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toISOString();
}
