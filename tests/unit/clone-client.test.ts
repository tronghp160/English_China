import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { MAX_BUBBLES, splitBubbles } from "@/lib/ai/clone/bubbles";
import { CLONE_FORBIDDEN_KIND, CLONE_FORBIDDEN_MESSAGE, isCloneForbidden } from "@/lib/ai/clone/forbidden";
import {
  CLONE_STARTERS,
  clearLegacyCloneStorage,
  greetingName,
  LEGACY_CLONE_INTRO_KEY,
  LEGACY_CLONE_STORAGE_PREFIX,
  toRequestMessages,
} from "@/lib/ai/clone/client";

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


describe("legacy storage cleanup", () => {
  /** A minimal Storage with the three members the helper uses. */
  const fakeStorage = (entries: Record<string, string>) => {
    const data = new Map(Object.entries(entries));
    return {
      get length() {
        return data.size;
      },
      key: (i: number) => [...data.keys()][i] ?? null,
      removeItem: (k: string) => void data.delete(k),
      keys: () => [...data.keys()],
    };
  };

  it("deletes every conversation an earlier version kept, and the 'card closed' flag, and nothing else", () => {
    const s = fakeStorage({
      "sotu:clone:v1:user-a": "[]",
      "sotu:clone:v1:user-b": '[{"id":"1"}]',
      "sotu:clone:intro:v1": "1", // the card is always shown now: this flag is dead weight and goes too
      "sotu-theme": "dark",
      "sotu:lookup:v2": "{}",
      "other:sotu:clone:v1:x": "y", // only keys that START with the prefix
      "other:sotu:clone:intro:v1": "1", // the flag is matched by its exact name
    });
    expect(clearLegacyCloneStorage(s)).toBe(3);
    expect(s.keys()).toEqual(["sotu-theme", "sotu:lookup:v2", "other:sotu:clone:v1:x", "other:sotu:clone:intro:v1"]);
  });

  it("removes the flag even when nothing else is there", () => {
    const s = fakeStorage({ [LEGACY_CLONE_INTRO_KEY]: "1" });
    expect(clearLegacyCloneStorage(s)).toBe(1);
    expect(s.keys()).toEqual([]);
  });

  it("is harmless on an empty storage and when run twice", () => {
    expect(clearLegacyCloneStorage(fakeStorage({}))).toBe(0);
    const s = fakeStorage({ "sotu:clone:v1:u": "x" });
    expect(clearLegacyCloneStorage(s)).toBe(1);
    expect(clearLegacyCloneStorage(s)).toBe(0);
  });

  it("keeps the two key names apart", () => {
    expect(LEGACY_CLONE_INTRO_KEY.startsWith(LEGACY_CLONE_STORAGE_PREFIX)).toBe(false);
  });
});

describe("greetingName", () => {
  it("greets by the last word of the name, the given name in Vietnamese order", () => {
    expect(greetingName("Nguyễn Văn Minh")).toBe("Minh");
    expect(greetingName("Lan Chi")).toBe("Chi");
    expect(greetingName("  Phạm   Thu Hà ")).toBe("Hà");
  });

  it("keeps a one-word name as it is", () => {
    expect(greetingName("Hà")).toBe("Hà");
    expect(greetingName("Xễu")).toBe("Xễu");
  });

  it("says no name when the display name looks like a username or an email", () => {
    for (const looksLikeAccount of ["tronghp160", "user123", "ban_dem", "minh.anh", "someone@example.com", "Nguyễn Văn Minh2", "a1"]) {
      expect(greetingName(looksLikeAccount), looksLikeAccount).toBeNull();
    }
  });

  it("says no name for nothing usable, a very long word or markup only", () => {
    for (const nothing of ["", "   ", "<>", "x".repeat(80)]) expect(greetingName(nothing), nothing).toBeNull();
    expect(greetingName("An <b>Bình</b>")).not.toMatch(/[<>]/);
  });

  it("drops punctuation stuck to the last word", () => {
    expect(greetingName("Anh Tuấn,")).toBe("Tuấn");
  });
});

describe("isCloneForbidden", () => {
  const bodyError = (body: unknown) => new Error(JSON.stringify(body));

  it("recognizes the route's \"no access\" answer, which the SDK puts in the error message", () => {
    expect(isCloneForbidden(bodyError({ error: CLONE_FORBIDDEN_MESSAGE, kind: CLONE_FORBIDDEN_KIND }))).toBe(true);
  });

  it("does not mistake any other failure for it", () => {
    expect(isCloneForbidden(undefined)).toBe(false);
    expect(isCloneForbidden(null)).toBe(false);
    expect(isCloneForbidden(new Error(""))).toBe(false);
    expect(isCloneForbidden(new Error("Failed to fetch"))).toBe(false); // a network error
    expect(isCloneForbidden(new Error("not json {"))).toBe(false);
    expect(isCloneForbidden(bodyError({ error: "Tính năng chưa bật.", kind: "other" }))).toBe(false); // another 404
    expect(isCloneForbidden(bodyError({ error: "Bạn gửi nhanh quá.", kind: "rate" }))).toBe(false);
    expect(isCloneForbidden(bodyError(null))).toBe(false);
    expect(isCloneForbidden(bodyError("forbidden"))).toBe(false);
  });

  it("says the text the page shows", () => {
    expect(CLONE_FORBIDDEN_MESSAGE).toBe("Tính năng này hiện chưa mở cho bạn.");
  });
});

describe("starters", () => {
  it("are plain, short and few", () => {
    expect(CLONE_STARTERS.length).toBeGreaterThanOrEqual(4);
    for (const s of CLONE_STARTERS) expect(s.length).toBeLessThan(45);
  });

  it("are about the person, never questions about the owner", () => {
    for (const s of CLONE_STARTERS) {
      expect(s, s).toMatch(/(^|\s)tui(\s|,|$)/i);
      expect(s, s).not.toMatch(/(^|\s)(ông|bà|bạn|anh|chị)(\s|\?|$)/i);
    }
  });
});
