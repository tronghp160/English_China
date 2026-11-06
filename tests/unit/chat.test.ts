import { describe, expect, it } from "vitest";
import { learnerBlock, STYLE_EXAMPLES, threadTitle, tutorInstructionParts, tutorInstructions } from "@/lib/ai/chat-prompt";
import { groupThreadsByDay } from "@/lib/ai/tutor/history";
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

  it("greets back only when the learner greeted first", () => {
    const first = tutorInstructionParts({ language: "en", learnerName: "A", firstTurn: true }).turn;
    expect(first).toContain("Đây là tin đầu tiên");
    expect(first).toContain("Chỉ chào lại nếu tin nhắn của người học mở đầu bằng lời chào");
    expect(first).toContain("câu đầu tiên của bạn đã là nội dung");
    expect(first).not.toContain("có thể chào một câu ngắn");
  });

  it("asks for the direct answer first, a self-check, error priority and repeated-error reminders", () => {
    const { stable } = tutorInstructionParts({ language: "en", learnerName: "A" });
    expect(stable).toContain("Câu đầu tiên trả lời thẳng câu hỏi");
    expect(stable).toContain("tự kiểm: pinyin có dấu thanh đúng chưa, IPA có chưa");
    expect(stable).toContain("Lỗi làm sai nghĩa nói trước, lỗi chưa tự nhiên nói sau");
    expect(stable).toContain("tối đa 3 lỗi quan trọng nhất");
    expect(stable).toContain("cùng một lỗi trước đó trong cuộc trò chuyện này");
  });

  it("tells the model the learner's level and to keep examples near it", () => {
    const withLevel = [{ language: "en" as const, total: 12, due: 2, hard: [], recent: [], level: "B1" }];
    expect(learnerBlock(withLevel)).toContain("Trình độ ước lượng: B1");
    expect(learnerBlock([{ language: "zh" as const, total: 3, due: 0, hard: [], recent: [], level: "HSK 2" }])).toContain("Trình độ ước lượng: HSK 2");
    expect(learnerBlock([{ language: "en" as const, total: 12, due: 2, hard: [], recent: [] }])).not.toContain("Trình độ ước lượng");
    const { stable, turn } = tutorInstructionParts({ language: "en", learnerName: "A", snapshot: withLevel });
    expect(stable).toContain("ở khoảng trình độ đó, chỉ khó hơn một chút");
    expect(turn).toContain("Trình độ ước lượng: B1"); // per learner: only in the per-turn part
    expect(stable).not.toContain("B1");
  });

  it("explains how to grade IELTS Writing and Speaking: criteria, a band range with a caveat, 2-3 fixes, a model sentence", () => {
    const { stable } = tutorInstructionParts({ language: "en", learnerName: "A" });
    for (const phrase of ["Task Response", "Task Achievement", "Coherence & Cohesion", "Lexical Resource", "Grammatical Range & Accuracy", "Fluency & Coherence", "Pronunciation"]) {
      expect(stable).toContain(phrase);
    }
    expect(stable).toContain("khoảng 5.5–6.0");
    expect(stable).toContain("chỉ là ước lượng");
    expect(stable).toContain("2–3 sửa quan trọng nhất và một câu viết lại mẫu");
    expect(stable).toContain("<gioi_han>"); // the limits stay
  });

  it("makes the IELTS reply name every criterion, role-play in Chinese carry pinyin, and a refusal skip the greeting", () => {
    const { stable } = tutorInstructionParts({ language: "en", learnerName: "A" });
    expect(stable).toContain("MỖI tiêu chí một dòng ngắn");
    expect(stable).toContain('dùng đúng chữ "band"');
    expect(stable).toContain("Không bỏ tiêu chí nào");
    expect(stable).toContain("tiếng Trung thì kèm pinyin có dấu thanh trong ngoặc ngay sau câu");
    expect(stable).toContain("không chào, không giới thiệu tên mình");
    expect(stable).toContain("<gioi_han>"); // the limits stay
  });

  it("carries three short style examples in the stable prefix, in the format it asks for", () => {
    const { stable } = tutorInstructionParts({ language: "en", learnerName: "A" });
    const block = stable.slice(stable.indexOf("<vi_du_mau>"), stable.indexOf("</vi_du_mau>"));
    expect(block).toContain("/ˈæpəl/"); // IPA
    expect(block).toMatch(/\([a-zǎǐǒǔāáàēéěèīíìōóòūúùǖǘǚǜ ]+\)/u); // pinyin with tone marks in parentheses
    expect(block.match(/\*[^*\n]+\*/g)?.length).toBeGreaterThanOrEqual(2); // Vietnamese translation lines in italics
    expect(block.match(/^".*" →$/gm)).toHaveLength(3); // three questions, each followed by the model answer
    expect(block.length).toBeLessThan(900); // about 250 tokens: it is part of every request
    expect(block).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(STYLE_EXAMPLES.join("\n")).toBe(block.slice("<vi_du_mau>\n".length).trimEnd());
  });

  it("keeps everything that changes per learner or turn out of the stable prefix", () => {
    const a = tutorInstructionParts({ language: "en", learnerName: "Minh", tutorName: "Bin", firstTurn: true, today: "2026-10-31", pageContext: "trang A" });
    const b = tutorInstructionParts({ language: "zh", learnerName: "Lan", tutorName: "Bin", firstTurn: false, deckName: "HSK 3" });
    expect(a.stable).toBe(b.stable);
    expect(a.turn).toContain("Minh");
    expect(a.turn).toContain("2026-10-31");
    expect(a.turn).toContain("trang A");
    expect(b.turn).toContain("không chào lại");
    expect(tutorInstructions({ language: "en", learnerName: "Minh" }).startsWith(a.stable.replace("Bạn là Bin, gia sư ngoại ngữ của app Sổ Từ", 'Bạn là "Gia sư Sổ Từ"'))).toBe(true);
  });
});

describe("chat starters and language guess", () => {
  it("provides starters with valid icon and tone", () => {
    const s = chatStarters(["en"]);
    expect(s.length).toBeGreaterThanOrEqual(4);
    for (const item of s) {
      expect(item.icon).toBeDefined();
      expect(item.tone).toBeDefined();
      expect(item.label).toBeTruthy();
      expect(item.text).toBeTruthy();
    }
  });

  it("offers the IELTS Writing chip to learners who study English, filling the box instead of sending", () => {
    const en = chatStarters(["en", "zh"]).find((x) => x.label === "Chấm bài IELTS Writing");
    expect(en).toBeDefined();
    expect(en?.send).toBe(false);
    expect(en?.text).toContain("IELTS Writing");
    expect(chatStarters(["zh"]).some((x) => x.label === "Chấm bài IELTS Writing")).toBe(false);
  });

  it("includes explain chip only when hardWord is provided", () => {
    const withoutHard = chatStarters(["zh"]);
    expect(withoutHard.some((x) => x.icon === "explain")).toBe(false);

    const withHard = chatStarters(["zh"], { hardWord: { term: "坚强" } });
    const explainChip = withHard.find((x) => x.icon === "explain");
    expect(explainChip).toBeDefined();
    expect(explainChip?.label).toBe("Giải thích lại «坚强»");
    expect(explainChip?.text).toContain("坚强");
    expect(explainChip?.tone).toBe("teal");
  });

  it("guesses the thread language from the first message", () => {
    expect(guessLanguage("坚强 nghĩa là gì", "en")).toBe("zh");
    expect(guessLanguage("dạy mình tiếng Trung chủ đề ăn uống", "en")).toBe("zh");
    expect(guessLanguage("phân biệt dog và cat", "zh")).toBe("zh");
    expect(guessLanguage("luyện IELTS speaking", "zh")).toBe("en");
  });
});

describe("groupThreadsByDay", () => {
  const tz = "Asia/Ho_Chi_Minh";
  const now = new Date("2026-10-29T14:00:00+07:00");

  it("groups threads into today, yesterday, last 7 days and older", () => {
    const threads = [
      { id: "1", title: "Hôm nay", updated_at: "2026-10-29T10:00:00+07:00" },
      { id: "2", title: "Hôm qua", updated_at: "2026-10-28T15:00:00+07:00" },
      { id: "3", title: "3 ngày trước", updated_at: "2026-10-26T12:00:00+07:00" },
      { id: "4", title: "10 ngày trước", updated_at: "2026-10-19T10:00:00+07:00" },
    ];

    const groups = groupThreadsByDay(threads, now, tz);
    expect(groups.map((g) => g.label)).toEqual(["Hôm nay", "Hôm qua", "7 ngày qua", "Cũ hơn"]);
    expect(groups[0].threads[0].title).toBe("Hôm nay");
    expect(groups[1].threads[0].title).toBe("Hôm qua");
    expect(groups[2].threads[0].title).toBe("3 ngày trước");
    expect(groups[3].threads[0].title).toBe("10 ngày trước");
  });

  it("skips empty groups", () => {
    const threads = [{ id: "1", title: "Chỉ hôm nay", updated_at: "2026-10-29T11:00:00+07:00" }];
    const groups = groupThreadsByDay(threads, now, tz);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Hôm nay");
  });
});

describe("chatUrl", () => {
  it("keeps every conversation on the /chat route", async () => {
    const { chatUrl } = await import("@/lib/ai/tutor/chat-url");
    expect(chatUrl()).toBe("/chat");
    expect(chatUrl("abc")).toBe("/chat?c=abc");
    expect(chatUrl("abc", "từ library?")).toBe("/chat?c=abc&q=t%E1%BB%AB+library%3F");
  });
});
