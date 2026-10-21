import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;
let carol: string;

/** A deck with one word whose recognize card is due now. */
async function dueCard(user: string, term: string) {
  await as(db, user, async () => {
    const deck = await db.query<{ id: string }>(
      "insert into public.decks (owner_id, name, language) values ($1, 'Deck', 'en') returning id",
      [user],
    );
    await db.query(
      `insert into public.words (deck_id, created_by, language, term, normalized, meaning_vi)
       values ($1, $2, 'en', $3, $3, 'nghĩa')`,
      [deck.rows[0].id, user, term],
    );
    await db.query("select public.ensure_user_cards()");
  });
  await db.query(
    "update public.user_cards set state = 'review', due = now() - interval '1 hour' where user_id = $1 and direction = 'recognize'",
    [user],
  );
}

async function subscribe(user: string, endpoint: string) {
  await as(db, "service", () =>
    db.query("insert into public.push_subscriptions (endpoint, user_id, p256dh, auth) values ($1, $2, 'k', 'a')", [
      endpoint,
      user,
    ]),
  );
}

beforeAll(async () => {
  db = await createDb();
  alice = await createUser(db, "alice@example.com", "Alice");
  bob = await createUser(db, "bob@example.com", "Bob");
  carol = await createUser(db, "carol@example.com", "Carol");
  await dueCard(alice, "resilient");
  await dueCard(bob, "brave"); // due but no subscription
  await subscribe(alice, "https://push.example.com/a");
  await subscribe(carol, "https://push.example.com/c"); // subscribed, nothing due
}, 60_000);

describe("daily reminders", () => {
  it("targets only subscribed users with due cards", async () => {
    const res = await as(db, "service", () => db.query<{ user_id: string; due_count: number }>("select * from public.reminder_targets()"));
    expect(res.rows).toEqual([{ user_id: alice, due_count: 1 }]);
  });

  it("skips a user already reminded today", async () => {
    await as(db, "service", () => db.query("select public.mark_reminded($1)", [[alice]]));
    const res = await as(db, "service", () => db.query("select * from public.reminder_targets()"));
    expect(res.rows).toHaveLength(0);
  });

  it("keeps subscriptions and the reminder functions away from clients", async () => {
    await expect(as(db, alice, () => db.query("select * from public.push_subscriptions"))).rejects.toThrow();
    await expect(
      as(db, alice, () =>
        db.query("insert into public.push_subscriptions (endpoint, user_id, p256dh, auth) values ('https://x', $1, 'k', 'a')", [alice]),
      ),
    ).rejects.toThrow();
    await expect(as(db, alice, () => db.query("select * from public.reminder_targets()"))).rejects.toThrow();
    await expect(as(db, alice, () => db.query("select public.mark_reminded($1)", [[bob]]))).rejects.toThrow();
  });

  it("rejects non-https endpoints", async () => {
    await expect(subscribe(bob, "http://push.example.com/b")).rejects.toThrow();
  });
});
