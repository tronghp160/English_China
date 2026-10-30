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
});
