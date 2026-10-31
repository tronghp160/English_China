import {
  isStepCount,
  smoothStream,
  streamText,
  toUIMessageStream,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
  type UIMessage,
  type UIMessageChunk,
  type UIMessageStreamWriter,
} from "ai";

/** Shown when the model ends a turn without writing anything, even after the retry. */
export const NO_ANSWER_TEXT = "Xin lỗi, mình chưa nghĩ ra câu trả lời cho câu này. Bạn hỏi lại theo cách khác giúp mình nhé.";

/** Tool rounds before the tutor must write (the last round has tools switched off). */
export const MAX_STEPS = 5;

type ProviderOptions = Parameters<typeof streamText>[0]["providerOptions"];

export type AnswerOutcome = { status: "answered" | "fallback" | "failed"; toolCalls?: number };

/**
 * Streams the tutor's answer into `writer` and makes sure the turn ends with text.
 *
 * Why: Gemini sometimes ends a turn right after a tool result with no text, or spends the
 * whole output budget on thinking. The chat then showed an empty bubble. Here:
 * 1. the last allowed step runs with tools off, so a tool loop cannot eat every step;
 * 2. if the whole turn still produced no text, the model is asked once more with tools off
 *    and the tool results in context (lighter thinking);
 * 3. if that is empty too, a short apology is written so the bubble is never blank.
 * A real error (rate limit, bad key...) is sent as an error chunk and nothing is retried here.
 */
export async function writeTutorAnswer<UI extends UIMessage>(opts: {
  writer: UIMessageStreamWriter<UI>;
  model: LanguageModel;
  instructions: string;
  messages: ModelMessage[];
  tools: ToolSet;
  providerOptions?: ProviderOptions;
  /** Used for the retry: lighter thinking leaves more of the budget for text. */
  retryProviderOptions?: ProviderOptions;
  onError: (error: unknown) => string;
  maxOutputTokens?: number;
  /** Off in tests (smoothStream waits between words). */
  smooth?: boolean;
  /** Stopwatch marks for the route: model_start, first_text, tool_call, retry, done. */
  onTiming?: (name: string) => void;
}): Promise<AnswerOutcome> {
  const { writer, model, instructions, messages, tools, onError } = opts;
  const mark = opts.onTiming ?? (() => {});
  let toolCalls = 0;
  let sawText = false;
  const end = (status: AnswerOutcome["status"]): AnswerOutcome => {
    mark("done");
    return { status, toolCalls };
  };
  const common = {
    model,
    maxRetries: 0, // the model wrapper already falls back on 429; an instant retry only burns quota
    maxOutputTokens: opts.maxOutputTokens ?? 4096, // Gemini counts thinking tokens here too
    timeout: { totalMs: 55_000, chunkMs: 20_000 },
    experimental_transform:
      opts.smooth === false ? undefined : smoothStream({ delayInMs: 10, chunking: new Intl.Segmenter("vi", { granularity: "word" }) }),
    onError: () => {}, // errors reach the client as an error chunk (see pump)
  };

  /** Copies one model stream into the writer; reports whether it carried text or an error. */
  const pump = async (stream: ReadableStream<unknown>) => {
    let text = false;
    let failed = false;
    const reader = (stream as ReadableStream<UIMessageChunk>).getReader();
    for (;;) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      if (chunk.type === "text-delta" && chunk.delta.trim()) {
        text = true;
        if (!sawText) mark("first_text");
        sawText = true;
      }
      if (chunk.type === "tool-input-available") {
        toolCalls++;
        mark("tool_call");
      }
      if (chunk.type === "error") failed = true;
      writer.write(chunk as Parameters<typeof writer.write>[0]);
    }
    return { text, failed };
  };

  mark("model_start");
  const first = streamText({
    ...common,
    instructions,
    messages,
    tools,
    stopWhen: isStepCount(MAX_STEPS),
    prepareStep: ({ stepNumber }) => (stepNumber >= MAX_STEPS - 1 ? { toolChoice: "none" as const } : undefined),
    providerOptions: opts.providerOptions,
  });
  const one = await pump(toUIMessageStream({ stream: first.stream, tools, sendFinish: false, onError }));
  if (one.failed) return end("failed");
  if (one.text) {
    writer.write({ type: "finish" });
    return end("answered");
  }

  // Empty turn: ask again with the tool results in context and tools switched off.
  console.warn("[tutor] empty answer, retrying without tools");
  mark("retry");
  let toolTurns: ModelMessage[] = [];
  try {
    toolTurns = (await first.response).messages;
  } catch {
    // no response messages: retry from the question alone
  }
  const second = streamText({
    ...common,
    instructions: `${instructions}\n\nLượt trước bạn chưa viết gì cho người học. Bây giờ hãy viết câu trả lời đầy đủ bằng chữ, dựa trên kết quả công cụ (nếu có). Không gọi công cụ.`,
    messages: [...messages, ...toolTurns],
    tools,
    toolChoice: "none",
    providerOptions: opts.retryProviderOptions ?? opts.providerOptions,
  });
  const two = await pump(toUIMessageStream({ stream: second.stream, tools, sendStart: false, sendFinish: false, onError }));
  if (two.failed) return end("failed");
  if (!two.text) {
    const id = "tutor-fallback";
    writer.write({ type: "text-start", id });
    writer.write({ type: "text-delta", id, delta: NO_ANSWER_TEXT });
    writer.write({ type: "text-end", id });
    writer.write({ type: "finish" });
    return end("fallback");
  }
  writer.write({ type: "finish" });
  return end("answered");
}
