import { describe, expect, it } from "vitest";
import { suggestMode } from "@/lib/practice/suggest";

const none = { learnPercent: null, testPercent: null, matchMs: null };

describe("suggestMode", () => {
  it("starts with learn, and keeps learn until every word is learned", () => {
    expect(suggestMode(none)).toBe("learn");
    expect(suggestMode({ ...none, learnPercent: 60 })).toBe("learn");
  });
  it("moves on to a test once everything is learned", () => {
    expect(suggestMode({ ...none, learnPercent: 100 })).toBe("test");
  });
  it("goes back to learn after a weak test, to match after a good one", () => {
    expect(suggestMode({ learnPercent: 100, testPercent: 70, matchMs: null })).toBe("learn");
    expect(suggestMode({ learnPercent: 100, testPercent: 85, matchMs: null })).toBe("match");
  });
});
