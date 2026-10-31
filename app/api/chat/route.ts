import { convertToModelMessages, createIdGenerator, createUIMessageStream, createUIMessageStreamResponse, validateUIMessages } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CHAT_HISTORY_LIMIT, CHAT_MAX_CHARS, threadTitle, tutorInstructions } from "@/lib/ai/chat-prompt";
import { chatTools, type ChatMessage } from "@/lib/ai/chat-tools";
import { AiError, checkQuota, recordUsage, requireProvider } from "@/lib/ai/enrich";
import { writeTutorAnswer, type AnswerOutcome } from "@/lib/ai/tutor/answer";
import { classifyTutorError, tutorErrorMessage } from "@/lib/ai/tutor/errors";
import { learnerSnapshot } from "@/lib/ai/tutor/learner";
import { tutorModel } from "@/lib/ai/tutor/model";
import { pageContextLine } from "@/lib/ai/tutor/page-context";
import { tutorTimer } from "@/lib/ai/tutor/timing";
import { getMe } from "@/lib/auth";
import type { AiProvider } from "@/lib/env";
import { hitRateLimit } from "@/lib/rate-limit";
import { studyDay } from "@/lib/srs/streak";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { readPrefs } from "@/lib/validation";

export const maxDuration = 60;

/** The client sends only the new user message (useChat prepareSendMessagesRequest); history is loaded here. */
const bodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().min(1).max(64),
    role: z.literal("user"),
    parts: z
      .array(z.object({ type: z.literal("text"), text: z.string().trim().min(1).max(CHAT_MAX_CHARS) }))
      .length(1),
  }),
  context: z.object({ path: z.string().max(200) }).optional(),
});

// Some thinking makes answers smarter; "low" keeps it quick. The retry after an empty turn thinks less.
const PROVIDER_OPTIONS = {
  anthropic: { effort: "low" as const },
  google: { thinkingConfig: { thinkingLevel: "low" as const } },
};
const RETRY_PROVIDER_OPTIONS = {
  anthropic: { effort: "low" as const },
  google: { thinkingConfig: { thinkingLevel: "minimal" as const } },
};

const fail = (error: string, status: number, extra?: { kind: string; retryAfter?: number }) =>
  NextResponse.json(
    { error, ...extra },
    { status, headers: extra?.retryAfter ? { "Retry-After": String(Math.ceil(extra.retryAfter)) } : undefined },
  );

export async function POST(request: Request) {
  const timer = tutorTimer();
  const [me, body] = await Promise.all([getMe(), request.json().catch(() => null)]);
  timer.mark("auth");
  if (!me) return fail("Bạn cần đăng nhập.", 401);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail(`Tin nhắn trống hoặc dài quá ${CHAT_MAX_CHARS} ký tự.`, 400);
  const { id: threadId, message, context } = parsed.data;
  const text = message.parts[0].text;

  const limitFailure = (e: unknown) => {
    const err = classifyTutorError(e);
    if (err.kind === "no_key") console.error("[tutor] no AI key on the server");
    if (e instanceof AiError || err.kind !== "unknown") return fail(tutorErrorMessage(err), err.kind === "quota" ? 429 : 503, err);
    throw e;
  };
  let provider: AiProvider;
  try {
    provider = requireProvider(); // no I/O
  } catch (e) {
    return limitFailure(e);
  }

  const supabase = await createClient();
  // The context needs only the thread id and the user, so it loads alongside the checks below;
  // when a check fails it is simply dropped (a few wasted reads).
  const contextPromise = Promise.all([
    supabase
      .from("chat_messages")
      .select("id, role, parts")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(CHAT_HISTORY_LIMIT),
    learnerSnapshot(supabase, me.settings.study_langs),
    context?.path ? pageContextLine(supabase, context.path) : Promise.resolve(null),
  ]);
  contextPromise.catch(() => {}); // awaited below; this only avoids an unhandled rejection on an early return

  // One round for the thread and both limits. A request for a missing thread now also counts
  // towards the rate limit (acceptable). The error order stays 404 → rate → quota.
  const [{ data: thread }, allowed, quotaError] = await Promise.all([
    supabase.from("chat_threads").select("id, language, deck_id, title, deck:decks(name, language)").eq("id", threadId).maybeSingle(),
    hitRateLimit(me.user.id, "chat", 12, 60),
    // the unit is recorded only once an answer was written (onEnd)
    checkQuota(me.user.id).then(
      () => null,
      (e: unknown) => e ?? new Error("checkQuota failed"),
    ),
  ]);
  timer.mark("limits");
  if (!thread) return fail("Không tìm thấy cuộc trò chuyện.", 404);
  if (!allowed) return fail("Bạn gửi nhanh quá. Đợi một chút rồi gửi tiếp nhé.", 429, { kind: "rate", retryAfter: 20 });
  if (quotaError) return limitFailure(quotaError);

  const userMessage: ChatMessage = { id: message.id, role: "user", parts: [{ type: "text", text }] };
  // Saved concurrently with the model call; awaited before the answer is stored, so the question
  // still survives a failed answer (retry keeps the same id) and stays before the answer in time.
  const saveUser = Promise.all([
    supabase.from("chat_messages").upsert(
      { thread_id: threadId, id: message.id, user_id: me.user.id, role: "user", parts: userMessage.parts as unknown as Json },
      { onConflict: "thread_id,id", ignoreDuplicates: true },
    ),
    supabase
      .from("chat_threads")
      .update({ updated_at: new Date().toISOString(), ...(thread.title ? {} : { title: threadTitle(text) }) })
      .eq("id", threadId),
  ]).then(
    ([saved, touched]) => {
      if (saved.error) console.error("[tutor] save user", saved.error.message);
      if (touched.error) console.error("[tutor] touch thread", touched.error.message);
    },
    (e: unknown) => console.error("[tutor] save user", e),
  );

  const [{ data: rows }, snapshot, pageContext] = await contextPromise;
  timer.mark("context");
  const history = (rows ?? [])
    .reverse()
    .filter((r) => r.id !== message.id)
    .map((r) => ({ id: r.id, role: r.role, parts: r.parts }) as unknown as ChatMessage);

  const tools = chatTools(supabase, { language: thread.language, deckId: thread.deck_id, deckLanguage: thread.deck?.language });
  let messages: ChatMessage[];
  try {
    messages = await validateUIMessages<ChatMessage>({ messages: [...history, userMessage], tools });
  } catch (e) {
    // Stored history no longer matches the tool schemas: answer from this message alone.
    console.error("[tutor] history", e);
    messages = [userMessage];
  }
  // Empty assistant turns from before this fix carry nothing for the model.
  messages = messages.filter((m) => m.role !== "assistant" || m.parts.some((p) => p.type === "text" && p.text.trim()));

  const prefs = readPrefs(me.settings.prefs);
  const instructions = tutorInstructions({
    language: thread.language,
    learnerName: me.profile.display_name,
    deckName: thread.deck?.name,
    tutorName: prefs.mascot ? prefs.mascot_name : null,
    snapshot,
    firstTurn: history.length === 0,
    today: studyDay(new Date(), me.settings.timezone),
    pageContext,
  });
  const modelMessages = await convertToModelMessages(messages);
  const onError = (e: unknown) => {
    const err = classifyTutorError(e);
    console.error("[tutor]", { userId: me.user.id, threadId, kind: err.kind }, e);
    return tutorErrorMessage(err);
  };
  let outcome: AnswerOutcome = { status: "failed" };
  timer.mark("prelude");

  const stream = createUIMessageStream<ChatMessage>({
    originalMessages: messages,
    generateId: createIdGenerator({ prefix: "msg", size: 16 }),
    onError,
    execute: async ({ writer }) => {
      try {
        outcome = await writeTutorAnswer({
          writer,
          model: tutorModel(provider),
          instructions,
          messages: modelMessages,
          tools,
          providerOptions: PROVIDER_OPTIONS,
          retryProviderOptions: RETRY_PROVIDER_OPTIONS,
          onError,
          onTiming: timer.mark,
        });
      } finally {
        await saveUser; // onEnd, which stores the answer, runs after execute
      }
    },
    onEnd: async ({ responseMessage }) => {
      timer.log({ threadId, status: outcome.status, toolCalls: outcome.toolCalls ?? 0 });
      const hasText = responseMessage.parts.some((p) => p.type === "text" && p.text.trim());
      if (!hasText) return; // failed turns are not stored (the question is; "Thử lại" answers it)
      if (outcome.status === "answered") recordUsage(me.user.id);
      await supabase.from("chat_messages").upsert(
        {
          thread_id: threadId,
          id: responseMessage.id,
          user_id: me.user.id,
          role: "assistant",
          parts: responseMessage.parts as unknown as Json,
        },
        { onConflict: "thread_id,id" },
      );
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: { "Server-Timing": timer.header() }, // prelude marks only (sent before the stream starts)
    // Read a copy to the end, so the answer is still generated and saved when the user leaves the page.
    consumeSseStream: async ({ stream: copy }) => {
      const reader = copy.getReader();
      while (!(await reader.read()).done) {
        // drain
      }
    },
  });
}
