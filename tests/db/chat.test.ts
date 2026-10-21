import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;
let thread: string;

beforeAll(async () => {
  db = await createDb();
  alice = await createUser(db, "alice@example.com", "Alice");
  bob = await createUser(db, "bob@example.com", "Bob");
  thread = await as(db, alice, async () => {
    const res = await db.query<{ id: string }>(
      "insert into public.chat_threads (user_id, language, title) values ($1, 'en', 'affect vs effect') returning id",
      [alice],
    );
    await db.query(
      `insert into public.chat_messages (thread_id, id, user_id, role, parts)
       values ($1, 'm1', $2, 'user', '[{"type":"text","text":"hi"}]')`,
      [res.rows[0].id, alice],
    );
    return res.rows[0].id;
  });
}, 60_000);

describe("chat RLS", () => {
  it("lets the owner read their thread and messages", async () => {
    const rows = await as(db, alice, () => db.query("select id from public.chat_messages where thread_id = $1", [thread]));
    expect(rows.rows).toHaveLength(1);
  });

  it("hides threads and messages from other users and anon", async () => {
    const threads = await as(db, bob, () => db.query("select id from public.chat_threads"));
    const messages = await as(db, bob, () => db.query("select id from public.chat_messages"));
    expect(threads.rows).toHaveLength(0);
    expect(messages.rows).toHaveLength(0);
    await expect(as(db, null, () => db.query("select id from public.chat_threads"))).rejects.toThrow();
  });

  it("refuses messages in someone else's thread, even with the right user_id", async () => {
    await expect(
      as(db, bob, () =>
        db.query(
          `insert into public.chat_messages (thread_id, id, user_id, role, parts) values ($1, 'x', $2, 'user', '[]')`,
          [thread, bob],
        ),
      ),
    ).rejects.toThrow();
    await expect(
      as(db, bob, () =>
        db.query("insert into public.chat_threads (user_id, language) values ($1, 'en')", [alice]),
      ),
    ).rejects.toThrow();
  });

  it("does not let others delete, and cascades messages when the owner deletes", async () => {
    const del = await as(db, bob, () => db.query("delete from public.chat_threads where id = $1 returning id", [thread]));
    expect(del.rows).toHaveLength(0);
    await as(db, alice, () => db.query("delete from public.chat_threads where id = $1", [thread]));
    const left = await db.query("select 1 from public.chat_messages where thread_id = $1", [thread]);
    expect(left.rows).toHaveLength(0);
  });
});
