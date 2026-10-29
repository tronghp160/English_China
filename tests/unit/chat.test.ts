import { describe, expect, it } from "vitest";
import { learnerBlock, threadTitle, tutorInstructions } from "@/lib/ai/chat-prompt";
import { chatStarters, guessLanguage } from "@/lib/ai/tutor/starters";
import { rankByTerm, sanitizeSearch } from "@/lib/search";
import { toBlocks } from "@/components/chat/message-text";

describe("tutorInstructions", () => {
  it("names the learner and the language", () => {
    const s = tutorInstructions({ language: "en", learnerName: "Minh" });
    expect(s).toContain("Minh");
    expect(s).toContain("tiếng anh");
    expect(s).toContain("IPA");
    expect(s).not.toContain("bộ từ \"");
  });

  it("adds the Chinese pinyin rule and the thread deck", () => {
    const s = tutorInstructions({ language: "zh", learnerName: "Lan", deckName: "HSK 3" });
    expect(s).toContain("pinyin có dấu thanh");
    expect(s).toContain('bộ từ "HSK 3"');
  });

  it("mentions every tool the route registers", () => {
    const s = tutorInstructions({ language: "en", learnerName: "A" });
    for (const name of ["searchMyWords", "getStudyFocus", "suggestWord"]) expect(s).toContain(name);
  });
});

describe("threadTitle", () => {
  it("collapses whitespace and caps at 60 characters", () => {
    expect(threadTitle("  phân   biệt\naffect và effect ")).toBe("phân biệt affect và effect");
    const long = threadTitle("a".repeat(100));
    expect(long).toHaveLength(60);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("sanitizeSearch", () => {
  it("removes PostgREST filter syntax and wildcards", () => {
    expect(sanitizeSearch("a,b)(c%_*d")).toBe("a b c d");
    expect(sanitizeSearch("kiên cường")).toBe("kiên cường");
    expect(sanitizeSearch(",,,")).toBe("");
  });
});

describe("rankByTerm", () => {
  it("puts exact and prefix matches first, keeping order otherwise", () => {
    const rows = ["unhappy", "happy hour", "happy", "a happy day"].map((term) => ({ term }));
    expect(rankByTerm(rows, "Happy").map((r) => r.term)).toEqual(["happy", "happy hour", "unhappy", "a happy day"]);
  });
});

describe("message blocks", () => {
  it("groups paragraphs and lists", () => {
    const blocks = toBlocks("Xin chào\ndòng hai\n\n- một\n- hai\n\n1. đầu\n2) sau\nKết");
    expect(blocks).toEqual([
      { kind: "p", lines: ["Xin chào", "dòng hai"] },
      { kind: "ul", lines: ["một", "hai"] },
      { kind: "ol", lines: ["đầu", "sau"] },
      { kind: "p", lines: ["Kết"] },
    ]);
  });

  it("drops heading marks and empty input", () => {
    expect(toBlocks("## Tiêu đề")).toEqual([{ kind: "p", lines: ["Tiêu đề"] }]);
    expect(toBlocks("\n\n")).toEqual([]);
  });
});

describe("tutor instructions v2 (one free chat)", () => {
  const snapshot = [
    { language: "zh" as const, total: 40, due: 7, hard: [{ term: "坚强", reading: "jiānqiáng", meaning_vi: "kiên cường", lapses: 3 }], recent: [] },
    { language: "en" as const, total: 0, due: 0, hard: [], recent: [] },
  ];

  it("puts the learner's own words in the prompt", () => {
    const s = tutorInstructions({ language: "zh", learnerName: "Lan", snapshot });
    expect(s).toContain("40 từ trong sổ, 7 từ đến hạn");
    expect(s).toContain("坚强 (jiānqiáng): kiên cường, quên 3 lần");
    expect(s).not.toContain("Tiếng Anh: 0 từ");
  });

  it("knows both languages whatever the thread language", () => {
    const s = tutorInstructions({ language: "zh", learnerName: "Lan" });
    expect(s).toContain("IPA");
    expect(s).toContain("pinyin có dấu thanh");
    expect(s).toContain("không bình luận chuyện họ đổi ngôn ngữ");
  });

  it("greets only on the first turn and always writes text", () => {
    expect(tutorInstructions({ language: "en", learnerName: "A", firstTurn: true })).toContain("Đây là tin đầu tiên");
    const later = tutorInstructions({ language: "en", learnerName: "A", firstTurn: false });
    expect(later).toContain("không chào lại");
    expect(later).toContain("Luôn có câu trả lời bằng chữ");
  });

  it("uses the mascot name", () => {
    expect(tutorInstructions({ language: "en", learnerName: "A", tutorName: "Bin" })).toContain("Bạn là Bin");
    expect(learnerBlock([])).toContain("chưa có từ nào");
  });
});

describe("chat starters and language guess", () => {
  it("offers practice on the learner's words plus one example per language", () => {
    const s = chatStarters(["en", "zh"]);
    expect(s).toHaveLength(4);
    expect(s.map((x) => x.label)).toContain("Phân biệt 想 và 要");
    expect(chatStarters([]).length).toBe(4);
  });

  it("guesses the thread language from the first message", () => {
    expect(guessLanguage("坚强 nghĩa là gì", "en")).toBe("zh");
    expect(guessLanguage("dạy mình tiếng Trung chủ đề ăn uống", "en")).toBe("zh");
    expect(guessLanguage("phân biệt dog và cat", "zh")).toBe("zh");
    expect(guessLanguage("luyện IELTS speaking", "zh")).toBe("en");
  });
});
