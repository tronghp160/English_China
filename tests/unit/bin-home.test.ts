import { describe, expect, it } from "vitest";
import { LINES, say, type LineKey } from "@/lib/mascot/lines";
import { BIN_MOOD_LABEL, binMoodFor, binMoodScore, isNight } from "@/lib/progress";

describe("Bin's mood", () => {
  const none = { reviewedToday: false, streak: 0, fedToday: false, questsDone: 0 };

  it("scores 0 to 5", () => {
    expect(binMoodScore(none)).toBe(0);
    expect(binMoodScore({ reviewedToday: true, streak: 5, fedToday: true, questsDone: 3 })).toBe(5);
  });

  it("counts studying today as two points and each of the other things as one", () => {
    expect(binMoodScore({ ...none, reviewedToday: true })).toBe(2);
    expect(binMoodScore({ ...none, streak: 3 })).toBe(1);
    expect(binMoodScore({ ...none, streak: 2 })).toBe(0);
    expect(binMoodScore({ ...none, fedToday: true })).toBe(1);
    expect(binMoodScore({ ...none, questsDone: 1 })).toBe(0);
    expect(binMoodScore({ ...none, questsDone: 2 })).toBe(1);
  });

  it("maps the score to a face", () => {
    expect([0, 1].map((s) => binMoodFor(s, false))).toEqual(["sad", "sad"]);
    expect(binMoodFor(2, false)).toBe("think");
    expect(binMoodFor(2, true)).toBe("sleepy");
    expect(binMoodFor(3, true)).toBe("happy");
    expect([4, 5].map((s) => binMoodFor(s, false))).toEqual(["cheer", "cheer"]);
  });

  it("has a label for every face the corner can show", () => {
    for (const score of [0, 2, 3, 4]) {
      for (const night of [false, true]) expect(BIN_MOOD_LABEL[binMoodFor(score, night)]).toBeTruthy();
    }
  });

  it("is night from 19:00 to 05:00", () => {
    expect([4, 5, 12, 18, 19, 23, 0].map(isNight)).toEqual([true, false, false, false, true, true, true]);
  });
});

describe("Bin's lines for play and game events", () => {
  const NEEDED: LineKey[] = [
    "spin",
    "dance",
    "wake",
    "feed",
    "noBone",
    "play",
    "playMiss",
    "outfit",
    "trick",
    "questDone",
    "levelUp",
    "combo",
    "praise",
    "wrongComfort",
    "idleSession",
  ];

  it.each(NEEDED)("has %s", (key) => {
    expect(LINES[key].length).toBeGreaterThan(0);
    for (let seed = 0; seed < LINES[key].length; seed++) {
      const text = say(key, { seed, name: "Mochi" });
      expect(text).toBeTruthy();
      expect(text).not.toMatch(/\{(name|n)\}/);
    }
  });

  it("uses the wording the plan asks for", () => {
    expect(say("spin", { seed: 0 })).toBe("Chóng mặt quá…");
    expect(say("dance", { seed: 0, name: "Bin" })).toBe("Bạn là người bạn tốt nhất của Bin!");
    expect(say("noBone", { seed: 0 })).toBe("Học thêm 10 câu đúng để có xương nhé.");
    expect(LINES.praise).toEqual(["Chuẩn luôn!", "Giỏi quá!", "Nhớ dai ghê!", "Quá đỉnh!", "Đúng rồi đó!"]);
  });

  it("keeps emoji out of the lines", () => {
    const all = Object.values(LINES).flat().join("");
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
