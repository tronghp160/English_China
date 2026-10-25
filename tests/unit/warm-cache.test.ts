import { describe, expect, it } from "vitest";
import { pickColdTerms } from "@/lib/ai/warm";

describe("pickColdTerms", () => {
  const lower = (t: string) => t.toLowerCase();

  it("keeps distinct, uncached words in order", () => {
    const cold = pickColdTerms(["Bank", "bank ", "run", "  ", "calm", "Run"], lower, new Set(["calm"]));
    expect(cold).toEqual(["Bank", "run"]);
  });

  it("skips words longer than the API accepts", () => {
    expect(pickColdTerms(["x".repeat(81), "ok"], lower, new Set())).toEqual(["ok"]);
  });
});
