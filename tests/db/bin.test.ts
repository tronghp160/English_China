import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;

beforeAll(async () => {
  db = await createDb();
  alice = await createUser(db, "alice@example.com", "Alice");
  bob = await createUser(db, "bob@example.com", "Bob");
}, 60_000);

describe("bin ledger and wallet", () => {
  it("1. new user has 0 bones", async () => {
    const res = await as(db, "service", () =>
      db.query<{ bin_balance: number }>("select public.bin_balance($1)", [alice]),
    );
    expect(res.rows[0].bin_balance).toBe(0);
  });

  it("2. adds daily_stats correct = 57 -> balance = 5", async () => {
    await as(db, "service", () =>
      db.query(
        "insert into public.daily_stats (user_id, day, correct, reviews, new_learned, xp) values ($1, public.study_day($1), 57, 57, 10, 100)",
        [alice],
      ),
    );
    const res = await as(db, "service", () =>
      db.query<{ bin_balance: number }>("select public.bin_balance($1)", [alice]),
    );
    expect(res.rows[0].bin_balance).toBe(5);
  });

  it("3. bin_grant(u, 'quest', 2, '2026-10-30:due') twice -> balance increases by 2 once", async () => {
    const first = await as(db, "service", () =>
      db.query<{ bin_grant: number }>("select public.bin_grant($1, 'quest', 2, '2026-10-30:due')", [alice]),
    );
    expect(first.rows[0].bin_grant).toBe(7);

    const second = await as(db, "service", () =>
      db.query<{ bin_grant: number }>("select public.bin_grant($1, 'quest', 2, '2026-10-30:due')", [alice]),
    );
    expect(second.rows[0].bin_grant).toBe(7);
  });

  it("4. bin_spend when not enough bones -> raises not_enough_bones", async () => {
    await expect(
      as(db, "service", () =>
        db.query("select public.bin_spend($1, 'feed', 10, null)", [alice]),
      ),
    ).rejects.toThrow("not_enough_bones");
  });

  it("5. bin_spend when enough bones -> balance decreases correctly", async () => {
    const res = await as(db, "service", () =>
      db.query<{ bin_spend: number }>("select public.bin_spend($1, 'feed', 1, null)", [alice]),
    );
    expect(res.rows[0].bin_spend).toBe(6);
  });

  it("6. authenticated role cannot call bin_grant or bin_spend", async () => {
    await expect(
      as(db, alice, () =>
        db.query("select public.bin_grant($1, 'quest', 1, 'x')", [alice]),
      ),
    ).rejects.toThrow();

    await expect(
      as(db, alice, () =>
        db.query("select public.bin_spend($1, 'feed', 1, null)", [alice]),
      ),
    ).rejects.toThrow();
  });

  it("7. user reads bin_ledger of another user -> 0 rows (RLS)", async () => {
    const res = await as(db, bob, () =>
      db.query("select * from public.bin_ledger where user_id = $1", [alice]),
    );
    expect(res.rows).toHaveLength(0);

    const own = await as(db, alice, () =>
      db.query("select * from public.bin_ledger where user_id = $1", [alice]),
    );
    expect(own.rows.length).toBeGreaterThan(0);
  });

  it("8. prefs migration copies quests_total and bin_treats_fed idempotently", async () => {
    const carol = await createUser(db, "carol@example.com", "Carol");
    await as(db, "service", () =>
      db.query(
        "update public.user_settings set prefs = jsonb_build_object('quests_total', 3, 'bin_treats_fed', 2) where user_id = $1",
        [carol],
      ),
    );

    const migrateSql = `
      insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
      select s.user_id, 'migrate',
             2 * coalesce((s.prefs ->> 'quests_total')::int, 0) - coalesce((s.prefs ->> 'bin_treats_fed')::int, 0),
             'prefs-v1',
             public.study_day(s.user_id)
      from public.user_settings s
      where (s.prefs ->> 'quests_total')::int > 0 or (s.prefs ->> 'bin_treats_fed')::int > 0
      on conflict do nothing;
    `;

    await db.exec(migrateSql);
    let balance = await as(db, "service", () =>
      db.query<{ bin_balance: number }>("select public.bin_balance($1)", [carol]),
    );
    // 3 * 2 - 2 = 4
    expect(balance.rows[0].bin_balance).toBe(4);

    // Re-run migration SQL -> still 4 (idempotent due to unique index)
    await db.exec(migrateSql);
    balance = await as(db, "service", () =>
      db.query<{ bin_balance: number }>("select public.bin_balance($1)", [carol]),
    );
    expect(balance.rows[0].bin_balance).toBe(4);
  });

  it("9. bin_wallet() for authenticated returns fed_today = true after feeding today", async () => {
    const walletBefore = await as(db, alice, () =>
      db.query<{ balance: number; fed_today: boolean }>("select * from public.bin_wallet()"),
    );
    expect(walletBefore.rows[0].fed_today).toBe(true); // alice fed in test 5 today!
    expect(walletBefore.rows[0].balance).toBe(6);

    const walletBob = await as(db, bob, () =>
      db.query<{ balance: number; fed_today: boolean }>("select * from public.bin_wallet()"),
    );
    expect(walletBob.rows[0].fed_today).toBe(false);
    expect(walletBob.rows[0].balance).toBe(0);
  });

  it("10. bin_buy buys item, deducts bones, prevents duplicate purchase and checks balance", async () => {
    // alice currently has balance 6. Buy bowl_blue for 4 bones (max_qty = 1).
    const buyRes = await as(db, "service", () =>
      db.query<{ bin_buy: number }>("select public.bin_buy($1, 'bowl_blue', 4, 1)", [alice]),
    );
    expect(buyRes.rows[0].bin_buy).toBe(2);

    const items = await as(db, alice, () =>
      db.query<{ item_id: string; qty: number }>("select item_id, qty from public.bin_items where user_id = $1", [alice]),
    );
    expect(items.rows).toContainEqual({ item_id: "bowl_blue", qty: 1 });

    // Buying again -> raises 'already_owned'
    await expect(
      as(db, "service", () =>
        db.query("select public.bin_buy($1, 'bowl_blue', 4, 1)", [alice]),
      ),
    ).rejects.toThrow("already_owned");

    // Alice now has 2 bones. Trying to buy bowl_gold for 10 bones -> raises 'not_enough_bones'
    await expect(
      as(db, "service", () =>
        db.query("select public.bin_buy($1, 'bowl_gold', 10, 1)", [alice]),
      ),
    ).rejects.toThrow("not_enough_bones");

    const goldCheck = await as(db, alice, () =>
      db.query("select * from public.bin_items where user_id = $1 and item_id = 'bowl_gold'", [alice]),
    );
    expect(goldCheck.rows).toHaveLength(0);
  });

  it("11. bin_collect_trip collects trip, pays bones, awards item and enforces permissions", async () => {
    // Insert a trip for Alice that hasn't returned yet (returns 1 hour in the future)
    const tripRes = await as(db, "service", () =>
      db.query<{ id: string }>(
        `insert into public.bin_trips (user_id, study_day, lang, place_id, bones, item_id, returns_at)
         values ($1, '2026-10-30', 'en', 'london', 5, 'bed_royal', now() + interval '1 hour')
         returning id`,
        [alice],
      ),
    );
    const tripId = tripRes.rows[0].id;

    // Trying to collect before return -> raises 'not_back'
    await expect(
      as(db, "service", () =>
        db.query("select public.bin_collect_trip($1, $2)", [alice, tripId]),
      ),
    ).rejects.toThrow("not_back");

    // Bob tries to collect Alice's trip -> raises 'no_trip'
    await expect(
      as(db, "service", () =>
        db.query("select public.bin_collect_trip($1, $2)", [bob, tripId]),
      ),
    ).rejects.toThrow("no_trip");

    // Make trip returned (returns_at in past)
    await as(db, "service", () =>
      db.query("update public.bin_trips set returns_at = now() - interval '1 minute' where id = $1", [tripId]),
    );

    // Alice collects trip: Alice currently has 2 bones, gains 5 -> balance = 7
    const collectRes = await as(db, "service", () =>
      db.query<{ bin_collect_trip: number }>("select public.bin_collect_trip($1, $2)", [alice, tripId]),
    );
    expect(collectRes.rows[0].bin_collect_trip).toBe(7);

    // Ledger has trip entry
    const ledger = await as(db, "service", () =>
      db.query<{ kind: string; amount: number; ref: string }>(
        "select kind, amount, ref from public.bin_ledger where user_id = $1 and ref = $2",
        [alice, tripId],
      ),
    );
    expect(ledger.rows).toContainEqual({ kind: "trip", amount: 5, ref: tripId });

    // Item bed_royal added to bin_items
    const items = await as(db, "service", () =>
      db.query<{ item_id: string }>("select item_id from public.bin_items where user_id = $1 and item_id = 'bed_royal'", [alice]),
    );
    expect(items.rows).toHaveLength(1);

    // Collecting again -> raises 'already_collected'
    await expect(
      as(db, "service", () =>
        db.query("select public.bin_collect_trip($1, $2)", [alice, tripId]),
      ),
    ).rejects.toThrow("already_collected");
  });

  it("12. bin_daily RLS: user reads own row, cannot read others, cannot insert directly", async () => {
    // Service inserts greeting for Alice
    await as(db, "service", () =>
      db.query(
        `insert into public.bin_daily (user_id, study_day, greeting, mood, source)
         values ($1, '2026-10-30', 'Chào buổi sáng!', 'happy', 'template')`,
        [alice],
      ),
    );

    // Alice reads her own greeting
    const aliceRes = await as(db, alice, () =>
      db.query<{ greeting: string }>("select greeting from public.bin_daily where user_id = $1", [alice]),
    );
    expect(aliceRes.rows).toHaveLength(1);
    expect(aliceRes.rows[0].greeting).toBe("Chào buổi sáng!");

    // Bob cannot read Alice's greeting
    const bobRes = await as(db, bob, () =>
      db.query("select * from public.bin_daily where user_id = $1", [alice]),
    );
    expect(bobRes.rows).toHaveLength(0);

    // Alice cannot insert or update directly (authenticated revoked)
    await expect(
      as(db, alice, () =>
        db.query(
          `insert into public.bin_daily (user_id, study_day, greeting, mood, source)
           values ($1, '2026-10-31', 'Hacking', 'happy', 'template')`,
          [alice],
        ),
      ),
    ).rejects.toThrow();
  });

  it("13. bin_recent_misses returns top missed words for authenticated user", async () => {
    // Create a deck and word for Alice
    const deckRes = await as(db, "service", () =>
      db.query<{ id: string }>(
        "insert into public.decks (owner_id, name, language) values ($1, 'Miss Deck', 'en') returning id",
        [alice],
      ),
    );
    const deckId = deckRes.rows[0].id;
    const wordRes = await as(db, "service", () =>
      db.query<{ id: string }>(
        `insert into public.words (deck_id, created_by, language, term, normalized, meaning_vi)
         values ($1, $2, 'en', 'stubborn', 'stubborn', 'bướng bỉnh')
         returning id`,
        [deckId, alice],
      ),
    );
    const wordId = wordRes.rows[0].id;

    // Insert 2 failed review logs (rating = 1) for Alice
    await as(db, "service", () =>
      db.query(
        `insert into public.review_logs (user_id, word_id, direction, mode, rating, was_correct, duration_ms, state_before, reviewed_at)
         values ($1, $2, 'recognize', 'quiz', 1, false, 1000, 'review', now()),
                ($1, $2, 'recognize', 'quiz', 1, false, 1200, 'review', now())`,
        [alice, wordId],
      ),
    );

    // Alice calls bin_recent_misses
    const misses = await as(db, alice, () =>
      db.query<{ term: string; misses: number }>("select term, misses from public.bin_recent_misses(2)"),
    );
    expect(misses.rows).toContainEqual(
      expect.objectContaining({ term: "stubborn", misses: 2 }),
    );

    // Bob calls bin_recent_misses -> does not see Alice's word
    const bobMisses = await as(db, bob, () =>
      db.query<{ term: string }>("select term from public.bin_recent_misses(2)"),
    );
    expect(bobMisses.rows.some((r) => r.term === "stubborn")).toBe(false);
  });
});
