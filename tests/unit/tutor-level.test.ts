import { describe, expect, it } from "vitest";
import { estimateLevel, MIN_LEVELED_WORDS } from "@/lib/ai/tutor/level";

describe("estimateLevel", () => {
  it("takes the most common CEFR level for English", () => {
    expect(estimateLevel("en", ["A2", "B1", "B1", "B1", "B2", null])).toBe("B1");
    expect(estimateLevel("en", ["c1", "C1", "A1"])).toBe("C1"); // case does not matter
  });

  it("takes the most common HSK level for Chinese", () => {
    expect(estimateLevel("zh", ["HSK 2", "HSK 2", "HSK 3", "HSK 1"])).toBe("HSK 2");
    expect(estimateLevel("zh", ["HSK 4", "HSK 4", "HSK 4"])).toBe("HSK 4");
  });

  it("takes the middle level when several levels are equally common", () => {
    expect(estimateLevel("en", ["A1", "A1", "C1", "C1", "B1", "B1"])).toBe("B1"); // sorted A1 A1 B1 B1 C1 C1: lower middle is B1
    expect(estimateLevel("en", ["A2", "B2", "C1"])).toBe("B2");
    expect(estimateLevel("zh", ["HSK 1", "HSK 5", "HSK 3", "HSK 3", "HSK 5", "HSK 1"])).toBe("HSK 3");
  });

  it("says nothing when there are too few leveled words or the labels are not levels", () => {
    expect(MIN_LEVELED_WORDS).toBe(3);
    expect(estimateLevel("en", ["B1", "B1", null, undefined])).toBeNull();
    expect(estimateLevel("en", [])).toBeNull();
    expect(estimateLevel("en", ["HSK 3", "HSK 3", "HSK 3"])).toBeNull(); // another language's labels
    expect(estimateLevel("zh", ["B1", "B1", "B1"])).toBeNull();
    expect(estimateLevel("en", ["", "x", "Z9"])).toBeNull();
  });
});
