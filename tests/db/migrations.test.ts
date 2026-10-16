import { describe, expect, it } from "vitest";
import { createDb } from "./harness";

describe("migrations", () => {
  it("apply cleanly", async () => {
    const db = await createDb();
    const res = await db.query<{ n: number }>(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public'",
    );
    expect(res.rows[0].n).toBeGreaterThanOrEqual(13);
  }, 60_000);
});
