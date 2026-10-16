import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;
let deck: string;
const words: string[] = [];

const record = (args: {
  word: string;
  mode?: string;
  rating?: number;
  correct?: boolean | null;
  update?: boolean;
  clientId?: string;
  card?: object;
}) =>
  as(db, "service", () =>
    db.query<{ r: Record<string, unknown> }>(
      `select public.record_review($1, $2, 'recognize', $3::public.review_mode, $4::smallint, $5, 900, $6, $7::jsonb, now(), $8) as r`,
      [
        alice,
        args.word,
        args.mode ?? "flashcard",
        args.rating ?? 3,
        args.correct ?? null,
        args.update ?? false,
        JSON.stringify(args.card ?? {}),
        args.clientId ?? null,
      ],
    ),
  ).then((res) => res.rows[0].r);

const xpToday = async () =>
  (
    await db.query<{ xp: number; reviews: number }>(
      "select xp, reviews from public.daily_stats where user_id = $1",
      [alice],
    )
  ).rows[0];

beforeAll(async () => {
  db = await createDb();
  alice = await createUser(db, "alice@example.com", "Alice");
  bob = await createUser(db, "bob@example.com", "Bob");
  deck = await as(db, alice, async () => {
    const d = await db.query<{ id: string }>(
      "insert into public.decks (owner_id, name, language) values ($1, 'Daily', 'en') returning id",
      [alice],
    );
    for (const t of ["apple", "banana", "cherry", "durian"]) {
      const r = await db.query<{ id: string }>(
        `insert into public.words (deck_id, created_by, language, term, normalized, meaning_vi)
         values ($1, $2, 'en', $3, $3, 'nghĩa ' || $3) returning id`,
        [d.rows[0].id, alice, t],
      );
      words.push(r.rows[0].id);
    }
    await db.query("select public.ensure_user_cards()");
    return d.rows[0].id;
  });
}, 60_000);

describe("record_review", () => {
  it("ignores a resent review with the same client id", async () => {
    const before = await xpToday();
    const clientId = randomUUID();
    const first = await record({ word: words[0], clientId });
    expect(first.duplicate).toBeUndefined();
    expect(first.xp_gained).toBe(1);
    const second = await record({ word: words[0], clientId });
    expect(second).toEqual({ duplicate: true });
    const after = await xpToday();
    expect(after.reviews).toBe(before.reviews + 1);
    const logs = await db.query("select 1 from public.review_logs where client_id = $1", [
      clientId,
    ]);
    expect(logs.rows).toHaveLength(1);
  });

  it("practice gives XP only for correct answers", async () => {
    const before = (await xpToday()).xp;
    expect(
      (await record({ word: words[1], mode: "quiz", rating: 1, correct: false })).xp_gained,
    ).toBe(0);
    expect(
      (await record({ word: words[1], mode: "quiz", rating: 3, correct: true })).xp_gained,
    ).toBe(1);
    expect((await xpToday()).xp).toBe(before + 1);
  });
});

describe("today_overview", () => {
  it("counts new cards and limits for the caller only", async () => {
    const a = await as(db, alice, () =>
      db.query<{
        language: string;
        new_available: number;
        total_cards: number;
        new_left: number;
        reviews_left: number;
      }>("select * from public.today_overview()"),
    );
    expect(a.rows).toHaveLength(1);
    expect(a.rows[0]).toMatchObject({ language: "en", total_cards: 4 });
    expect(a.rows[0].reviews_left).toBeLessThan(200);
    const b = await as(db, bob, () => db.query("select * from public.today_overview()"));
    expect(b.rows).toHaveLength(0);
  });

  it("counts cards due tomorrow separately", async () => {
    const tomorrow = await db.query<{ t: string }>(
      `select (public.next_day_start($1) + interval '2 hours')::text as t`,
      [alice],
    );
    await record({
      word: words[2],
      update: true,
      card: {
        state: "review",
        due: tomorrow.rows[0].t,
        stability: 3,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 1,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        last_review: new Date().toISOString(),
      },
    });
    const a = await as(db, alice, () =>
      db.query<{ due_count: number; due_tomorrow: number }>(
        "select * from public.today_overview()",
      ),
    );
    expect(Number(a.rows[0].due_tomorrow)).toBe(1);
  });
});

describe("practice_words", () => {
  it("returns words of a readable deck, nothing for others", async () => {
    const a = await as(db, alice, () =>
      db.query<{ word: { term: string; normalized?: string } }>(
        "select * from public.practice_words($1, 'en', 'all', 10)",
        [deck],
      ),
    );
    expect(a.rows).toHaveLength(4);
    expect(a.rows[0].word.normalized).toBeUndefined();
    const b = await as(db, bob, () =>
      db.query("select * from public.practice_words($1, 'en', 'all', 10)", [deck]),
    );
    expect(b.rows).toHaveLength(0);
  });

  it("'recent' sorts newest first and 'due' only returns due review cards", async () => {
    const recent = await as(db, alice, () =>
      db.query<{ word: { term: string } }>(
        "select * from public.practice_words($1, 'en', 'recent', 4)",
        [deck],
      ),
    );
    expect(recent.rows.map((r) => r.word.term)).toHaveLength(4);
    const due = await as(db, alice, () =>
      db.query<{ word: { term: string } }>(
        "select * from public.practice_words($1, 'en', 'due', 10)",
        [deck],
      ),
    );
    // cherry is due tomorrow, the others are still new
    expect(due.rows).toHaveLength(0);
  });

  it("works across all studied decks of a language", async () => {
    const all = await as(db, alice, () =>
      db.query("select * from public.practice_words(null, 'en', 'all', 10)"),
    );
    expect(all.rows).toHaveLength(4);
    const zh = await as(db, alice, () =>
      db.query("select * from public.practice_words(null, 'zh', 'all', 10)"),
    );
    expect(zh.rows).toHaveLength(0);
  });
});

describe("card_distribution", () => {
  it("buckets the caller's recognize cards", async () => {
    const res = await as(db, alice, () =>
      db.query<{ bucket: string; n: number }>(
        "select bucket, n from public.card_distribution() order by bucket",
      ),
    );
    const map = Object.fromEntries(res.rows.map((r) => [r.bucket, Number(r.n)]));
    expect(map).toEqual({ new: 3, young: 1 });
  });
});
