import { describe, expect, it } from "vitest";
import { initialTalkState, nextTalk } from "@/lib/mascot/session-talk";

describe("session talk logic", () => {
  it("triggers comboTalk on milestone (combo 5) regardless of TALK_GAP", () => {
    let s = initialTalkState();

    // 4 correct answers
    for (let i = 0; i < 4; i++) {
      const res = nextTalk(s, { correct: true }, (i + 1) / 10);
      s = res.state;
      expect(res.talk).toBeNull();
    }

    // 5th correct answer -> combo 5 milestone!
    const res5 = nextTalk(s, { correct: true }, 5 / 10);
    s = res5.state;
    expect(res5.talk).toEqual({ key: "comboTalk", n: 5 });
    expect(s.lastTalkAt).toBe(5);

    // 6th correct answer -> no milestone, within TALK_GAP
    const res6 = nextTalk(s, { correct: true }, 6 / 10);
    s = res6.state;
    expect(res6.talk).toBeNull();
  });

  it("triggers redeem when a previously missed word is answered correctly", () => {
    let s = initialTalkState();

    // Answer word A wrong
    const r1 = nextTalk(s, { correct: false, wordId: "word-a", term: "hello" }, 0.1);
    s = r1.state;
    expect(s.missed.has("word-a")).toBe(true);
    expect(r1.talk).toBeNull();

    // Fill gap with 3 other words
    for (let i = 0; i < 3; i++) {
      const r = nextTalk(s, { correct: true, wordId: `other-${i}`, term: `word-${i}` }, 0.2 + i * 0.1);
      s = r.state;
    }

    // Now answer word A correctly -> redeem!
    const rRedeem = nextTalk(s, { correct: true, wordId: "word-a", term: "hello" }, 0.6);
    expect(rRedeem.talk).toEqual({ key: "redeem", word: "hello" });
    expect(rRedeem.state.missed.has("word-a")).toBe(false);
  });

  it("triggers comeback after 2 consecutive wrong answers", () => {
    let s = initialTalkState();

    // 2 wrong answers
    s = nextTalk(s, { correct: false }, 0.1).state;
    s = nextTalk(s, { correct: false }, 0.2).state;
    expect(s.wrongRun).toBe(2);

    // 1 correct answer -> comeback!
    const rComeback = nextTalk(s, { correct: true }, 0.3);
    expect(rComeback.talk).toEqual({ key: "comeback" });
    expect(rComeback.state.wrongRun).toBe(0);
  });

  it("triggers wrongRun when wrongRun reaches 3", () => {
    let s = initialTalkState();

    s = nextTalk(s, { correct: false }, 0.1).state;
    s = nextTalk(s, { correct: false }, 0.2).state;
    const r3 = nextTalk(s, { correct: false }, 0.3);
    expect(r3.talk).toEqual({ key: "wrongRun" });
  });

  it("triggers halfway at progress >= 0.5 and answers >= 8, only once", () => {
    let s = initialTalkState();

    // 7 answers with no combo milestone (alternate to keep combo <= 2)
    for (let i = 0; i < 7; i++) {
      s = nextTalk(s, { correct: i % 2 === 0 }, 0.3).state;
    }

    // 8th answer, progress 0.5 -> halfway!
    const rHalf = nextTalk(s, { correct: true }, 0.5);
    s = rHalf.state;
    expect(rHalf.talk).toEqual({ key: "halfway" });
    expect(s.halfwaySaid).toBe(true);

    // 9th answer, progress 0.6 -> no second halfway
    const rNext = nextTalk(s, { correct: true }, 0.6);
    expect(rNext.talk).not.toEqual({ key: "halfway" });
  });

  it("respects TALK_GAP between non-milestone talks", () => {
    let s = initialTalkState();

    // Trigger comeback at answer 3
    s = nextTalk(s, { correct: false }, 0.1).state;
    s = nextTalk(s, { correct: false }, 0.2).state;
    const rComeback = nextTalk(s, { correct: true }, 0.3);
    s = rComeback.state;
    expect(rComeback.talk).toEqual({ key: "comeback" });
    expect(s.lastTalkAt).toBe(3);

    // Answers 4, 5, 6: wrong answers. At answer 6 wrongRun === 3, but 6 - 3 = 3 < TALK_GAP (4)
    s = nextTalk(s, { correct: false }, 0.4).state;
    s = nextTalk(s, { correct: false }, 0.5).state;
    const rBlocked = nextTalk(s, { correct: false }, 0.6);
    expect(rBlocked.talk).toBeNull();
    expect(rBlocked.state.wrongRun).toBe(3);
    // lastTalkAt remains 3
    expect(rBlocked.state.lastTalkAt).toBe(3);
  });
});
