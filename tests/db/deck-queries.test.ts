import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;
let deck: string;

type Row = { term: string; card_state: string; suspended: boolean };

beforeAll(async () => {
  db = await createDb();
  alice = await createUser(db, "alice@example.com", "Alice");
  bob = await createUser(db, "bob@example.com", "Bob");
  deck = await as(db, alice, async () => {
    const d = await db.query<{ id: string }>(
      "insert into public.decks (owner_id, name, language) values ($1, 'HSK', 'zh') returning id",
      [alice],
    );
    const id = d.rows[0].id;
    const words: [string, string, string, string, string | null, string[]][] = [
      ["坚强", "坚强", "jiānqiáng", "jianqiang", "Tính cách", ["adj"]],
      ["苹果", "苹果", "píngguǒ", "pingguo", "Ăn uống", ["noun"]],
      ["跑步", "跑步", "pǎobù", "paobu", "Thể thao", ["verb"]],
    ];
    for (const [term, norm, reading, key, topic, pos] of words) {
      await db.query(
        `insert into public.words (deck_id, created_by, language, term, normalized, reading, reading_key, topic, parts_of_speech, meaning_vi, lang_extra)
         values ($1, $2, 'zh', $3, $4, $5, $6, $7, $8, 'nghĩa ' || $3, $9)`,
        [id, alice, term, norm, reading, key, topic, pos, JSON.stringify(term === "坚强" ? { hsk: { level: 5, version: "2.0" } } : {})],
      );
    }
    return id;
  });
}, 60_000);

const search = (who: string, args: Record<string, unknown>) =>
  as(db, who, () =>
    db.query<Row>(
      `select * from public.search_deck_words($1, $2, $3, $4, $5, $6, coalesce($7, 'newest'), 0, 50)`,
      [deck, args.q ?? null, args.topic ?? null, args.pos ?? null, args.status ?? null, args.level ?? null, args.sort ?? null],
    ),
  ).then((r) => r.rows);

describe("search_deck_words", () => {
  it("searches by Hanzi, toneless pinyin and meaning", async () => {
    expect((await search(alice, { q: "坚" })).map((r) => r.term)).toEqual(["坚强"]);
    expect((await search(alice, { q: "pingguo" })).map((r) => r.term)).toEqual(["苹果"]);
    expect((await search(alice, { q: "píng guǒ" })).map((r) => r.term)).toEqual(["苹果"]);
    expect((await search(alice, { q: "nghĩa 跑" })).map((r) => r.term)).toEqual(["跑步"]);
  });

  it("filters by topic, part of speech and level", async () => {
    expect((await search(alice, { topic: "Ăn uống" })).map((r) => r.term)).toEqual(["苹果"]);
    expect((await search(alice, { pos: "verb" })).map((r) => r.term)).toEqual(["跑步"]);
    expect((await search(alice, { level: "5" })).map((r) => r.term)).toEqual(["坚强"]);
  });

  it("sorts A–Z and reports status 'new' without cards", async () => {
    const rows = await search(alice, { sort: "az" });
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.card_state === "new")).toBe(true);
  });

  it("suspends words for the caller only", async () => {
    const ids = await db.query<{ id: string }>("select id from public.words where term = '苹果'");
    await as(db, alice, () => db.query("select public.set_suspended($1::uuid[], true)", [[ids.rows[0].id]]));
    expect((await search(alice, { status: "suspended" })).map((r) => r.term)).toEqual(["苹果"]);
    expect((await search(alice, { status: "new" })).map((r) => r.term).sort()).toEqual(["坚强", "跑步"].sort());
  });

  it("returns nothing for users who cannot read the deck", async () => {
    expect(await search(bob, {})).toHaveLength(0);
  });
});

describe("my_decks", () => {
  it("lists own decks with counts", async () => {
    const rows = await as(db, alice, () =>
      db.query<{ name: string; relation: string; word_count: number; new_count: string }>("select * from public.my_decks()"),
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({ name: "HSK", relation: "own", word_count: 3 });
  });

  it("does not leak other users' decks", async () => {
    const rows = await as(db, bob, () => db.query("select * from public.my_decks()"));
    expect(rows.rows).toHaveLength(0);
  });
});
