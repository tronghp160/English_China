import { describe, expect, it } from "vitest";
import { countExamples, detailSummary, hasImage, hasInfo, hasNote, tabLabel } from "@/lib/word-summary";
import { emptyWord, type WordInput } from "@/lib/word-schema";

describe("word summary helpers", () => {
  it("detailSummary formats all fields in order", () => {
    const word: WordInput = {
      ...emptyWord(),
      term: "resilient",
      meaning_vi: "kiên cường",
      examples: [
        { text: "He is resilient", vi: "Anh ấy kiên cường" },
        { text: "A resilient economy", vi: "Nền kinh tế kiên cường" },
      ],
      parts_of_speech: ["adj"],
      topic: "Cảm xúc",
      image_url: "https://example.com/resilient.jpg",
      personal_note: "Nhớ ôn từ này",
    };

    const summary = detailSummary(word, "ai");
    expect(summary).toBe("Đã điền bằng AI · 2 ví dụ · Tính từ · Cảm xúc · có ảnh · có ghi chú");
  });

  it("detailSummary formats dictionary source", () => {
    const word: WordInput = {
      ...emptyWord(),
      term: "apple",
      meaning_vi: "quả táo",
      parts_of_speech: ["noun"],
    };
    expect(detailSummary(word, "dict")).toBe("Đã điền từ từ điển · Danh từ");
  });

  it("detailSummary returns empty string when no details are present", () => {
    const word: WordInput = {
      ...emptyWord(),
      term: "simple",
      meaning_vi: "đơn giản",
    };
    expect(detailSummary(word, null)).toBe("");
  });

  it("counts and flags work properly", () => {
    const word: WordInput = {
      ...emptyWord(),
      examples: [{ text: "Ex 1", vi: "" }, { text: "   ", vi: "" }],
      image_url: "https://example.com/pic.png",
      personal_note: "Note",
    };

    expect(countExamples(word)).toBe(1);
    expect(hasImage(word)).toBe(true);
    expect(hasNote(word)).toBe(true);
    expect(hasInfo(word)).toBe(false);

    expect(tabLabel("examples", word)).toBe("Ví dụ 1");
    expect(tabLabel("image", word)).toBe("Ảnh ✓");
    expect(tabLabel("note", word)).toBe("Ghi chú ✓");
    expect(tabLabel("info", word)).toBe("Thông tin");
  });
});
