import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..");

/** Fresh database with the Supabase shim + all migrations applied. */
export async function createDb() {
  const db = await PGlite.create({ extensions: { pg_trgm } });
  await db.exec(readFileSync(join(__dirname, "supabase-shim.sql"), "utf8"));
  const dir = join(root, "supabase", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(join(dir, file), "utf8"));
    } catch (e) {
      throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
    }
  }
  return db;
}

export type Db = Awaited<ReturnType<typeof createDb>>;

export async function createUser(db: Db, email: string, name?: string): Promise<string> {
  const res = await db.query<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify(name ? { full_name: name } : {})],
  );
  return res.rows[0].id;
}

/**
 * Run fn as a signed-in user (role authenticated + JWT sub), like PostgREST does.
 * Pass null for the anon role, or "service" for service_role.
 */
export async function as<T>(db: Db, who: string | null | "service", fn: () => Promise<T>): Promise<T> {
  const role = who === "service" ? "service_role" : who ? "authenticated" : "anon";
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    who && who !== "service" ? who : "",
  ]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}
