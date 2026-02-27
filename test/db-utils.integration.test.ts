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
    const created = createResult.entity;
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

  it("rejects IndividualClient create when validation fails (max length, min length)", async () => {
    const db = env.CUST_DB1;
    const accountId = 1001;
    const session = makeSession({ account_id: accountId });

    const clientData: CreateInput<IndividualClient> = {
      client_type: "individual" as const,
      primary_advisor_id: "adv-1",
      group_id: "grp-1",
      first_name: "x".repeat(201),
      last_name: "A",
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

    expect(createResult.success).toBe(false);
    if (createResult.success) throw new Error("expected validation failure");
    expect(createResult.validation.isValid).toBe(false);
    expect(createResult.validation.errors.length).toBeGreaterThan(0);

    const paths = createResult.validation.errors.map((e) => e.path.join("."));
    expect(paths).toContain("first_name");
    expect(paths).toContain("last_name");

    const firstNameError = createResult.validation.errors.find(
      (e) => e.path.join(".") === "first_name"
    );
    const lastNameError = createResult.validation.errors.find(
      (e) => e.path.join(".") === "last_name"
    );
    expect(firstNameError?.message).toMatch(/200|max|length/i);
    expect(lastNameError?.message).toMatch(/2|min|length/i);
  });

  it("rejects IndividualClient create when DOB is invalid (future or before 1900)", async () => {
    const db = env.CUST_DB1;
    const accountId = 1001;
    const session = makeSession({ account_id: accountId });

    const futureDob: CreateInput<IndividualClient> = {
      client_type: "individual" as const,
      primary_advisor_id: "adv-1",
      group_id: "grp-1",
      first_name: "Jane",
      last_name: "Doe",
      dob: "2030-06-15",
      client_relationships: [],
    };

    const futureResult = await processCreate(
      db,
      "clients",
      futureDob,
      session,
      ClientSchema,
      "Client"
    );

    expect(futureResult.success).toBe(false);
    if (futureResult.success) throw new Error("expected validation failure");
    expect(futureResult.validation.isValid).toBe(false);
    const futurePaths = futureResult.validation.errors.map((e) => e.path.join("."));
    expect(futurePaths).toContain("dob");
    const futureDobError = futureResult.validation.errors.find((e) => e.path.join(".") === "dob");
    expect(futureDobError?.message).toMatch(/future|before|after/i);

    const before1900: CreateInput<IndividualClient> = {
      client_type: "individual" as const,
      primary_advisor_id: "adv-1",
      group_id: "grp-1",
      first_name: "Jane",
      last_name: "Doe",
      dob: "1899-12-31",
      client_relationships: [],
    };

    const beforeResult = await processCreate(
      db,
      "clients",
      before1900,
      session,
      ClientSchema,
      "Client"
    );

    expect(beforeResult.success).toBe(false);
    if (beforeResult.success) throw new Error("expected validation failure");
    expect(beforeResult.validation.isValid).toBe(false);
    const beforePaths = beforeResult.validation.errors.map((e) => e.path.join("."));
    expect(beforePaths).toContain("dob");
    const beforeDobError = beforeResult.validation.errors.find((e) => e.path.join(".") === "dob");
    expect(beforeDobError?.message).toMatch(/1900|after|before|on or after/i);
  });

  it("rejects IndividualClient create when number field is out of range (min/max)", async () => {
    const db = env.CUST_DB1;
    const accountId = 1001;
    const session = makeSession({ account_id: accountId });

    const overMax: CreateInput<IndividualClient> = {
      client_type: "individual" as const,
      primary_advisor_id: "adv-1",
      group_id: "grp-1",
      first_name: "Jane",
      last_name: "Doe",
      state_pension_age: 150,
      client_relationships: [],
    };

    const overResult = await processCreate(
      db,
      "clients",
      overMax,
      session,
      ClientSchema,
      "Client"
    );

    expect(overResult.success).toBe(false);
    if (overResult.success) throw new Error("expected validation failure");
    expect(overResult.validation.isValid).toBe(false);
    const overPaths = overResult.validation.errors.map((e) => e.path.join("."));
    expect(overPaths).toContain("state_pension_age");
    const overError = overResult.validation.errors.find(
      (e) => e.path.join(".") === "state_pension_age"
    );
    expect(overError?.message).toMatch(/120|max|no more/i);

    const underMin: CreateInput<IndividualClient> = {
      client_type: "individual" as const,
      primary_advisor_id: "adv-1",
      group_id: "grp-1",
      first_name: "Jane",
      last_name: "Doe",
      intended_retirement_age: -5,
      client_relationships: [],
    };

    const underResult = await processCreate(
      db,
      "clients",
      underMin,
      session,
      ClientSchema,
      "Client"
    );

    expect(underResult.success).toBe(false);
    if (underResult.success) throw new Error("expected validation failure");
    expect(underResult.validation.isValid).toBe(false);
    const underPaths = underResult.validation.errors.map((e) => e.path.join("."));
    expect(underPaths).toContain("intended_retirement_age");
    const underError = underResult.validation.errors.find(
      (e) => e.path.join(".") === "intended_retirement_age"
    );
    expect(underError?.message).toMatch(/0|min|at least/i);
  });
});
