import { describe, expect, it } from "vitest";
import { comboLine, isComboHot, isComboMilestone, nextCombo } from "@/lib/combo";

describe("combo", () => {
  it("has banner milestones at 5, 10 and every 10 from 20", () => {
    const hits = Array.from({ length: 41 }, (_, i) => i).filter(isComboMilestone);
    expect(hits).toEqual([5, 10, 20, 30, 40]);
  });

  it("turns hot from 10", () => {
    expect([9, 10].map(isComboHot)).toEqual([false, true]);
  });

  it("praises more as the combo grows", () => {
    expect([5, 10, 20].map(comboLine)).toEqual(["Tuyệt vời", "Quá đỉnh", "Không ai cản nổi"]);
  });

  it("counts up on a right answer and resets on a wrong one", () => {
    expect(nextCombo(4, true)).toBe(5);
    expect(nextCombo(12, false)).toBe(0);
  });
});
