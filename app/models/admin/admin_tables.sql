
CREATE TABLE groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,     -- tenant
  name TEXT NOT NULL,

  parent_id INTEGER NULL,       -- FK to groups(id)
  lineage TEXT NOT NULL,        -- dot-notation, e.g. "1.2.5"

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Important indexes
CREATE INDEX idx_groups_tenant ON groups(account_id);
CREATE INDEX idx_groups_parent ON groups(account_id, parent_id);

-- Index to make prefix subtree queries fast
CREATE INDEX idx_groups_lineage ON groups(account_id, lineage);





async function createGroup(env, accountId, name, parentId) {
  const db = env.SHARED_D1;

  // Step 1: get parent lineage if needed
  let parentLineage = null;

  if (parentId) {
    const { results } = await db.prepare(
      "SELECT lineage FROM groups WHERE id = ? AND account_id = ?"
    ).bind(parentId, accountId).all();

    if (results.length === 0) throw new Error("Parent not found");
    parentLineage = results[0].lineage;
  }

  // Step 2: insert row to get new ID
  const insert = await db.prepare(
    `INSERT INTO groups (account_id, name, parent_id, lineage)
     VALUES (?, ?, ?, '')`
  ).bind(accountId, name, parentId).run();

  const newId = insert.meta.last_row_id;

  // Step 3: compute lineage
  const lineage = parentLineage
    ? `${parentLineage}.${newId}`
    : `${newId}`;

  // Step 4: update lineage
  await db.prepare(
    "UPDATE groups SET lineage = ? WHERE id = ?"
  ).bind(lineage, newId).run();

  return { id: newId, lineage };
}
