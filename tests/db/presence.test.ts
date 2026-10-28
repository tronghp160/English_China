import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

let db: Db;
let alice: string;
let bob: string;

const session1 = "11111111-1111-4111-8111-111111111111";
const session2 = "22222222-2222-4222-8222-222222222222";
const session3 = "33333333-3333-4333-8333-333333333333";

beforeAll(async () => {
  db = await createDb();
  alice = await createUser(db, "alice@example.com", "Alice");
  bob = await createUser(db, "bob@example.com", "Bob");
}, 60_000);

describe("presence & login_events", () => {
  it("records new login and presence on first heartbeat with a session", async () => {
    const res = await as(db, "service", () =>
      db.query<{ record_presence: boolean }>(
        `select public.record_presence(
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )`,
        [
          alice,
          "/today",
          session1,
          "1.2.3.4",
          "VN",
          "Hanoi",
          "Hanoi",
          21.0285,
          105.8542,
          "Asia/Ho_Chi_Minh",
          "desktop",
          "Chrome",
          "Windows",
          "Mozilla/5.0 ...",
        ],
      ),
    );
    expect(res.rows[0].record_presence).toBe(true);

    const logins = await as(db, "service", () =>
      db.query<{ session_id: string; city: string }>(
        "select * from public.login_events where user_id = $1",
        [alice],
      ),
    );
    expect(logins.rows).toHaveLength(1);
    expect(logins.rows[0].session_id).toBe(session1);
    expect(logins.rows[0].city).toBe("Hanoi");

    const presence = await as(db, "service", () =>
      db.query<{ path: string }>(
        "select * from public.user_presence where user_id = $1",
        [alice],
      ),
    );
    expect(presence.rows).toHaveLength(1);
    expect(presence.rows[0].path).toBe("/today");
  });

  it("returns false and keeps single login_event on subsequent heartbeat in same session", async () => {
    const res = await as(db, "service", () =>
      db.query<{ record_presence: boolean }>(
        `select public.record_presence($1, $2, $3, $4)`,
        [alice, "/today", session1, "1.2.3.4"],
      ),
    );
    expect(res.rows[0].record_presence).toBe(false);

    const logins = await as(db, "service", () =>
      db.query("select * from public.login_events where user_id = $1", [alice]),
    );
    expect(logins.rows).toHaveLength(1);
  });

  it("records another login when session changes", async () => {
    const res = await as(db, "service", () =>
      db.query<{ record_presence: boolean }>(
        `select public.record_presence($1, $2, $3, $4)`,
        [alice, "/study", session2, "1.2.3.4"],
      ),
    );
    expect(res.rows[0].record_presence).toBe(true);

    const logins = await as(db, "service", () =>
      db.query("select * from public.login_events where user_id = $1", [alice]),
    );
    expect(logins.rows).toHaveLength(2);
  });

  it("throttles presence update when called within 20s with same path and session", async () => {
    // Force last_seen_at to be now() - 5s
    await as(db, "service", () =>
      db.query(
        "update public.user_presence set last_seen_at = now() - interval '5 seconds' where user_id = $1",
        [alice],
      ),
    );
    const before = await as(db, "service", () =>
      db.query<{ last_seen_at: string }>(
        "select last_seen_at from public.user_presence where user_id = $1",
        [alice],
      ),
    );

    // Call with same path
    await as(db, "service", () =>
      db.query(`select public.record_presence($1, $2, $3)`, [alice, "/study", session2]),
    );
    const after = await as(db, "service", () =>
      db.query<{ last_seen_at: string }>(
        "select last_seen_at from public.user_presence where user_id = $1",
        [alice],
      ),
    );
    expect(after.rows[0].last_seen_at).toEqual(before.rows[0].last_seen_at);

    // Call with different path -> updates last_seen_at and path
    await as(db, "service", () =>
      db.query(`select public.record_presence($1, $2, $3)`, [alice, "/words", session2]),
    );
    const changed = await as(db, "service", () =>
      db.query<{ last_seen_at: string; path: string }>(
        "select last_seen_at, path from public.user_presence where user_id = $1",
        [alice],
      ),
    );
    expect(changed.rows[0].path).toBe("/words");
  });

  it("forbids anon and authenticated users from calling record_presence or admin_user_rollup", async () => {
    await expect(
      as(db, null, () => db.query("select public.record_presence($1)", [alice])),
    ).rejects.toThrow();
    await expect(
      as(db, alice, () => db.query("select public.record_presence($1)", [alice])),
    ).rejects.toThrow();

    await expect(
      as(db, null, () => db.query("select * from public.admin_user_rollup()")),
    ).rejects.toThrow();
    await expect(
      as(db, alice, () => db.query("select * from public.admin_user_rollup()")),
    ).rejects.toThrow();
  });

  it("forbids authenticated users from selecting directly from user_presence", async () => {
    await expect(
      as(db, alice, () => db.query("select * from public.user_presence")),
    ).rejects.toThrow();
  });

  it("enforces RLS on login_events: owner can read their own, not others; anon cannot read", async () => {
    // Alice sees her 2 logins
    const aliceView = await as(db, alice, () =>
      db.query<{ user_id: string }>("select * from public.login_events"),
    );
    expect(aliceView.rows.length).toBeGreaterThanOrEqual(2);
    expect(aliceView.rows.every((r) => r.user_id === alice)).toBe(true);

    // Bob sees 0 rows
    const bobView = await as(db, bob, () =>
      db.query("select * from public.login_events"),
    );
    expect(bobView.rows).toHaveLength(0);

    // Anon throws permission denied
    await expect(
      as(db, null, () => db.query("select * from public.login_events")),
    ).rejects.toThrow();
  });

  it("enforces retention <= 200 rows on new login", async () => {
    // Insert 205 dummy login rows for bob
    await as(db, "service", async () => {
      for (let i = 0; i < 205; i++) {
        await db.query(
          `insert into public.login_events (user_id, ip, created_at)
           values ($1, '1.1.1.1', now() - ($2 || ' minutes')::interval)`,
          [bob, i + 10],
        );
      }
    });

    const countBefore = await as(db, "service", () =>
      db.query<{ count: string }>(
        "select count(*) from public.login_events where user_id = $1",
        [bob],
      ),
    );
    expect(Number(countBefore.rows[0].count)).toBe(205);

    // Trigger record_presence with a new session for bob
    await as(db, "service", () =>
      db.query(`select public.record_presence($1, '/home', $2)`, [bob, session3]),
    );

    const countAfter = await as(db, "service", () =>
      db.query<{ count: string }>(
        "select count(*) from public.login_events where user_id = $1",
        [bob],
      ),
    );
    expect(Number(countAfter.rows[0].count)).toBeLessThanOrEqual(200);
  });

  it("admin_user_rollup correctly aggregates daily_stats", async () => {
    await as(db, "service", async () => {
      await db.query(
        `insert into public.daily_stats (user_id, day, xp, reviews, correct, new_learned)
         values
           ($1, '2026-10-01', 50, 10, 8, 5),
           ($1, '2026-10-02', 70, 20, 18, 10)
         on conflict (user_id, day) do update set xp = excluded.xp`,
        [alice],
      );
    });

    const res = await as(db, "service", () =>
      db.query<{
        user_id: string;
        total_xp: string;
        total_reviews: string;
        total_correct: string;
        active_days: number;
        last_active_day: string;
      }>("select * from public.admin_user_rollup() where user_id = $1", [alice]),
    );
    expect(res.rows).toHaveLength(1);
    expect(Number(res.rows[0].total_xp)).toBe(120);
    expect(Number(res.rows[0].total_reviews)).toBe(30);
    expect(Number(res.rows[0].total_correct)).toBe(26);
    expect(res.rows[0].active_days).toBe(2);
  });

  it("cascades deletion when auth.users row is removed", async () => {
    const tempUser = await createUser(db, "temp@example.com", "Temp");
    const tempSession = "99999999-9999-4999-8999-999999999999";

    await as(db, "service", () =>
      db.query(`select public.record_presence($1, '/today', $2)`, [tempUser, tempSession]),
    );

    const pBefore = await as(db, "service", () =>
      db.query("select * from public.user_presence where user_id = $1", [tempUser]),
    );
    expect(pBefore.rows).toHaveLength(1);

    // Delete auth user directly (as superuser)
    await db.query("delete from auth.users where id = $1", [tempUser]);

    const pAfter = await as(db, "service", () =>
      db.query("select * from public.user_presence where user_id = $1", [tempUser]),
    );
    expect(pAfter.rows).toHaveLength(0);

    const lAfter = await as(db, "service", () =>
      db.query("select * from public.login_events where user_id = $1", [tempUser]),
    );
    expect(lAfter.rows).toHaveLength(0);
  });
});
