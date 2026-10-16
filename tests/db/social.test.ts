import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;
let carol: string;

async function insertDeck(owner: string, fields: { name: string; visibility?: string; group_id?: string }) {
  return as(db, owner, async () => {
    const res = await db.query<{ id: string }>(
      `insert into public.decks (owner_id, name, language, visibility, group_id)
       values ($1, $2, 'en', $3, $4) returning id`,
      [owner, fields.name, fields.visibility ?? "private", fields.group_id ?? null],
    );
    return res.rows[0].id;
  });
}

async function insertWord(user: string, deckId: string, term: string) {
  return as(db, user, () =>
    db.query(
      `insert into public.words (deck_id, created_by, language, term, normalized, meaning_vi)
       values ($1, $2, 'en', $3, $3, 'nghĩa')`,
      [deckId, user, term],
    ),
  );
}

async function createGroup(owner: string, name: string) {
  const id = await as(db, owner, async () => {
    const r = await db.query<{ id: string }>(
      "insert into public.groups (name, owner_id) values ($1, $2) returning id",
      [name, owner],
    );
    return r.rows[0].id;
  });
  const code = await db.query<{ invite_code: string }>("select invite_code from public.groups where id = $1", [id]);
  return { id, code: code.rows[0].invite_code };
}

beforeAll(async () => {
  db = await createDb();
  alice = await createUser(db, "alice@example.com", "Alice");
  bob = await createUser(db, "bob@example.com", "Bob");
  carol = await createUser(db, "carol@example.com", "Carol");
}, 60_000);

describe("Phase 5 acceptance: A creates a group, B joins by link", () => {
  let group: { id: string; code: string };
  let groupDeck: string;
  let privateDeck: string;

  beforeAll(async () => {
    group = await createGroup(alice, "Lớp HSK");
    groupDeck = await insertDeck(alice, { name: "HSK 1", visibility: "group", group_id: group.id });
    privateDeck = await insertDeck(alice, { name: "Riêng của Alice" });
    await insertWord(alice, groupDeck, "hello");
    await insertWord(alice, groupDeck, "world");
    await insertWord(alice, privateDeck, "secret");
  });

  it("the preview works before joining, even signed out", async () => {
    const p = await as(db, null, () =>
      db.query<{ name: string; member_count: number; owner_name: string }>(
        "select * from public.group_preview($1)",
        [group.code],
      ),
    );
    expect(p.rows[0]).toMatchObject({ name: "Lớp HSK", member_count: 1, owner_name: "Alice" });
  });

  it("B joins, studies the group deck with own progress, and cannot see A's private deck", async () => {
    const gid = await as(db, bob, () =>
      db.query<{ join_group: string }>("select public.join_group($1)", [` ${group.code.toLowerCase()} `]),
    );
    expect(gid.rows[0].join_group).toBe(group.id);

    const decks = await as(db, bob, () =>
      db.query<{ name: string; relation: string }>("select name, relation from public.my_decks()"),
    );
    expect(decks.rows).toEqual([{ name: "HSK 1", relation: "group" }]);

    await as(db, bob, () => db.query("select public.ensure_user_cards()"));
    const due = await as(db, bob, () => db.query("select * from public.get_due_cards()"));
    expect(due.rows).toHaveLength(2);
    // Alice has no cards from Bob's session
    const aliceCards = await db.query("select * from public.user_cards where user_id = $1", [alice]);
    expect(aliceCards.rows).toHaveLength(0);

    const priv = await as(db, bob, () => db.query("select * from public.decks where id = $1", [privateDeck]));
    expect(priv.rows).toHaveLength(0);
    const privWords = await as(db, bob, () =>
      db.query("select * from public.words where deck_id = $1", [privateDeck]),
    );
    expect(privWords.rows).toHaveLength(0);
  });

  it("joining twice is a no-op", async () => {
    await as(db, bob, () => db.query("select public.join_group($1)", [group.code]));
    const m = await db.query("select * from public.group_members where group_id = $1", [group.id]);
    expect(m.rows).toHaveLength(2);
  });

  it("the weekly leaderboard shows both members", async () => {
    await as(db, "service", () =>
      db.query(
        `select public.record_review($1, w.id, 'recognize', 'flashcard', 3::smallint, true, 1000, true,
           jsonb_build_object('state','learning','due',now(),'stability',1,'difficulty',5,'reps',1,'lapses',0,'last_review',now()))
         from public.words w where w.deck_id = $2 limit 1`,
        [bob, groupDeck],
      ),
    );
    const lb = await as(db, alice, () =>
      db.query<{ display_name: string; xp: number }>("select display_name, xp from public.weekly_leaderboard($1)", [
        group.id,
      ]),
    );
    expect(lb.rows.map((r) => r.display_name).sort()).toEqual(["Alice", "Bob"]);
    // Alice earned XP by adding 3 words; Bob by one review
    expect(lb.rows.find((r) => r.display_name === "Bob")!.xp).toBeGreaterThan(0);
  });

  it("my_groups lists groups with counts for the caller only", async () => {
    const g = await as(db, bob, () =>
      db.query<{ name: string; role: string; member_count: number; deck_count: number }>(
        "select name, role, member_count, deck_count from public.my_groups()",
      ),
    );
    expect(g.rows).toEqual([{ name: "Lớp HSK", role: "member", member_count: 2, deck_count: 1 }]);
    const c = await as(db, carol, () => db.query("select * from public.my_groups()"));
    expect(c.rows).toHaveLength(0);
  });

  it("group_activity shows added words and joins, only to members", async () => {
    const a = await as(db, bob, () =>
      db.query<{ kind: string; display_name: string; deck_name: string | null; n: number }>(
        "select kind, display_name, deck_name, n from public.group_activity($1)",
        [group.id],
      ),
    );
    expect(a.rows).toEqual(
      expect.arrayContaining([
        { kind: "words", display_name: "Alice", deck_name: "HSK 1", n: 2 },
        { kind: "joined", display_name: "Bob", deck_name: null, n: 0 },
        { kind: "created", display_name: "Alice", deck_name: null, n: 0 },
      ]),
    );
    // words in Alice's private deck never show up
    expect(a.rows.some((r) => r.deck_name === "Riêng của Alice")).toBe(false);
    await expect(
      as(db, carol, () => db.query("select * from public.group_activity($1)", [group.id])),
    ).rejects.toThrow(/forbidden/);
  });

  it("an invalid code is rejected", async () => {
    await expect(as(db, carol, () => db.query("select public.join_group('ZZZZZZZZ')"))).rejects.toThrow(
      /invalid_invite_code/,
    );
  });
});

describe("leaving and deleting groups", () => {
  it("a member who leaves takes their group decks back as private", async () => {
    const g = await createGroup(alice, "Nhóm tạm");
    await as(db, carol, () => db.query("select public.join_group($1)", [g.code]));
    const carolDeck = await insertDeck(carol, { name: "Của Carol", visibility: "group", group_id: g.id });
    await as(db, carol, () =>
      db.query("delete from public.group_members where group_id = $1 and user_id = $2", [g.id, carol]),
    );
    const d = await db.query<{ visibility: string; group_id: string | null }>(
      "select visibility, group_id from public.decks where id = $1",
      [carolDeck],
    );
    expect(d.rows[0]).toEqual({ visibility: "private", group_id: null });
    const seen = await as(db, alice, () => db.query("select * from public.decks where id = $1", [carolDeck]));
    expect(seen.rows).toHaveLength(0);
  });

  it("deleting a group keeps its decks as private decks of their owners", async () => {
    const g = await createGroup(alice, "Sẽ xóa");
    const deck = await insertDeck(alice, { name: "Deck nhóm", visibility: "group", group_id: g.id });
    await as(db, bob, () => db.query("delete from public.groups where id = $1", [g.id]));
    expect((await db.query("select * from public.groups where id = $1", [g.id])).rows).toHaveLength(1);
    await as(db, alice, () => db.query("delete from public.groups where id = $1", [g.id]));
    const d = await db.query<{ visibility: string; group_id: string | null }>(
      "select visibility, group_id from public.decks where id = $1",
      [deck],
    );
    expect(d.rows[0]).toEqual({ visibility: "private", group_id: null });
  });
});

describe("share links", () => {
  it("a link-shared private deck is readable only after subscribing", async () => {
    const deck = await insertDeck(alice, { name: "Link deck" });
    await insertWord(alice, deck, "linked");
    await as(db, alice, () => db.query("update public.decks set share_slug = 'abc123xyz' where id = $1", [deck]));
    const before = await as(db, carol, () => db.query("select * from public.words where deck_id = $1", [deck]));
    expect(before.rows).toHaveLength(0);
    // the server subscribes with the service role after resolving the slug
    await as(db, "service", () =>
      db.query("insert into public.deck_subscriptions (user_id, deck_id) values ($1, $2)", [carol, deck]),
    );
    const after = await as(db, carol, () => db.query("select * from public.words where deck_id = $1", [deck]));
    expect(after.rows).toHaveLength(1);
    // turning the link off hides it again
    await as(db, alice, () => db.query("update public.decks set share_slug = null where id = $1", [deck]));
    const off = await as(db, carol, () => db.query("select * from public.words where deck_id = $1", [deck]));
    expect(off.rows).toHaveLength(0);
  });

  it("clone_deck copies words into a private deck of the caller", async () => {
    const src = await insertDeck(alice, { name: "Nguồn", visibility: "public" });
    await insertWord(alice, src, "copy me");
    const r = await as(db, "service", () =>
      db.query<{ clone_deck: string }>("select public.clone_deck($1, $2)", [bob, src]),
    );
    const copy = await db.query<{ owner_id: string; visibility: string; word_count: number; cloned_from: string }>(
      "select owner_id, visibility, word_count, cloned_from from public.decks where id = $1",
      [r.rows[0].clone_deck],
    );
    expect(copy.rows[0]).toEqual({ owner_id: bob, visibility: "private", word_count: 1, cloned_from: src });
  });
});
