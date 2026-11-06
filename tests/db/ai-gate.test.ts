import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

let db: Db;
let user: string;
let other: string;
const DAY = "2026-11-06";

type Gate = { allowed: boolean; reason: string | null; used: number; total: number };

/** ai_gate(user, bucket, window s, max per window, day, units, user limit, global limit) as the service role. */
async function gate(who: string, opts: { bucket?: string; max?: number; units?: number; userLimit?: number; globalLimit?: number } = {}) {
  const { bucket = "chat", max = 12, units = 1, userLimit = 300, globalLimit = 3000 } = opts;
  const res = await as(db, "service", () =>
    db.query<{ g: Gate }>("select public.ai_gate($1, $2, 60, $3, $4::date, $5, $6, $7) as g", [who, bucket, max, DAY, units, userLimit, globalLimit]),
  );
  return res.rows[0].g;
}

const usage = async (who: string, count: number) => {
  for (let i = 0; i < count; i++) await db.query("select public.increment_ai_usage($1, $2::date)", [who, DAY]);
};

beforeAll(async () => {
  db = await createDb();
  user = await createUser(db, "gate1@example.com", "Gate One");
  other = await createUser(db, "gate2@example.com", "Gate Two");
}, 60_000);

describe("ai_gate", () => {
  it("allows a fresh user and reports zero usage", async () => {
    expect(await gate(user, { bucket: "fresh" })).toEqual({ allowed: true, reason: null, used: 0, total: 0 });
  });

  it("counts a rate-limit hit per call and refuses after max, without touching the usage counters", async () => {
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await gate(user, { bucket: "rate", max: 2 }));
    expect(results.map((r) => r.allowed)).toEqual([true, true, false]);
    expect(results[2].reason).toBe("rate");
    const used = await db.query<{ n: number }>("select count(*)::int as n from public.ai_usage where user_id = $1", [user]);
    expect(used.rows[0].n).toBe(0); // the gate never records a unit
  });

  it("reads the user's and the global usage of the day", async () => {
    await usage(user, 3);
    await usage(other, 4);
    const g = await gate(user, { bucket: "usage" });
    expect(g).toMatchObject({ allowed: true, used: 3, total: 7 });
  });

  it("refuses with quota_user when used + units would pass the user limit", async () => {
    expect(await gate(user, { bucket: "q1", userLimit: 4 })).toMatchObject({ allowed: true }); // 3 + 1 <= 4
    expect(await gate(user, { bucket: "q2", userLimit: 3 })).toMatchObject({ allowed: false, reason: "quota_user", used: 3 });
    expect(await gate(user, { bucket: "q3", userLimit: 4, units: 2 })).toMatchObject({ allowed: false, reason: "quota_user" });
  });

  it("refuses with quota_global, checked before the user limit", async () => {
    expect(await gate(user, { bucket: "g1", globalLimit: 8 })).toMatchObject({ allowed: true }); // 7 + 1 <= 8
    expect(await gate(user, { bucket: "g2", globalLimit: 7 })).toMatchObject({ allowed: false, reason: "quota_global", total: 7 });
    // both limits exceeded: the global one is reported, as checkQuota did
    expect(await gate(user, { bucket: "g3", globalLimit: 7, userLimit: 3 })).toMatchObject({ reason: "quota_global" });
  });

  it("reports the rate limit before any quota", async () => {
    await gate(user, { bucket: "both", max: 1 });
    expect(await gate(user, { bucket: "both", max: 1, userLimit: 0 })).toMatchObject({ allowed: false, reason: "rate" });
  });

  it("fails open on the rate limit when the limiter cannot record (no such profile), and still reads the quota", async () => {
    const ghost = "00000000-0000-4000-8000-000000000001";
    expect(await gate(ghost, { bucket: "ghost" })).toMatchObject({ allowed: true, reason: null, used: 0 });
    expect(await gate(ghost, { bucket: "ghost", userLimit: 0 })).toMatchObject({ allowed: false, reason: "quota_user" });
  });

  it("is for the server only", async () => {
    const call = (who: string | null) =>
      as(db, who, () => db.query("select public.ai_gate($1, 'x', 60, 5, $2::date, 1, 300, 3000)", [user, DAY]));
    await expect(call(user)).rejects.toThrow(/permission denied/i);
    await expect(call(null)).rejects.toThrow(/permission denied/i);
  });
});
