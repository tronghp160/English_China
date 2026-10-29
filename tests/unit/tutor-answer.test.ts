import { APICallError, createUIMessageStream, readUIMessageStream, simulateReadableStream, tool, type UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { NO_ANSWER_TEXT, writeTutorAnswer, type AnswerOutcome } from "@/lib/ai/tutor/answer";

vi.mock("server-only", () => ({}));

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};
const finish = (unified: "stop" | "tool-calls" | "length") => ({ type: "finish" as const, finishReason: { unified, raw: undefined }, usage });
const textChunks = (text: string) => [
  { type: "text-start" as const, id: "t" },
  { type: "text-delta" as const, id: "t", delta: text },
  { type: "text-end" as const, id: "t" },
];
const toolCall = { type: "tool-call" as const, toolCallId: "c1", toolName: "getStudyFocus", input: JSON.stringify({ kind: "hard" }) };

type Chunk = Record<string, unknown>;
/** A model whose n-th call streams scripts[n] (or throws it). */
function scripted(scripts: (Chunk[] | Error)[]) {
  let call = 0;
  const m = new MockLanguageModelV4({
    doStream: async () => {
      const s = scripts[Math.min(call++, scripts.length - 1)];
      if (s instanceof Error) throw s;
      return { stream: simulateReadableStream({ chunks: s as never }) };
    },
  });
  return { model: m, calls: () => call };
}

const tools = {
  getStudyFocus: tool({
    description: "x",
    inputSchema: z.object({ kind: z.enum(["due", "hard", "recent"]) }),
    execute: async () => ({ words: [{ term: "坚强", meaning_vi: "kiên cường" }] }),
  }),
};

async function run(model: MockLanguageModelV4) {
  let outcome: AnswerOutcome | undefined;
  const stream = createUIMessageStream<UIMessage>({
    execute: async ({ writer }) => {
      outcome = await writeTutorAnswer({
        writer,
        model,
        instructions: "be a tutor",
        messages: [{ role: "user", content: "Mình muốn luyện hội thoại với từ hay quên" }],
        tools,
        onError: () => "lỗi",
        smooth: false,
      });
    },
  });
  let last: UIMessage | undefined;
  let error: string | undefined;
  for await (const m of readUIMessageStream({ stream, onError: (e) => (error = String(e)) })) last = m;
  const text = (last?.parts ?? []).filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("");
  return { outcome, text, parts: last?.parts.map((p) => p.type) ?? [], error };
}

describe("writeTutorAnswer", () => {
  it("passes a normal answer through", async () => {
    const { model, calls } = scripted([[...textChunks("Chào bạn"), finish("stop")]]);
    const r = await run(model);
    expect(r.text).toBe("Chào bạn");
    expect(r.outcome?.status).toBe("answered");
    expect(calls()).toBe(1);
  });

  it("answers after a tool call", async () => {
    const { model } = scripted([[toolCall, finish("tool-calls")], [...textChunks("Mình bắt đầu nhé"), finish("stop")]]);
    const r = await run(model);
    expect(r.text).toBe("Mình bắt đầu nhé");
    expect(r.parts).toContain("tool-getStudyFocus");
  });

  it("retries once without tools when the turn ends with no text (the empty bubble)", async () => {
    const { model, calls } = scripted([
      [toolCall, finish("tool-calls")],
      [finish("stop")], // Gemini: nothing after the tool result
      [...textChunks("Tình huống: ở quán cà phê"), finish("stop")],
    ]);
    const r = await run(model);
    expect(calls()).toBe(3);
    expect(r.text).toBe("Tình huống: ở quán cà phê");
    expect(r.outcome?.status).toBe("answered");
  });

  it("retries when thinking used the whole budget", async () => {
    const { model } = scripted([[finish("length")], [...textChunks("Đây"), finish("stop")]]);
    expect((await run(model)).text).toBe("Đây");
  });

  it("never leaves the bubble blank", async () => {
    const { model } = scripted([[finish("stop")], [finish("stop")]]);
    const r = await run(model);
    expect(r.text).toBe(NO_ANSWER_TEXT);
    expect(r.outcome?.status).toBe("fallback");
  });

  it("stops on a real error without retrying", async () => {
    const err = new APICallError({ message: "bad key", url: "x", requestBodyValues: {}, statusCode: 401, responseBody: "bad" });
    const { model, calls } = scripted([err]);
    const r = await run(model);
    expect(r.outcome?.status).toBe("failed");
    expect(calls()).toBe(1);
    expect(r.text).toBe("");
  });

  it("switches tools off on the last step", async () => {
    // A model that keeps calling tools: the 5th step must run with toolChoice none.
    const choices: unknown[] = [];
    let n = 0;
    const model = new MockLanguageModelV4({
      doStream: async (opts) => {
        choices.push(opts.toolChoice);
        n++;
        const chunks = n < 5 ? [{ ...toolCall, toolCallId: `c${n}` }, finish("tool-calls")] : [...textChunks("xong"), finish("stop")];
        return { stream: simulateReadableStream({ chunks: chunks as never }) };
      },
    });
    const r = await run(model);
    expect(r.text).toBe("xong");
    expect(choices.at(-1)).toEqual({ type: "none" });
  });
});
