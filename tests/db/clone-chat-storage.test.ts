import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

let db: Db;
let alice: string;
const threadId = "11111111-1111-4111-8111-111111111111";

beforeAll(async () => {
  db = await createDb();
  alice = await createUser(db, "alice@example.com", "Alice");
  await as(db, "service", async () => {
    await db.query("insert into public.clone_threads (id, user_id, title) values ($1, $2, 'Thử')", [threadId, alice]);
    await db.query("insert into public.clone_messages (thread_id, id, user_id, role, content) values ($1, 'm1', $2, 'user', 'xin chào')", [
      threadId,
      alice,
    ]);
  });
}, 60_000);

describe.each(["clone_threads", "clone_messages"])("%s: client roles have no access", (table) => {
  it("anon cannot read it", async () => {
    await expect(as(db, null, () => db.query(`select * from public.${table}`))).rejects.toThrow(/permission denied/i);
  });

  it("the signed-in owner cannot read their own rows", async () => {
    await expect(as(db, alice, () => db.query(`select * from public.${table}`))).rejects.toThrow(/permission denied/i);
  });

  it("the signed-in owner cannot delete their own rows", async () => {
    await expect(as(db, alice, () => db.query(`delete from public.${table}`))).rejects.toThrow(/permission denied/i);
  });

  it("the service role reads it", async () => {
    const res = await as(db, "service", () => db.query(`select * from public.${table}`));
    expect(res.rows).toHaveLength(1);
  });
});

describe("clone_threads: lifecycle", () => {
  it("deleting a thread removes its messages", async () => {
    const count = await as(db, "service", async () => {
      await db.query("delete from public.clone_threads where id = $1", [threadId]);
      return (await db.query("select * from public.clone_messages where thread_id = $1", [threadId])).rows.length;
    });
    expect(count).toBe(0);
  });
});
