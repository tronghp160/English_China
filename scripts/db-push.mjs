// Applies supabase/migrations to the project in SUPABASE_DB_URL (.env.local), no `supabase link` needed.
// Usage: pnpm db:push [--dry-run]
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const line = fs
  .readFileSync(".env.local", "utf8")
  .split(/\r?\n/)
  .find((l) => l.startsWith("SUPABASE_DB_URL="));
const url = line?.slice("SUPABASE_DB_URL=".length).trim();
if (!url) {
  console.error("SUPABASE_DB_URL is empty in .env.local (Supabase → Connect → Session pooler).");
  process.exit(1);
}

const { status } = spawnSync("pnpm", ["exec", "supabase", "db", "push", "--db-url", url, ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(status ?? 1);
