import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { processCreate, processUpdate, readEntity, type CreateInput } from "../app/server/db-utils";
import { Client, ClientSchema, IndividualClient } from "../app/models/client/client";
import type { UserSession } from "../app/server/UserSession";

const CLIENTS_TABLE_MINIMAL =
  "CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, body TEXT NOT NULL)";

function makeSession(overrides: Partial<UserSession> = {}): UserSession {
  return {
    display_name: "Test User",
    user_type_key: "user",
    user_id: "user-1",
    group_id: "grp-1",
    group_linkage: "grp-1",
    account_id: 1001,
    db_shard_id: "cust-db1",
    ...overrides,
  };
}

describe("db-utils (D1 integration)", () => {
  beforeAll(async () => {
    await env.CUST_DB1.prepare(CLIENTS_TABLE_MINIMAL).run();
  });

  it("saves and reads a client via processCreate and readEntity", async () => {
    const db = env.CUST_DB1;
    const accountId = 1001;
    const session = makeSession({ account_id: accountId });

    const clientData: CreateInput<IndividualClient> = {
      client_type: "individual" as const,
      primary_advisor_id: "adv-1",
      group_id: "grp-1",
      first_name: "Jane",
      last_name: "Doe",
      client_relationships: [],
    };

    const createResult = await processCreate(
      db,
      "clients",
      clientData,
      session,
      ClientSchema,
      "Client"
    );

    expect(createResult.success).toBe(true);
    if (!createResult.success) throw new Error("expected success");
    const created = createResult.entity as unknown as { id: number; first_name: string; last_name: string };
    expect(created.id).toBeGreaterThan(0);
    expect(created.first_name).toBe("Jane");
    expect(created.last_name).toBe("Doe");

    const readResult = await readEntity<Client>(
      db,
      "clients",
      created.id,
      accountId
    );

    expect(readResult).not.toBeNull();
    if (!readResult) throw new Error("expected entity");
    expect(readResult.id).toBe(created.id);
    expect(readResult.client_type).toBe("individual");
    if (readResult.client_type !== "individual") throw new Error("expected individual client");
    const individual = readResult as Extract<Client, { client_type: "individual" }>;
    expect(individual.first_name).toBe("Jane");
    expect(individual.last_name).toBe("Doe");

    // Update the client and verify persistence
    const updatePayload: Client = {
      ...individual,
      id: created.id,
      version: individual.version,
      account_id: accountId,
      first_name: "Janet",
      last_name: "Smith",
    };

    const updateResult = await processUpdate(
      db,
      "clients",
      updatePayload,
      session,
      ClientSchema,
      "Client"
    );

    expect(updateResult.success).toBe(true);
    if (!updateResult.success) throw new Error("expected update success");
    if (updateResult.entity.client_type !== "individual") throw new Error("expected individual client");
    expect(updateResult.entity.first_name).toBe("Janet");
    expect(updateResult.entity.last_name).toBe("Smith");

    const readAfterUpdate = await readEntity<Client>(
      db,
      "clients",
      created.id,
      accountId
    );

    expect(readAfterUpdate).not.toBeNull();
    if (!readAfterUpdate) throw new Error("expected entity after update");
    const individualAfter = readAfterUpdate as Extract<Client, { client_type: "individual" }>;
    expect(individualAfter.first_name).toBe("Janet");
    expect(individualAfter.last_name).toBe("Smith");
    expect((readAfterUpdate as { version: number }).version).toBe((readResult as { version: number }).version + 1);
  });
});
