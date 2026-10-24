import { describe, expect, it } from "vitest";
import {
  answer,
  initLearn,
  learnComplete,
  levelOf,
  progress,
  questionFor,
  restoreLearn,
  roundDone,
  startRound,
  type LearnState,
} from "@/lib/practice/learn";
import { seeded, words } from "./helpers/study-word";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `w${i + 1}`);

/** Answers the whole current round, using `right(id)` for each question. */
function playRound(s: LearnState, right: (id: string) => boolean) {
  let guard = 0;
  while (!roundDone(s) && guard++ < 100) s = answer(s, s.queue[0], right(s.queue[0]));
  return s;
}

describe("learn rounds", () => {
  it("a round takes at most 7 words, new ones in order", () => {
    const s = startRound(initLearn(ids(10)));
    expect(s.round).toBe(1);
    expect(s.queue).toEqual(ids(7));
    expect(s.roundWords).toEqual(ids(7));
  });

  it("a right answer raises the level, the word leaves the round", () => {
    let s = startRound(initLearn(ids(3)));
    s = answer(s, "w1", true);
    expect(levelOf(s, "w1")).toBe(1);
    expect(s.queue).toEqual(["w2", "w3"]);
  });

  it("a miss resets the level and asks the word again at the end of the round", () => {
    let s = startRound(initLearn(ids(5)));
    s = answer(s, "w1", true);
    s = startRound(playRound(s, () => true)); // w1..w5 at level 1
    s = answer(s, "w1", false);
    expect(levelOf(s, "w1")).toBe(0);
    expect(s.queue).toEqual(["w2", "w3", "w4", "w5", "w1"]);
    expect(s.words.find((w) => w.wordId === "w1")!.misses).toBe(1);
  });

  it("words in progress come before new words in the next round", () => {
    let s = startRound(initLearn(ids(10)));
    let missed = false;
    s = playRound(s, (id) => id !== "w3" || missed || !(missed = true)); // w3 missed once, then right
    s = startRound(s);
    expect(s.queue.slice(0, 7)).toEqual(ids(7)); // all seven are in progress
    s = playRound(s, () => true); // w1..w7 mastered
    s = startRound(s);
    expect(s.queue).toEqual(["w8", "w9", "w10"]);
  });

  it("never asks mastered words and finishes when every word is mastered", () => {
    let s = initLearn(ids(3));
    for (let r = 0; r < 2; r++) s = playRound(startRound(s), () => true);
    expect(learnComplete(s)).toBe(true);
    expect(startRound(s).queue).toEqual([]);
    expect(progress(s)).toEqual({ notStarted: 0, learning: 0, mastered: 3 });
  });

  it("progress counts new, learning and mastered words", () => {
    let s = startRound(initLearn(ids(4)));
    s = answer(s, "w1", true);
    s = answer(s, "w2", false);
    expect(progress(s)).toEqual({ notStarted: 2, learning: 2, mastered: 0 });
  });

  it("answering a word that is not queued changes nothing", () => {
    const s = startRound(initLearn(ids(2)));
    expect(answer(s, "nope", true)).toBe(s);
  });
});

describe("learn questions", () => {
  it("multiple choice for new words, typing at level 1", () => {
    const list = words(5);
    let s = startRound(initLearn(list.map((w) => w.id)));
    expect(questionFor(s, list[0], list, seeded(1)).kind).toBe("choice");
    s = answer(s, list[0].id, true);
    expect(questionFor(s, list[0], list, seeded(1)).kind).toBe("typing");
  });

  it("falls back to typing without distractors", () => {
    const [one] = words(1);
    const s = startRound(initLearn([one.id]));
    expect(questionFor(s, one, [one], seeded(2)).kind).toBe("typing");
  });
});

describe("restoreLearn", () => {
  it("drops deleted words, appends new targets up to the limit", () => {
    let s = startRound(initLearn(["a", "b", "c"]));
    s = answer(s, "a", true);
    const restored = restoreLearn(
      JSON.parse(JSON.stringify(s)),
      new Set(["a", "c", "d", "e"]),
      ["a", "c", "d", "e"],
      3,
    )!;
    expect(restored.words.map((w) => w.wordId)).toEqual(["a", "c", "d"]);
    expect(levelOf(restored, "a")).toBe(1);
    expect(restored.queue).toEqual(["c"]);
  });

  it("ignores another version or junk", () => {
    expect(restoreLearn({ version: 2, words: [], queue: [] }, new Set(), [], 10)).toBeNull();
    expect(restoreLearn("x", new Set(), [], 10)).toBeNull();
    expect(restoreLearn(null, new Set(), [], 10)).toBeNull();
  });
});

describe("stars and the stage map", () => {
  it("gives 3 stars from 90% right, 2 from 70%, otherwise 1", async () => {
    const { starsFor } = await import("@/lib/practice/learn");
    expect([10, 9].map((r) => starsFor(r, 10))).toEqual([3, 3]);
    expect([8, 7].map((r) => starsFor(r, 10))).toEqual([2, 2]);
    expect([6, 0].map((r) => starsFor(r, 10))).toEqual([1, 1]);
    expect(starsFor(0, 0)).toBe(3);
  });

  it("notes the stars of each finished round, in order", async () => {
    const { recordRound } = await import("@/lib/practice/learn");
    let s = startRound(initLearn(ids(10)));
    s = recordRound(s, 3);
    expect(s.roundStars).toEqual([3]);
    s = recordRound({ ...s, round: 2 }, 2);
    expect(s.roundStars).toEqual([3, 2]);
    // clamped to 1..3
    expect(recordRound({ ...s, round: 3 }, 9).roundStars).toEqual([3, 2, 3]);
  });

  it("counts finished rounds and the nodes to draw", async () => {
    const { roundsDone, stageCount } = await import("@/lib/practice/learn");
    const fresh = initLearn(ids(10));
    expect(roundsDone(fresh)).toBe(0);
    expect(stageCount(fresh)).toBe(2); // 10 words = 2 rounds of 7
    const playing = startRound(fresh);
    expect(roundsDone(playing)).toBe(0);
    const done = playRound(playing, () => true);
    expect(roundsDone(done)).toBe(1);
    // a miss drags the round on: more nodes than words need
    let many = initLearn(ids(3));
    for (let r = 0; r < 4; r++) many = { ...many, round: many.round + 1, queue: [] };
    expect(stageCount(many)).toBe(5);
  });

  it("previews the next round into new words and words to review", async () => {
    const { previewRound } = await import("@/lib/practice/learn");
    const none = initLearn(ids(10));
    expect(previewRound(none)).toMatchObject({ fresh: 7, review: 0 });
    // three words are in progress: they come first, the rest of the 7 are new
    const some: LearnState = { ...none, words: none.words.map((w, i) => (i < 3 ? { ...w, level: 1 } : w)) };
    const p = previewRound(some);
    expect(p.ids.slice(0, 3)).toEqual(["w1", "w2", "w3"]);
    expect(p).toMatchObject({ fresh: 4, review: 3 });
  });

  it("shows 0 to 3 mastery dots", async () => {
    const { masteryDots } = await import("@/lib/practice/learn");
    let s = startRound(initLearn(ids(3)));
    expect(masteryDots(s, "w1")).toBe(0);
    s = answer(s, "w1", false);
    expect(masteryDots(s, "w1")).toBe(1);
    s = answer(s, "w2", true);
    expect(masteryDots(s, "w2")).toBe(2);
    s = answer({ ...s, queue: ["w2"] }, "w2", true);
    expect(masteryDots(s, "w2")).toBe(3);
  });

  it("keeps the stars when a saved game is restored", () => {
    const s = { ...startRound(initLearn(ids(3))), roundStars: [3, 2] };
    const back = restoreLearn(JSON.parse(JSON.stringify(s)), new Set(ids(3)), ids(3), 3)!;
    expect(back.roundStars).toEqual([3, 2]);
    expect(restoreLearn({ ...s, roundStars: ["x", 9] }, new Set(ids(3)), ids(3), 3)!.roundStars).toEqual([]);
  });
});
