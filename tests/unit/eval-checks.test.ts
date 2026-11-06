import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHECKS, normalizeCheck, runChecks, tally, vietnameseRatio, wordCount } from "../../scripts/eval/checks.mjs";
import { loadEnv, parseServerTiming, pct, readChatStream } from "../../scripts/lib/tutor-client.mjs";

const run = (name: string, text: string, arg?: unknown, ctx?: { userText: string }) =>
  (CHECKS as Record<string, (t: string, a?: unknown, c?: unknown) => { pass: boolean; skipped?: boolean }>)[name](text, arg, ctx);

describe("has_ipa", () => {
  it("accepts a slash transcription with IPA letters", () => {
    expect(run("has_ipa", "**apple** /ˈæpəl/ (danh từ): quả táo").pass).toBe(true);
    expect(run("has_ipa", "library /ˈlaɪbrɛri/").pass).toBe(true);
    expect(run("has_ipa", "think /θɪŋk/").pass).toBe(true);
  });
  it("accepts a short plain-ASCII transcription standing alone", () => {
    expect(run("has_ipa", "Đọc là /bed/ nhé").pass).toBe(true);
  });
  it("rejects text without a transcription and ordinary slashes", () => {
    expect(run("has_ipa", "apple nghĩa là quả táo").pass).toBe(false);
    expect(run("has_ipa", "dùng and/or hoặc A/B và C/D trong văn viết").pass).toBe(false);
  });
});

describe("has_pinyin_tones", () => {
  it("needs tone-marked pinyin in parentheses", () => {
    expect(run("has_pinyin_tones", "**你好** (nǐ hǎo): xin chào").pass).toBe(true);
    expect(run("has_pinyin_tones", "坚强（jiānqiáng）").pass).toBe(true);
  });
  it("fails without pinyin, without tone marks, or without Chinese", () => {
    expect(run("has_pinyin_tones", "**你好** nghĩa là xin chào").pass).toBe(false);
    expect(run("has_pinyin_tones", "你好 (ni hao)").pass).toBe(false);
    expect(run("has_pinyin_tones", "nǐ hǎo nghĩa là xin chào").pass).toBe(false);
  });
});

describe("format checks", () => {
  it("flags emoji but not arrows or plain symbols", () => {
    expect(run("no_emoji", "Tuyệt vời 😀").pass).toBe(false);
    expect(run("no_emoji", "Đúng rồi ✅").pass).toBe(false);
    expect(run("no_emoji", "went → past tense (✓)").pass).toBe(true);
  });
  it("flags tables and headings", () => {
    expect(run("no_table", "| a | b |\n|---|---|\n| 1 | 2 |").pass).toBe(false);
    expect(run("no_table", "dùng a | b trong lệnh").pass).toBe(true);
    expect(run("no_heading", "## Nghĩa\ntáo").pass).toBe(false);
    expect(run("no_heading", "**Nghĩa**\ntáo # 1").pass).toBe(true);
  });
  it("counts words and question marks", () => {
    expect(wordCount("  một hai   ba \n bốn ")).toBe(4);
    expect(run("max_words", "một hai ba", 3).pass).toBe(true);
    expect(run("max_words", "một hai ba", 2).pass).toBe(false);
    expect(run("min_words", "một hai ba", 4).pass).toBe(false);
    expect(run("asks_one_question", "Ví dụ: Why? Because.\n\nBạn muốn thử không?").pass).toBe(true);
    expect(run("asks_one_question", "Ok.\n\nBạn muốn thử không? Hay xem thêm ví dụ?").pass).toBe(false);
    expect(run("max_question_marks", "A? B?", 1).pass).toBe(false);
    expect(run("max_question_marks", "A? B.", 1).pass).toBe(true);
  });
  it("counts questions without the translation line and the pinyin", () => {
    // one question written in Chinese, pinyin and Vietnamese
    expect(run("max_questions", "你想买什么？(Nǐ xiǎng mǎi shénme?)\n*Bạn muốn mua gì?*", 1).pass).toBe(true);
    // a Vietnamese lead-in with a question, the English question, its translation
    expect(run("max_questions", "Chào bạn! Mình giúp gì được nhỉ?\n\nWhat can I get for you? *Bạn muốn dùng gì ạ?*", 2).pass).toBe(true);
    // two real questions in the foreign language
    expect(run("max_questions", "What would you like? Would you like a cake? *Bạn muốn gì? Bạn muốn bánh không?*", 1).pass).toBe(false);
    expect(run("max_questions", "Hi? Hello? Anyone?", 2).pass).toBe(false);
  });

  it("finds an italic translation line", () => {
    expect(run("has_italic_line", "Welcome! What would you like?\n*Chào mừng! Bạn muốn dùng gì?*").pass).toBe(true);
    expect(run("has_italic_line", "**Chào mừng** bạn").pass).toBe(false);
  });
});

describe("no_greeting_unprompted", () => {
  it("fails when the answer opens with a greeting the learner did not start", () => {
    expect(run("no_greeting_unprompted", "Chào bạn! apple là quả táo", undefined, { userText: "apple nghĩa là gì?" }).pass).toBe(false);
    expect(run("no_greeting_unprompted", "**Xin chào!** Mình giúp bạn", undefined, { userText: "apple là gì" }).pass).toBe(false);
    expect(run("no_greeting_unprompted", "Hi there, apple is a fruit", undefined, { userText: "apple là gì" }).pass).toBe(false);
  });
  it("passes when the answer starts with content", () => {
    expect(run("no_greeting_unprompted", "**apple** /ˈæpəl/: quả táo", undefined, { userText: "apple là gì" }).pass).toBe(true);
    expect(run("no_greeting_unprompted", "Chàng trai đó", undefined, { userText: "x" }).pass).toBe(true);
  });
  it("is skipped when the learner greeted first", () => {
    const r = run("no_greeting_unprompted", "Chào bạn! Mình giúp được gì?", undefined, { userText: "Chào gia sư, apple là gì?" });
    expect(r.skipped).toBe(true);
  });
});

describe("content checks", () => {
  it("contains checks look through bold and italic marks inside a phrase", () => {
    expect(run("contains_any", "Câu đúng: She **doesn't** like coffee.", ["doesn't like"]).pass).toBe(true);
    expect(run("contains_any", "Câu đúng: 我昨天**去学校**。", ["我昨天去学校"]).pass).toBe(true);
    expect(run("contains_all", "**Coherence** & *Cohesion*, **Lexical** Resource", ["Coherence & Cohesion", "Lexical Resource"]).pass).toBe(true);
    expect(run("not_contains_any", "đáp **án** là A", ["đáp án"]).pass).toBe(false);
    expect(run("contains_any", "She does not like it", ["doesn't like"]).pass).toBe(false); // still a real check
  });

  it("contains_any / contains_all / not_contains_any ignore case", () => {
    expect(run("contains_any", "She WENT home", ["went"]).pass).toBe(true);
    expect(run("contains_any", "She goes home", ["went"]).pass).toBe(false);
    expect(run("contains_all", "make và do", ["make", "do"]).pass).toBe(true);
    expect(run("contains_all", "make thôi", ["make", "do"]).pass).toBe(false);
    expect(run("not_contains_any", "Không có gì", ["Đáp án"]).pass).toBe(true);
    expect(run("not_contains_any", "Đáp án là A", ["đáp án"]).pass).toBe(false);
  });
  it("tells Vietnamese from English by diacritics", () => {
    expect(vietnameseRatio("Từ này nghĩa là quả táo, dùng khi nói về trái cây.")).toBeGreaterThan(0.2);
    expect(vietnameseRatio("This word means apple, a common fruit.")).toBe(0);
    expect(run("vi_explanation", "Từ này nghĩa là quả táo.").pass).toBe(true);
    expect(run("vi_explanation", "An apple a day keeps the doctor away.").pass).toBe(false);
  });
});

describe("runChecks and tally", () => {
  it("normalizes names and objects, applies defaults and omit", () => {
    expect(normalizeCheck("has_ipa")).toEqual({ name: "has_ipa", arg: undefined });
    expect(normalizeCheck({ max_words: 5 })).toEqual({ name: "max_words", arg: 5 });
    expect(() => normalizeCheck({ a: 1, b: 2 })).toThrow();
    const results = runChecks(
      { defaults: ["no_emoji", { max_words: 2 }], omit: ["max_words"], checks: [{ contains_any: ["táo"] }] },
      "quả táo rất ngon",
      { userText: "apple" },
    );
    expect(results.map((r: { name: string }) => r.name)).toEqual(["no_emoji", "contains_any"]);
    expect(results.every((r: { pass: boolean }) => r.pass)).toBe(true);
    expect(() => runChecks({ checks: ["nope"] }, "x")).toThrow(/Unknown check/);
  });
  it("counts pass rates per check and leaves skipped checks out", () => {
    const t = tally([
      { id: "a", results: [{ name: "x", pass: true }, { name: "y", pass: false }] },
      { id: "b", results: [{ name: "x", pass: true }, { name: "y", pass: true, skipped: true }] },
    ]);
    expect(t.byCheck).toEqual({ x: { pass: 2, total: 2 }, y: { pass: 0, total: 1 } });
    expect(t.passed).toBe(2);
    expect(t.total).toBe(3);
    expect(t.casesPassed).toBe(1);
    expect(t.cases).toBe(2);
  });
});

describe("tutor-cases.json", () => {
  const spec = JSON.parse(fs.readFileSync("scripts/eval/tutor-cases.json", "utf8"));
  it("has about 32 cases with unique ids, a language and only known checks", () => {
    expect(spec.cases.length).toBeGreaterThanOrEqual(28);
    const ids = spec.cases.map((c: { id: string }) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of spec.cases) {
      expect(["en", "zh"]).toContain(c.language);
      expect(c.text.length).toBeGreaterThan(3);
      for (const check of [...spec.defaults, ...c.checks]) expect(CHECKS).toHaveProperty(normalizeCheck(check).name);
      for (const name of c.omit ?? []) expect(CHECKS).toHaveProperty(name);
    }
  });
  it("covers the case kinds the plan asks for", () => {
    const count = (kind: string) => spec.cases.filter((c: { kind: string }) => c.kind === kind).length;
    expect(count("word_en")).toBe(6);
    expect(count("word_zh")).toBe(6);
    expect(count("fix_en")).toBe(5);
    expect(count("fix_zh")).toBe(3);
    expect(count("compare")).toBe(3);
    expect(count("translate")).toBe(2);
    expect(count("roleplay")).toBe(2);
    expect(count("quiz")).toBe(1);
    expect(count("ielts")).toBe(2);
    expect(count("offtopic")).toBe(2);
  });
});

describe("parseServerTiming", () => {
  it("reads marks and tolerates a missing header", () => {
    expect(parseServerTiming("auth;dur=120, prelude;dur=480.4, thread_created;dur=7")).toEqual({ auth: 120, prelude: 480, thread_created: 7 });
    expect(parseServerTiming(null)).toEqual({});
    expect(parseServerTiming("garbage")).toEqual({});
  });
  it("pct takes the nearest rank and ignores non-numbers", () => {
    expect(pct([30, 10, 20, null as unknown as number, 40], 50)).toBe(20);
    expect(pct([10, 20, 30, 40, 50], 90)).toBe(50);
    expect(pct([], 50)).toBeNull();
  });
});

describe("readChatStream", () => {
  const sse = (events: unknown[]) =>
    new Response(events.map((e) => `data: ${typeof e === "string" ? e : JSON.stringify(e)}\n\n`).join(""), {
      headers: { "content-type": "text/event-stream" },
    });

  it("joins the text deltas, counts tool calls and times the first real text", async () => {
    const r = await readChatStream(
      sse([
        { type: "start" },
        { type: "tool-input-available", toolCallId: "1" },
        { type: "text-delta", id: "t", delta: " " },
        { type: "text-delta", id: "t", delta: "Quả " },
        { type: "text-delta", id: "t", delta: "táo" },
        "[DONE]",
      ]),
    );
    expect(r.answer).toBe(" Quả táo");
    expect(r.chars).toBe(8);
    expect(r.tools).toBe(1);
    expect(r.error).toBeUndefined();
    expect(r.ttft).not.toBeNull();
    expect(r.total).not.toBeNull();
  });

  it("reports a stream error and has no first-text time when nothing was said", async () => {
    const r = await readChatStream(sse([{ type: "error", errorText: "Thử lại" }]));
    expect(r.error).toBe("Thử lại");
    expect(r.answer).toBe("");
    expect(r.ttft).toBeNull();
  });
});

describe("loadEnv", () => {
  it("leaves CLONE_* keys out unless asked, and reads quoted multi-line values", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "env-test-"));
    const file = path.join(dir, ".env.local");
    // A made-up profile: the real one never appears in the repo.
    fs.writeFileSync(file, "AI_MODEL=m\nCLONE_PROFILE=`Bạn là Nam,\nthích mèo`\nCLONE_NAME=Nam\nAI_DAILY_LIMIT_PER_USER=5\n");
    try {
      expect(loadEnv({ file })).toEqual({ AI_MODEL: "m", AI_DAILY_LIMIT_PER_USER: "5" });
      expect(loadEnv({ file, include: ["CLONE_PROFILE"] })).toMatchObject({ CLONE_PROFILE: "Bạn là Nam,\nthích mèo" });
      expect(loadEnv({ file, include: ["CLONE_PROFILE"] })).not.toHaveProperty("CLONE_NAME");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
