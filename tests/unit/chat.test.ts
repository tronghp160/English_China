import { describe, expect, it } from "vitest";
import { threadTitle, tutorInstructions } from "@/lib/ai/chat-prompt";
import { sanitizeSearch } from "@/lib/ai/chat-tools";
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
