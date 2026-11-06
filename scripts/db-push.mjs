// Applies supabase/migrations to the project in SUPABASE_DB_URL (.env.local), no `supabase link` needed.
// Usage: pnpm db:push [--dry-run]
//
// The Supabase CLI parses every .env* file of its working directory and fails on a multi-line value such as
// CLONE_PROFILE ("failed to parse environment file: .env.local"). So it runs from a temporary folder that holds only
// a copy of supabase/ (config + migrations), and never sees .env.local. The database URL is read here with Node's
// own parser and passed as an argument.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseEnv } from "node:util";

const url = parseEnv(fs.readFileSync(".env.local", "utf8")).SUPABASE_DB_URL?.trim();
if (!url) {
  console.error("SUPABASE_DB_URL is empty in .env.local (Supabase → Connect → Session pooler).");
  process.exit(1);
}

const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "sotu-db-push-"));
let status = 1;
try {
  fs.cpSync("supabase", path.join(workdir, "supabase"), { recursive: true });
  const cli = path.resolve("node_modules", ".bin", process.platform === "win32" ? "supabase.cmd" : "supabase");
  ({ status } = spawnSync(cli, ["db", "push", "--db-url", url, ...process.argv.slice(2)], {
    cwd: workdir,
    stdio: "inherit",
    shell: process.platform === "win32",
  }));
} finally {
  fs.rmSync(workdir, { recursive: true, force: true });
}
process.exit(status ?? 1);
