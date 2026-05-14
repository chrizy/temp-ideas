import { readdir, access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { manifest } from "../app/models/documents/fixtures/manifest";

const execFileAsync = promisify(execFile);

async function main() {
  const __dirname = fileURLToPath(new URL(".", import.meta.url));
  const repoRoot = join(__dirname, "..");
  const fixturesDir = join(repoRoot, "app/models/documents/fixtures");

  // If you later add optional `source_path` per manifest entry, you can upload from there too.
  for (const entry of manifest) {
    if (!entry?.source_path || !entry?.r2_key) continue;
    const filePath = join(repoRoot, String(entry.source_path));
    const key = String(entry.r2_key);
    try {
      await access(filePath);
    } catch {
      // eslint-disable-next-line no-console
      console.warn(`Skipping missing source_path: ${entry.source_path}`);
      continue;
    }
    await execFileAsync(
      "pnpm",
      ["-s", "wrangler", "r2", "object", "put", `typeed-forms-test-fixtures/${key}`, "--file", filePath, "--remote"],
      { cwd: repoRoot, env: process.env }
    );
    // eslint-disable-next-line no-console
    console.log(`Uploaded ${filePath} -> r2://typeed-forms-test-fixtures/${key}`);
  }

  const entries = await readdir(fixturesDir, { withFileTypes: true });
  const pdfs = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"))
    .map((e) => e.name);

  if (pdfs.length === 0) {
    throw new Error(`No PDFs found in ${fixturesDir}. Add PDFs there first.`);
  }

  // Upload each PDF to R2 under: documents/<filename>
  for (const name of pdfs) {
    const filePath = join(fixturesDir, name);
    const key = `documents/${name}`;
    // Uses your existing OAuth login; no API token needed.
    await execFileAsync("pnpm", ["-s", "wrangler", "r2", "object", "put", `typeed-forms-test-fixtures/${key}`, "--file", filePath, "--remote"], {
      cwd: repoRoot,
      env: process.env,
    });
    // eslint-disable-next-line no-console
    console.log(`Uploaded ${name} -> r2://typeed-forms-test-fixtures/${key}`);
  }
}

await main();

