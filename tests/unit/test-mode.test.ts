import { describe, expect, it } from "vitest";
import type { Question } from "@/lib/practice/questions";
import {
  answerText,
  buildTest,
  expectedText,
  gradeTest,
  parseTestAsk,
  parseTestTypes,
} from "@/lib/practice/test";
import { seeded, word, words } from "./helpers/study-word";

const kinds = (qs: Question[]) =>
  qs.reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.kind]: (acc[q.kind] ?? 0) + 1 }), {});

function withExample(term: string) {
  return word({ term, examples: [{ text: `I like the ${term} a lot.`, vi: null }] as never });
}

describe("buildTest", () => {
  it("splits the questions evenly between the chosen types", () => {
    const list = words(12);
    const qs = buildTest(list, list, { types: ["choice", "tf", "typing"], ask: "both" }, seeded(1));
    expect(qs).toHaveLength(12);
    expect(kinds(qs)).toEqual({ choice: 4, truefalse: 4, typing: 4 });
  });

  it("gives the remainder to random types and asks every word once", () => {
    const list = words(10);
    const qs = buildTest(list, list, { types: ["choice", "tf", "typing"], ask: "both" }, seeded(2));
    expect(qs).toHaveLength(10);
    expect(Object.values(kinds(qs)).sort()).toEqual([3, 3, 4]);
    expect(new Set(qs.map((q) => q.word.id)).size).toBe(10);
  });

  it("stops at count", () => {
    const list = words(20);
    const qs = buildTest(list, list, { types: ["choice"], ask: "term", count: 7 }, seeded(3));
    expect(qs).toHaveLength(7);
    expect(qs.every((q) => q.kind === "choice" && q.prompt === "term")).toBe(true);
  });

  it("cloze only uses words with a usable example, the rest goes to other types", () => {
    const list = [withExample("apple"), withExample("river"), ...words(4)];
    const qs = buildTest(list, list, { types: ["cloze", "choice"], ask: "both" }, seeded(4));
    expect(qs).toHaveLength(6);
    const cloze = qs.filter((q) => q.kind === "cloze");
    expect(cloze.length).toBe(2);
    expect(cloze.map((q) => q.word.term).sort()).toEqual(["apple", "river"]);
    expect(kinds(qs).choice).toBe(4);
  });

  it("true/false questions are sometimes true and sometimes false", () => {
    const list = words(30);
    const qs = buildTest(list, list, { types: ["tf"], ask: "term" }, seeded(5));
    const tf = qs.filter((q) => q.kind === "truefalse");
    expect(tf).toHaveLength(30);
    expect(tf.some((q) => q.isTrue)).toBe(true);
    expect(tf.some((q) => !q.isTrue)).toBe(true);
    for (const q of tf) {
      if (q.isTrue) expect(q.shown).toBe(q.word.meaning_vi);
      else expect(q.shown).not.toBe(q.word.meaning_vi);
    }
  });

  it("a single word falls back to typing", () => {
    const one = [word()];
    const qs = buildTest(one, one, { types: ["choice", "tf"], ask: "both" }, seeded(6));
    expect(qs.map((q) => q.kind)).toEqual(["typing"]);
  });

  it("is deterministic with a fixed rng", () => {
    const list = words(10);
    const opts = { types: ["choice", "tf", "typing"] as const, ask: "both" as const };
    expect(buildTest(list, list, { ...opts, types: [...opts.types] }, seeded(7))).toEqual(
      buildTest(list, list, { ...opts, types: [...opts.types] }, seeded(7)),
    );
  });
});

describe("gradeTest", () => {
  it("grades correct, close, wrong and blank answers", () => {
    const resilient = word({ term: "resilient" });
    const list = [resilient, ...words(3)];
    const typing: Question = { id: "a", kind: "typing", word: resilient };
    const close: Question = { id: "b", kind: "typing", word: resilient };
    const [choice] = buildTest(list, list, { types: ["choice"], ask: "term", count: 1 }, seeded(8));
    const tf: Question = { id: "d", kind: "truefalse", prompt: "term", word: list[1], shown: "x", isTrue: false };
    const blank: Question = { id: "e", kind: "typing", word: list[2] };
    if (choice.kind !== "choice") throw new Error("expected choice");
    const wrongOption = choice.options.find((o) => o.id !== choice.answerId)!.id;

    const grade = gradeTest([typing, close, choice, tf, blank], {
      a: "Resilient",
      b: "resilent",
      [choice.id]: wrongOption,
      d: "false",
      e: "  ",
    });
    expect(grade.items.map((i) => i.result)).toEqual(["correct", "close", "wrong", "correct", "wrong"]);
    expect(grade.correct).toBe(3);
    expect(grade.total).toBe(5);
    expect(grade.percent).toBe(60);
    expect(grade.items[4].answer).toBeNull();
    expect(answerText(choice, wrongOption)).not.toBe(expectedText(choice));
    expect(answerText(tf, "true")).toBe("Đúng");
  });
});

describe("URL options", () => {
  it("keeps known types and asks only", () => {
    expect(parseTestTypes("choice,tf,bogus")).toEqual(["choice", "tf"]);
    expect(parseTestTypes("bogus")).toEqual(["choice", "tf", "typing"]);
    expect(parseTestTypes(undefined)).toEqual(["choice", "tf", "typing"]);
    expect(parseTestAsk("meaning")).toBe("meaning");
    expect(parseTestAsk("x")).toBe("both");
  });
});
