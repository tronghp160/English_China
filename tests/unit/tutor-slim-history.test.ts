import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@/lib/ai/chat-tools";
import { slimHistory } from "@/lib/ai/tutor/slim-history";

const user = (id: string, text: string) => ({ id, role: "user", parts: [{ type: "text", text }] }) as ChatMessage;
const tutor = (id: string, parts: unknown[]) => ({ id, role: "assistant", parts }) as ChatMessage;
const lookup = { type: "tool-lookupWord", toolCallId: "c", state: "output-available", input: { term: "x" }, output: { found: false } };

describe("slimHistory", () => {
  it("drops tool parts from older answers and keeps the last answer whole", () => {
    const out = slimHistory([
      user("u1", "apple?"),
      tutor("a1", [{ type: "step-start" }, lookup, { type: "text", text: "quả táo" }]),
      user("u2", "đố mình"),
      tutor("a2", [{ type: "step-start" }, lookup, { type: "text", text: "Câu 1" }]),
      user("u3", "là A"),
    ]);
    expect(out.map((m) => m.id)).toEqual(["u1", "a1", "u2", "a2", "u3"]);
    expect(out[1].parts).toEqual([{ type: "text", text: "quả táo" }]);
    expect(out[3].parts.map((p) => p.type)).toEqual(["step-start", "tool-lookupWord", "text"]);
  });

  it("removes answers that have no text", () => {
    const out = slimHistory([user("u1", "hi"), tutor("a1", [lookup]), user("u2", "lại"), tutor("a2", [{ type: "text", text: " " }])]);
    expect(out.map((m) => m.id)).toEqual(["u1", "u2"]);
  });
});
