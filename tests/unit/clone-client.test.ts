import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { MAX_BUBBLES, splitBubbles } from "@/lib/ai/clone/bubbles";
import { CLONE_STARTERS, CLONE_STORED_MAX, cloneStorageKey, parseStored, serializeMessages, shortName, textMessages, toRequestMessages } from "@/lib/ai/clone/client";

const ui = (id: string, role: "user" | "assistant", ...texts: string[]): UIMessage => ({
  id,
  role,
  parts: texts.map((text) => ({ type: "text" as const, text })),
});

describe("splitBubbles", () => {
  it("makes one bubble per paragraph", () => {
    expect(splitBubbles("ừ nghe nè\n\nkể tui nghe đi\n\nnay sao rồi")).toEqual(["ừ nghe nè", "kể tui nghe đi", "nay sao rồi"]);
  });

  it("keeps single line breaks inside a bubble and ignores blank paragraphs", () => {
    expect(splitBubbles("dòng một\ndòng hai\n\n \t \n\n\nbong bóng hai\n\n")).toEqual(["dòng một\ndòng hai", "bong bóng hai"]);
    expect(splitBubbles("a\r\n\r\nb")).toEqual(["a", "b"]);
  });

  it("gives nothing for an empty answer and one bubble for plain text", () => {
    expect(splitBubbles("")).toEqual([]);
    expect(splitBubbles("  \n\n  ")).toEqual([]);
    expect(splitBubbles("chào")).toEqual(["chào"]);
  });

  it("puts everything past the sixth paragraph into the last bubble", () => {
    const text = Array.from({ length: 9 }, (_, i) => `p${i + 1}`).join("\n\n");
    const out = splitBubbles(text);
    expect(out).toHaveLength(MAX_BUBBLES);
    expect(out.slice(0, 5)).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    expect(out[5]).toBe("p6\n\np7\n\np8\n\np9");
  });

  it("lets the last bubble grow while the answer streams", () => {
    expect(splitBubbles("một\n\nha")).toEqual(["một", "ha"]);
    expect(splitBubbles("một\n\nhai và")).toEqual(["một", "hai và"]);
  });
});

describe("request messages", () => {
  it("sends text parts only, in order, without empty messages", () => {
    const messages = [
      ui("1", "user", "chào"),
      { id: "2", role: "assistant", parts: [{ type: "step-start" }, { type: "text", text: "ừ" }, { type: "reasoning", text: "nghĩ" }] } as UIMessage,
      ui("3", "assistant", "  "),
      ui("4", "user", "một", "hai"),
    ];
    expect(toRequestMessages(messages)).toEqual([
      { id: "1", role: "user", parts: [{ type: "text", text: "chào" }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "ừ" }] },
      { id: "4", role: "user", parts: [{ type: "text", text: "một\nhai" }] },
    ]);
  });

  it("sends at most the latest 20", () => {
    const many = Array.from({ length: 30 }, (_, i) => ui(`m${i}`, i % 2 ? "assistant" : "user", `tin ${i}`));
    const out = toRequestMessages(many);
    expect(out).toHaveLength(20);
    expect(out[0].id).toBe("m10");
    expect(out.at(-1)?.id).toBe("m29");
  });
});

describe("localStorage round trip", () => {
  it("keys the conversation by user", () => {
    expect(cloneStorageKey("u-1")).toBe("sotu:clone:v1:u-1");
    expect(cloneStorageKey("u-1")).not.toBe(cloneStorageKey("u-2"));
  });

  it("stores text only and reads it back as chat messages", () => {
    const messages = [ui("1", "user", "chào"), ui("2", "assistant", "ừ", "nghe nè"), ui("3", "assistant", "")];
    const raw = serializeMessages(messages);
    expect(JSON.parse(raw)).toEqual([
      { id: "1", role: "user", text: "chào" },
      { id: "2", role: "assistant", text: "ừ\nnghe nè" },
    ]);
    expect(parseStored(raw)).toEqual([ui("1", "user", "chào"), ui("2", "assistant", "ừ\nnghe nè")]);
    expect(textMessages(messages)).toHaveLength(2);
  });

  it("keeps the latest 100", () => {
    const many = Array.from({ length: 130 }, (_, i) => ui(`m${i}`, i % 2 ? "assistant" : "user", `tin ${i}`));
    const stored = JSON.parse(serializeMessages(many)) as { id: string }[];
    expect(stored).toHaveLength(CLONE_STORED_MAX);
    expect(stored[0].id).toBe("m30");
    expect(parseStored(JSON.stringify(stored.concat(stored)))).toHaveLength(CLONE_STORED_MAX); // an oversized store is trimmed on read
  });

  it("ignores anything unreadable", () => {
    for (const raw of [null, "", "not json", "{}", '{"a":1}', '[{"id":1}]', '[{"id":"a","role":"system","text":"x"}]', '[{"id":"a","role":"user","text":""}]', "null"]) {
      expect(parseStored(raw), String(raw)).toEqual([]);
    }
  });
});

describe("shortName", () => {
  it("greets by the last word of the name, the given name in Vietnamese order", () => {
    expect(shortName("Nguyễn Văn Minh")).toBe("Minh");
    expect(shortName("Lan Chi")).toBe("Chi");
    expect(shortName("  Phạm   Thu Hà ")).toBe("Hà");
  });

  it("keeps a one-word name as it is, whatever it looks like", () => {
    expect(shortName("Hà")).toBe("Hà");
    expect(shortName("user123")).toBe("user123");
  });

  it("falls back to bạn, and cannot carry angle brackets or a very long word", () => {
    expect(shortName("")).toBe("bạn");
    expect(shortName("   ")).toBe("bạn");
    expect(shortName("<>")).toBe("bạn");
    expect(shortName("An <b>Bình</b>")).not.toMatch(/[<>]/);
    expect(shortName("x".repeat(80))).toHaveLength(30);
  });
});

describe("starters", () => {
  it("are plain, short and few", () => {
    expect(CLONE_STARTERS.length).toBeGreaterThanOrEqual(4);
    for (const s of CLONE_STARTERS) expect(s.length).toBeLessThan(45);
  });
});
