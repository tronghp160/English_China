import { describe, expect, it } from "vitest";
import { cloneEffort } from "@/lib/ai/clone/effort";
import { CLONE_ASSISTANT_MAX_CHARS, CLONE_TOTAL_MAX_CHARS, cloneBodySchema, sanitizeCloneHistory } from "@/lib/ai/clone/history";

const msg = (role: "user" | "assistant", text: string, id = Math.random().toString(36).slice(2)) => ({
  id,
  role,
  parts: [{ type: "text" as const, text }],
});

describe("cloneBodySchema", () => {
  it("accepts a conversation that ends with a user message", () => {
    expect(cloneBodySchema.safeParse({ messages: [msg("user", "chào"), msg("assistant", "ừ"), msg("user", "khỏe không?")] }).success).toBe(true);
  });

  it("rejects an empty list, more than 20 messages, and a body without messages", () => {
    expect(cloneBodySchema.safeParse({ messages: [] }).success).toBe(false);
    expect(cloneBodySchema.safeParse({ messages: Array.from({ length: 21 }, (_, i) => msg(i % 2 ? "assistant" : "user", "x")) }).success).toBe(false);
    expect(cloneBodySchema.safeParse({}).success).toBe(false);
    expect(cloneBodySchema.safeParse(null).success).toBe(false);
  });

  it("needs the last message to be a non-empty user message", () => {
    expect(cloneBodySchema.safeParse({ messages: [msg("user", "a"), msg("assistant", "b")] }).success).toBe(false);
    expect(cloneBodySchema.safeParse({ messages: [msg("user", "   ")] }).success).toBe(false);
  });

  it("limits a user message to 1000 characters and an answer to 4000", () => {
    expect(cloneBodySchema.safeParse({ messages: [msg("user", "x".repeat(1000))] }).success).toBe(true);
    expect(cloneBodySchema.safeParse({ messages: [msg("user", "x".repeat(1001))] }).success).toBe(false);
    expect(cloneBodySchema.safeParse({ messages: [msg("assistant", "x".repeat(CLONE_ASSISTANT_MAX_CHARS)), msg("user", "ok")] }).success).toBe(true);
    expect(cloneBodySchema.safeParse({ messages: [msg("assistant", "x".repeat(CLONE_ASSISTANT_MAX_CHARS + 1)), msg("user", "ok")] }).success).toBe(false);
  });

  it("limits the whole conversation to 30 000 characters", () => {
    const answers = (n: number) => Array.from({ length: n }, () => msg("assistant", "x".repeat(4000)));
    expect(CLONE_TOTAL_MAX_CHARS).toBe(30_000);
    expect(cloneBodySchema.safeParse({ messages: [...answers(7), msg("user", "ok")] }).success).toBe(true); // 28 002
    expect(cloneBodySchema.safeParse({ messages: [...answers(8), msg("user", "ok")] }).success).toBe(false); // 32 002
  });

  it("takes text parts only", () => {
    const withTool = { messages: [{ id: "1", role: "user", parts: [{ type: "tool-x", input: {} }] }] };
    expect(cloneBodySchema.safeParse(withTool).success).toBe(false);
    expect(cloneBodySchema.safeParse({ messages: [{ id: "1", role: "system", parts: [{ type: "text", text: "x" }] }] }).success).toBe(false);
  });
});

describe("sanitizeCloneHistory", () => {
  const run = (messages: ReturnType<typeof msg>[]) => sanitizeCloneHistory(cloneBodySchema.parse({ messages }).messages);

  it("drops empty messages", () => {
    expect(run([msg("user", "a"), msg("assistant", "  "), msg("user", "b")])).toEqual([{ role: "user", content: "a\n\nb" }]);
  });

  it("joins consecutive messages of the same role", () => {
    expect(run([msg("user", "một"), msg("user", "hai"), msg("assistant", "ừ"), msg("user", "ba")])).toEqual([
      { role: "user", content: "một\n\nhai" },
      { role: "assistant", content: "ừ" },
      { role: "user", content: "ba" },
    ]);
  });

  it("keeps the latest 20 and starts with a user message", () => {
    const messages = Array.from({ length: 20 }, (_, i) => msg(i % 2 === 0 ? "assistant" : "user", `m${i}`));
    messages.push(msg("assistant", "m20"), msg("user", "last"));
    // body limit is 20 messages: use the helper directly with a longer list
    const longer = sanitizeCloneHistory([...messages] as never);
    expect(longer.length).toBeLessThanOrEqual(20);
    expect(longer[0].role).toBe("user");
    expect(longer.at(-1)).toEqual({ role: "user", content: "last" });
  });

  it("does not change plain text", () => {
    expect(run([msg("user", "xin chào 你好 <b>không phải tag</b>")])).toEqual([{ role: "user", content: "xin chào 你好 <b>không phải tag</b>" }]);
  });
});

describe("cloneEffort", () => {
  it("is minimal for ordinary chat", () => {
    for (const t of ["dạo này sao rồi", "kể chuyện vui đi", "loại nhạc nào ông thích", "long time no see", "chào"]) expect(cloneEffort(t), t).toBe("minimal");
  });

  it("is low for a low mood or a heavy topic", () => {
    for (const t of ["nay tui buồn quá", "Mình áp lực lắm", "tui mệt rồi", "tôi sợ", "đang lo chuyện thi", "vừa chia tay", "tui không muốn sống, muốn chết", "stress ghê"]) {
      expect(cloneEffort(t), t).toBe("low");
    }
  });

  it("is low for a long message", () => {
    expect(cloneEffort("a".repeat(221))).toBe("low");
    expect(cloneEffort("a".repeat(220))).toBe("minimal");
  });
});
