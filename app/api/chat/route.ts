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
  const me = await getMe();
  timer.mark("auth");
  if (!me) return fail("Bạn cần đăng nhập.", 401);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(`Tin nhắn trống hoặc dài quá ${CHAT_MAX_CHARS} ký tự.`, 400);
  const { id: threadId, message, context } = parsed.data;
  const text = message.parts[0].text;

  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id, language, deck_id, title, deck:decks(name, language)")
    .eq("id", threadId)
    .maybeSingle();
  timer.mark("thread");
  if (!thread) return fail("Không tìm thấy cuộc trò chuyện.", 404);

  if (!(await hitRateLimit(me.user.id, "chat", 12, 60)))
    return fail("Bạn gửi nhanh quá. Đợi một chút rồi gửi tiếp nhé.", 429, { kind: "rate", retryAfter: 20 });

  let provider;
  try {
    provider = requireProvider();
    await checkQuota(me.user.id); // the unit is recorded only once an answer was written (onEnd)
  } catch (e) {
    const err = classifyTutorError(e);
    if (err.kind === "no_key") console.error("[tutor] no AI key on the server");
    if (e instanceof AiError || err.kind !== "unknown") return fail(tutorErrorMessage(err), err.kind === "quota" ? 429 : 503, err);
    throw e;
  }
  timer.mark("limits");

  const [{ data: rows }, snapshot, pageContext] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("id, role, parts")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(CHAT_HISTORY_LIMIT),
    learnerSnapshot(supabase, me.settings.study_langs),
    context?.path ? pageContextLine(supabase, context.path) : Promise.resolve(null),
  ]);
  timer.mark("context");
  const history = (rows ?? [])
    .reverse()
    .filter((r) => r.id !== message.id)
    .map((r) => ({ id: r.id, role: r.role, parts: r.parts }) as unknown as ChatMessage);

  const userMessage: ChatMessage = { id: message.id, role: "user", parts: [{ type: "text", text }] };
  // Saved before the model runs, so the question survives a failed answer (retry keeps the same id).
  await supabase.from("chat_messages").upsert(
    { thread_id: threadId, id: message.id, user_id: me.user.id, role: "user", parts: userMessage.parts as unknown as Json },
    { onConflict: "thread_id,id", ignoreDuplicates: true },
  );
  await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString(), ...(thread.title ? {} : { title: threadTitle(text) }) })
    .eq("id", threadId);
  timer.mark("saved");

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
