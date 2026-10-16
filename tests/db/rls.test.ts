import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;
let carol: string;
let alicePrivateDeck: string;
let aliceWord: string;

async function insertDeck(owner: string, fields: Record<string, unknown> = {}) {
  return as(db, owner, async () => {
    const res = await db.query<{ id: string }>(
      `insert into public.decks (owner_id, name, language, visibility, group_id, allow_member_edit)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [
        owner,
        fields.name ?? "Deck",
        fields.language ?? "en",
        fields.visibility ?? "private",
        fields.group_id ?? null,
        fields.allow_member_edit ?? false,
      ],
    );
    return res.rows[0].id;
  });
}

async function insertWord(user: string, deckId: string, term: string) {
  return as(db, user, async () => {
    const res = await db.query<{ id: string }>(
      `insert into public.words (deck_id, created_by, language, term, normalized, meaning_vi)
       values ($1, $2, 'en', $3, $3, 'nghĩa') returning id`,
      [deckId, user, term],
    );
    return res.rows[0].id;
  });
}

beforeAll(async () => {
  db = await createDb();
  alice = await createUser(db, "alice@example.com", "Alice");
  bob = await createUser(db, "bob@example.com", "Bob");
  carol = await createUser(db, "carol@example.com");
  alicePrivateDeck = await insertDeck(alice, { name: "Alice private" });
  aliceWord = await insertWord(alice, alicePrivateDeck, "resilient");
  await as(db, alice, () => db.query("select public.ensure_user_cards()"));
}, 60_000);

describe("profiles", () => {
  it("are created by trigger with a valid username", async () => {
    const res = await db.query<{ username: string; display_name: string }>(
      "select username, display_name from public.profiles where id = $1",
      [alice],
    );
    expect(res.rows[0]).toEqual({ username: "alice", display_name: "Alice" });
    const s = await db.query("select * from public.user_settings where user_id = $1", [alice]);
    expect(s.rows).toHaveLength(1);
  });

  it("dedupe usernames", async () => {
    const other = await createUser(db, "alice@other.com");
    const res = await db.query<{ username: string }>(
      "select username from public.profiles where id = $1",
      [other],
    );
    expect(res.rows[0].username).toMatch(/^alice\d{4}$/);
  });

  it("settings are private to the owner", async () => {
    const rows = await as(db, bob, () =>
      db.query("select * from public.user_settings where user_id = $1", [alice]),
    );
    expect(rows.rows).toHaveLength(0);
  });

  it("users cannot edit someone else's profile", async () => {
    await as(db, bob, () =>
      db.query("update public.profiles set display_name = 'hacked' where id = $1", [alice]),
    );
    const res = await db.query<{ display_name: string }>(
      "select display_name from public.profiles where id = $1",
      [alice],
    );
    expect(res.rows[0].display_name).toBe("Alice");
  });
});

describe("private decks", () => {
  it("B cannot read A's private deck or its words", async () => {
    const decks = await as(db, bob, () =>
      db.query("select * from public.decks where id = $1", [alicePrivateDeck]),
    );
    expect(decks.rows).toHaveLength(0);
    const words = await as(db, bob, () =>
      db.query("select * from public.words where deck_id = $1", [alicePrivateDeck]),
    );
    expect(words.rows).toHaveLength(0);
  });

  it("anonymous users read nothing", async () => {
    await expect(as(db, null, () => db.query("select * from public.decks"))).rejects.toThrow();
  });

  it("B cannot insert, update or delete words in A's deck", async () => {
    await expect(insertWord(bob, alicePrivateDeck, "sneaky")).rejects.toThrow();
    await as(db, bob, () =>
      db.query("update public.words set meaning_vi = 'hacked' where id = $1", [aliceWord]),
    );
    await as(db, bob, () => db.query("delete from public.words where id = $1", [aliceWord]));
    const res = await db.query<{ meaning_vi: string }>(
      "select meaning_vi from public.words where id = $1",
      [aliceWord],
    );
    expect(res.rows[0].meaning_vi).toBe("nghĩa");
  });

  it("B cannot change A's deck", async () => {
    await as(db, bob, () =>
      db.query("update public.decks set name = 'hacked' where id = $1", [alicePrivateDeck]),
    );
    const res = await db.query<{ name: string }>("select name from public.decks where id = $1", [
      alicePrivateDeck,
    ]);
    expect(res.rows[0].name).toBe("Alice private");
  });

  it("B cannot create a deck owned by A", async () => {
    await expect(
      as(db, bob, () =>
        db.query(
          "insert into public.decks (owner_id, name, language) values ($1, 'x', 'en')",
          [alice],
        ),
      ),
    ).rejects.toThrow();
  });

  it("B cannot subscribe to A's private deck", async () => {
    await expect(
      as(db, bob, () =>
        db.query("insert into public.deck_subscriptions (user_id, deck_id) values ($1, $2)", [
          bob,
          alicePrivateDeck,
        ]),
      ),
    ).rejects.toThrow();
  });

  it("word_count is maintained and not client-writable", async () => {
    const res = await db.query<{ word_count: number }>(
      "select word_count from public.decks where id = $1",
      [alicePrivateDeck],
    );
    expect(res.rows[0].word_count).toBe(1);
    await expect(
      as(db, alice, () =>
        db.query("update public.decks set word_count = 999 where id = $1", [alicePrivateDeck]),
      ),
    ).rejects.toThrow();
  });
});

describe("study data", () => {
  it("B cannot read A's user_cards, review logs or stats", async () => {
    const own = await as(db, alice, () => db.query("select * from public.user_cards"));
    expect(own.rows.length).toBeGreaterThan(0);
    const cards = await as(db, bob, () =>
      db.query("select * from public.user_cards where user_id = $1", [alice]),
    );
    expect(cards.rows).toHaveLength(0);
    const stats = await as(db, bob, () =>
      db.query("select * from public.daily_stats where user_id = $1", [alice]),
    );
    expect(stats.rows).toHaveLength(0);
  });

  it("clients cannot write user_cards directly", async () => {
    await expect(
      as(db, alice, () =>
        db.query("update public.user_cards set state = 'review' where user_id = $1", [alice]),
      ),
    ).rejects.toThrow();
  });

  it("record_review is server-only", async () => {
    await expect(
      as(db, alice, () =>
        db.query(
          `select public.record_review($1, $2, 'recognize', 'flashcard', 3::smallint, true, 1000, true, '{}'::jsonb)`,
          [alice, aliceWord],
        ),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("record_review (service role) updates card, log and daily stats", async () => {
    const card = {
      state: "learning",
      due: new Date(Date.now() + 600_000).toISOString(),
      stability: 2.3,
      difficulty: 5.1,
      elapsed_days: 0,
      scheduled_days: 0,
      learning_steps: 1,
      reps: 1,
      lapses: 0,
      last_review: new Date().toISOString(),
    };
    const res = await as(db, "service", () =>
      db.query<{ r: { reviews: number; xp: number } }>(
        `select public.record_review($1, $2, 'recognize', 'flashcard', 3::smallint, true, 1200, true, $3::jsonb) as r`,
        [alice, aliceWord, JSON.stringify(card)],
      ),
    );
    expect(res.rows[0].r.reviews).toBe(1);
    const c = await db.query<{ state: string; reps: number }>(
      "select state, reps from public.user_cards where user_id = $1 and word_id = $2 and direction = 'recognize'",
      [alice, aliceWord],
    );
    expect(c.rows[0]).toEqual({ state: "learning", reps: 1 });
    const s = await db.query<{ new_learned: number; words_added: number; xp: number }>(
      "select new_learned, words_added, xp from public.daily_stats where user_id = $1",
      [alice],
    );
    // 1 word added (+2 xp) and 1 review (+1 xp)
    expect(s.rows[0]).toEqual({ new_learned: 1, words_added: 1, xp: 3 });
  });

  it("get_due_cards returns only the caller's cards", async () => {
    const a = await as(db, alice, () => db.query("select * from public.get_due_cards(null, 50)"));
    expect(a.rows.length).toBeGreaterThan(0);
    const b = await as(db, bob, () => db.query("select * from public.get_due_cards(null, 50)"));
    expect(b.rows).toHaveLength(0);
  });

  it("dictionary_cache is not readable by clients", async () => {
    await expect(
      as(db, alice, () => db.query("select * from public.dictionary_cache")),
    ).rejects.toThrow();
  });
});

describe("groups", () => {
  let groupId: string;
  let groupDeck: string;
  let inviteCode: string;

  beforeAll(async () => {
    groupId = await as(db, alice, async () => {
      const r = await db.query<{ id: string }>(
        "insert into public.groups (name, owner_id) values ('Lớp IELTS', $1) returning id",
        [alice],
      );
      return r.rows[0].id;
    });
    const code = await db.query<{ invite_code: string }>(
      "select invite_code from public.groups where id = $1",
      [groupId],
    );
    inviteCode = code.rows[0].invite_code;
    groupDeck = await insertDeck(alice, { name: "Group deck", visibility: "group", group_id: groupId });
    await insertWord(alice, groupDeck, "teamwork");
  });

  it("invite codes have 8 unambiguous characters", () => {
    expect(inviteCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });

  it("non-members cannot see the group or its decks", async () => {
    const g = await as(db, bob, () => db.query("select * from public.groups where id = $1", [groupId]));
    expect(g.rows).toHaveLength(0);
    const d = await as(db, bob, () => db.query("select * from public.decks where id = $1", [groupDeck]));
    expect(d.rows).toHaveLength(0);
  });

  it("B joins with the invite code and studies the group deck with own progress", async () => {
    await as(db, bob, () => db.query("select public.join_group($1)", [inviteCode.toLowerCase()]));
    const d = await as(db, bob, () => db.query("select * from public.decks where id = $1", [groupDeck]));
    expect(d.rows).toHaveLength(1);
    await as(db, bob, () => db.query("select public.ensure_user_cards($1)", [groupDeck]));
    const cards = await as(db, bob, () => db.query("select * from public.user_cards"));
    expect(cards.rows).toHaveLength(1);
    // still cannot see Alice's private deck
    const p = await as(db, bob, () =>
      db.query("select * from public.decks where id = $1", [alicePrivateDeck]),
    );
    expect(p.rows).toHaveLength(0);
  });

  it("members cannot edit group words unless allowed", async () => {
    await expect(insertWord(bob, groupDeck, "bob word")).rejects.toThrow();
    await as(db, alice, () =>
      db.query("update public.decks set allow_member_edit = true where id = $1", [groupDeck]),
    );
    await expect(insertWord(bob, groupDeck, "bob word")).resolves.toBeTypeOf("string");
  });

  it("leaderboard lists all members, only for members", async () => {
    const lb = await as(db, bob, () =>
      db.query<{ display_name: string }>("select * from public.weekly_leaderboard($1)", [groupId]),
    );
    expect(lb.rows.map((r) => r.display_name).sort()).toEqual(["Alice", "Bob"]);
    await expect(
      as(db, carol, () => db.query("select * from public.weekly_leaderboard($1)", [groupId])),
    ).rejects.toThrow(/forbidden/);
  });

  it("group mates can read each other's daily stats", async () => {
    const s = await as(db, bob, () =>
      db.query("select * from public.daily_stats where user_id = $1", [alice]),
    );
    expect(s.rows.length).toBeGreaterThan(0);
  });

  it("only the owner can remove members; members can leave", async () => {
    await as(db, carol, () => db.query("select public.join_group($1)", [inviteCode]));
    await as(db, bob, () =>
      db.query("delete from public.group_members where group_id = $1 and user_id = $2", [
        groupId,
        carol,
      ]),
    );
    let m = await db.query("select * from public.group_members where group_id = $1", [groupId]);
    expect(m.rows).toHaveLength(3);
    await as(db, alice, () =>
      db.query("delete from public.group_members where group_id = $1 and user_id = $2", [
        groupId,
        carol,
      ]),
    );
    await as(db, bob, () =>
      db.query("delete from public.group_members where group_id = $1 and user_id = $2", [
        groupId,
        bob,
      ]),
    );
    m = await db.query("select * from public.group_members where group_id = $1", [groupId]);
    expect(m.rows).toHaveLength(1);
  });

  it("owners cannot set an arbitrary invite code", async () => {
    await expect(
      as(db, alice, () =>
        db.query("update public.groups set invite_code = 'AAAAAAAA' where id = $1", [groupId]),
      ),
    ).rejects.toThrow();
  });
});

describe("public decks and subscriptions", () => {
  it("anyone signed in can read and subscribe to a public deck", async () => {
    const deck = await insertDeck(alice, { name: "Public", visibility: "public" });
    await insertWord(alice, deck, "public word");
    await as(db, carol, () =>
      db.query("insert into public.deck_subscriptions (user_id, deck_id) values ($1, $2)", [
        carol,
        deck,
      ]),
    );
    const res = await db.query<{ learner_count: number }>(
      "select learner_count from public.decks where id = $1",
      [deck],
    );
    expect(res.rows[0].learner_count).toBe(1);
    const words = await as(db, carol, () =>
      db.query("select * from public.words where deck_id = $1", [deck]),
    );
    expect(words.rows).toHaveLength(1);
  });
});
