import { describe, expect, it } from "vitest";
import type { CloneTurn } from "@/lib/ai/clone/history";
import { asksQuestion, conversationHints, detectMood, readConversation } from "@/lib/ai/clone/mood";

const u = (content: string): CloneTurn => ({ role: "user", content });
const a = (content: string): CloneTurn => ({ role: "assistant", content });

describe("detectMood", () => {
  it("reads a crisis first, with or without diacritics", () => {
    for (const t of ["tui không muốn sống nữa", "muốn chết quá", "nghĩ tới chuyện tự tử", "khong muon song nua", "chán sống rồi"]) {
      expect(detectMood(t), t).toBe("crisis");
    }
  });

  it("does not take 'từ từ' typed without marks for a crisis", () => {
    expect(detectMood("tu tu thoi, khong gap")).not.toBe("crisis");
  });

  it("tells heavy, low, angry and anxious apart", () => {
    expect(detectMood("tui mới chia tay")).toBe("heavy");
    expect(detectMood("cô đơn ghê")).toBe("heavy");
    expect(detectMood("nay buồn quá")).toBe("low");
    expect(detectMood("met moi qua troi")).toBe("low");
    expect(detectMood("bực mình thiệt sự")).toBe("angry");
    expect(detectMood("mai sắp thi mà hồi hộp quá")).toBe("anxious");
    expect(detectMood("tui sợ lắm")).toBe("anxious");
  });

  it("lets hurt win over a laugh", () => {
    expect(detectMood("haha buồn ghê")).toBe("low");
  });

  it("reads good news and excitement", () => {
    expect(detectMood("tui đậu rồi!!!")).toBe("happy");
    expect(detectMood("có tin vui nè")).toBe("happy");
    expect(detectMood("vui quá trời")).toBe("happy");
  });

  it("does not read a negated feeling or a lookalike word", () => {
    for (const t of ["giờ hết buồn rồi", "không lo đâu", "đừng sợ", "loại nhạc nào ông thích", "tức là sao", "buồng ngủ nhỏ ghê"]) {
      expect(detectMood(t), t).toBe("neutral");
    }
  });

  it("is neutral for small talk", () => {
    for (const t of ["dạo này sao rồi", "ăn cơm chưa", "chào", "long time no see"]) expect(detectMood(t), t).toBe("neutral");
  });
});

describe("readConversation", () => {
  it("reads the first turn", () => {
    const s = readConversation([u("nay buồn quá")]);
    expect(s).toMatchObject({ mood: "low", previousMood: null, recentQuestions: 0, terse: false, userTurns: 1 });
  });

  it("counts how many of the last two answers asked something", () => {
    const h = [u("nay buồn"), a("sao vậy?"), u("chuyện học"), a("học gì mà mệt vậy?"), u("toán")];
    expect(readConversation(h).recentQuestions).toBe(2);
    expect(readConversation([u("a"), a("ừ nghe nè"), u("b"), a("vậy hả?"), u("c")]).recentQuestions).toBe(1);
    expect(readConversation([u("a"), a("ừ"), u("b")]).recentQuestions).toBe(0);
    // questions typed without "?" count too
    expect(readConversation([u("a"), a("Đi ăn chè hông, rảnh nè."), u("b"), a("Bài khó không, làm thử coi."), u("c")]).recentQuestions).toBe(2);
  });

  it("sees a question with or without a question mark, and not a plain sentence", () => {
    for (const t of ["sao vậy?", "Đi ăn chè hông", "mai rảnh hong, đi chơi nè", "ăn cơm chưa", "vậy hả", "thi xong rồi hả bà", "có mệt ko"]) {
      expect(asksQuestion(t), t).toBe(true);
    }
    for (const t of ["hông sao, để mai làm cũng được nha.", "Bài này dễ mà, làm thử đi nè.", "Ừa, mai gặp nha.", "tui không biết nữa á", "chưa kịp ăn luôn"]) {
      expect(asksQuestion(t), t).toBe(false);
    }
  });

  it("notices a terse reply only after the first turn", () => {
    expect(readConversation([u("ừ")]).terse).toBe(false);
    for (const t of ["ừ", "ok", "kệ", "...", "ừm."]) expect(readConversation([u("buồn ghê"), a("sao vậy?"), u(t)]).terse, t).toBe(true);
    expect(readConversation([u("buồn"), a("sao vậy?"), u("ừ thì chuyện là vầy nè")]).terse).toBe(false);
  });

  it("notices asking for advice, wanting only to vent, and closing", () => {
    expect(readConversation([u("giờ tui nên làm gì đây")]).wantsAdvice).toBe(true);
    expect(readConversation([u("tui chỉ muốn than chút thôi, không cần khuyên đâu")]).justVent).toBe(true);
    expect(readConversation([u("thôi tui đi ngủ nha, cảm ơn đã nghe tui")]).closing).toBe(true);
    // a crisis is never a goodbye, even with the same words
    expect(readConversation([u("tui đi ngủ luôn, không muốn sống nữa")]).closing).toBe(false);
    // a long story that mentions sleep is still a story
    expect(readConversation([u("hôm qua tui đi ngủ trễ " + "rồi chuyện dài lắm ".repeat(10))]).closing).toBe(false);
  });

  it("keeps the mood of the message before", () => {
    const s = readConversation([u("nay buồn quá"), a("sao vậy?"), u("mà thôi kể chuyện vui đi haha")]);
    expect(s.previousMood).toBe("low");
    expect(s.mood).toBe("happy");
  });
});

describe("conversationHints", () => {
  const base = readConversation([u("chào")]);

  it("is one tagged block that ends with the 'only a guess' line", () => {
    const h = conversationHints(base);
    expect(h.startsWith("<nhip_tro_chuyen>\n")).toBe(true);
    expect(h.endsWith("\n</nhip_tro_chuyen>")).toBe(true);
    expect(h).toContain("chỉ là đoán");
  });

  it("stops asking after two questions in a row", () => {
    expect(conversationHints({ ...base, recentQuestions: 2 })).toContain("KHÔNG hỏi thêm");
    expect(conversationHints({ ...base, recentQuestions: 1 })).toContain("tối đa một câu");
    expect(conversationHints({ ...base, recentQuestions: 0 })).not.toContain("hỏi thêm");
  });

  it("follows a mood that lifts or drops", () => {
    expect(conversationHints({ ...base, mood: "happy", previousMood: "low" })).toContain("đừng kéo họ quay lại chuyện buồn");
    expect(conversationHints({ ...base, mood: "low", previousMood: "neutral" })).toContain("chùng xuống");
  });

  it("does not give advice to someone who only wants to vent, even when they ask how", () => {
    const h = conversationHints({ ...base, justVent: true, wantsAdvice: true });
    expect(h).toContain("KHÔNG khuyên");
    expect(h).not.toContain("góp ý 1–2 ý");
  });

  it("in a crisis points to the safety rules and drops the limits on asking", () => {
    const h = conversationHints({ ...base, mood: "crisis", recentQuestions: 2, terse: true, previousMood: "neutral" });
    expect(h).toContain("<an_toan>");
    expect(h).toContain("người thân, bạn bè hay thầy cô");
    expect(h).toContain("115");
    expect(h).not.toContain("KHÔNG hỏi thêm");
    expect(h).not.toContain("trả lời rất ngắn");
    expect(h).not.toContain("chùng xuống");
  });

  it("says goodbye without a new question", () => {
    expect(conversationHints({ ...base, closing: true, recentQuestions: 1 })).toContain("KHÔNG hỏi câu mới");
    expect(conversationHints({ ...base, closing: true, recentQuestions: 1 })).not.toContain("tối đa một câu");
  });
});
