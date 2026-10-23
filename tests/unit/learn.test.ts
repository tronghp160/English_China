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
