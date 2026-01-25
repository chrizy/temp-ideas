import { ClientDependantSchema, type ClientDependant } from "~/models/client/dependant";
import type { ValidationResult } from "~/utils/validation";
import { processCreate, processUpdate, readEntity } from "./db-utils";
import { parseTableRow, type TableRow, toUnixTimestamp } from "~/models/common/table";
import type { UserSession } from "./client";

type DependantClientJoinRow = TableRow & { client_id: number };

export class ClientDependantDB {
    constructor(
        private readonly db: D1Database,
        private readonly accountId: number
    ) { }

    async create(
        dependantData: Omit<ClientDependant, "id" | "created_at" | "updated_at" | "created_by" | "updated_by" | "version" | "account_id" | "is_deleted">,
        userSession: UserSession
    ): Promise<{ success: true; dependant: ClientDependant } | { success: false; validation: ValidationResult }> {
        const result = await processCreate(
            this.db,
            "client_dependants",
            dependantData as any,
            userSession,
            ClientDependantSchema,
            "Client Dependant"
        );

        return result.success
            ? { success: true as const, dependant: result.entity }
            : result;
    }

    async get(dependantId: number): Promise<ClientDependant | null> {
        const result = await readEntity<ClientDependant>(this.db, "client_dependants", dependantId, this.accountId);
        return result?.entity ?? null;
    }

    async update(
        dependantData: ClientDependant & { id: number; version: number; account_id: number },
        userSession: UserSession
    ): Promise<{ success: true; dependant: ClientDependant } | { success: false; validation: ValidationResult }> {
        const result = await processUpdate(
            this.db,
            "client_dependants",
            dependantData,
            userSession,
            ClientDependantSchema,
            "Client Dependant"
        );

        return result.success
            ? { success: true as const, dependant: result.entity }
            : result;
    }

    /**
     * Canonical loader: uses join table as source of truth.
     * Returns a Map keyed by client_id, with dependants for that client.
     */
    async listForClients(clientIds: number[]): Promise<Map<number, ClientDependant[]>> {
        const out = new Map<number, ClientDependant[]>();
        for (const id of clientIds) out.set(id, []);

        const uniqueClientIds = Array.from(new Set(clientIds)).filter((n) => Number.isFinite(n));
        if (uniqueClientIds.length === 0) return out;

        const placeholders = uniqueClientIds.map(() => "?").join(", ");

        const rows = await this.db
            .prepare(
                `SELECT cdc.client_id, d.id, d.body, d.account_id
                 FROM client_dependant_clients cdc
                 JOIN client_dependants d
                   ON d.id = cdc.dependant_id
                  AND d.account_id = cdc.account_id
                 WHERE cdc.account_id = ?
                   AND cdc.client_id IN (${placeholders})
                   AND (d.is_deleted IS NULL OR d.is_deleted = 0)
                 ORDER BY cdc.client_id, d.last_name, d.first_name`
            )
            .bind(this.accountId, ...uniqueClientIds)
            .all<DependantClientJoinRow>();

        for (const row of rows.results ?? []) {
            const entity = parseTableRow<ClientDependant & { id: number }>(row);
            if (!entity) continue;
            const arr = out.get(row.client_id) ?? [];
            arr.push(entity);
            out.set(row.client_id, arr);
        }

        return out;
    }

    /**
     * Add a link in the join table (idempotent).
     */
    async linkToClient(dependantId: number, clientId: number): Promise<void> {
        const createdAt = toUnixTimestamp(new Date().toISOString());
        await this.db
            .prepare(
                `INSERT OR IGNORE INTO client_dependant_clients (account_id, dependant_id, client_id, created_at)
                 VALUES (?, ?, ?, ?)`
            )
            .bind(this.accountId, dependantId, clientId, createdAt)
            .run();
    }

    /**
     * Remove a link in the join table.
     */
    async unlinkFromClient(dependantId: number, clientId: number): Promise<void> {
        await this.db
            .prepare(
                `DELETE FROM client_dependant_clients
                 WHERE account_id = ?
                   AND dependant_id = ?
                   AND client_id = ?`
            )
            .bind(this.accountId, dependantId, clientId)
            .run();
    }
}

