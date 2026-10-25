import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CHAT_HISTORY_LIMIT, CHAT_MAX_CHARS, threadTitle, tutorInstructions } from "@/lib/ai/chat-prompt";
import { chatTools, type ChatMessage } from "@/lib/ai/chat-tools";
import { AiError, checkQuota, model, recordUsage, requireProvider } from "@/lib/ai/enrich";
import { AI_ERROR_STATUS } from "@/lib/ai/http";
import { getMe } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { hitRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export const maxDuration = 60;

/** The client sends only the new user message (useChat prepareSendMessagesRequest); history is loaded here. */
const bodySchema = z.object({
  id: z.uuid(),
  message: z.object({
    id: z.string().min(1).max(64),
    role: z.literal("user"),
    parts: z
      .array(z.object({ type: z.literal("text"), text: z.string().trim().min(1).max(CHAT_MAX_CHARS) }))
      .length(1),
  }),
});

// Short answers matter more than deep thinking for a chat turn.
const PROVIDER_OPTIONS = {
  anthropic: { effort: "low" as const },
  google: { thinkingConfig: { thinkingLevel: "low" as const } },
};

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const me = await getMe();
  if (!me) return fail("Bạn cần đăng nhập.", 401);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(`Tin nhắn trống hoặc dài quá ${CHAT_MAX_CHARS} ký tự.`, 400);
  const { id: threadId, message } = parsed.data;
  const text = message.parts[0].text;

  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id, language, deck_id, title, deck:decks(name)")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) return fail("Không tìm thấy cuộc trò chuyện.", 404);

  if (!(await hitRateLimit(me.user.id, "chat", 12, 60)))
    return fail("Bạn gửi nhanh quá. Đợi một chút rồi gửi tiếp nhé.", 429);

  let provider;
  try {
    provider = requireProvider();
    await checkQuota(me.user.id);
    recordUsage(me.user.id); // one unit per message, answered or not
  } catch (e) {
    if (e instanceof AiError) return fail(e.message, AI_ERROR_STATUS[e.code]);
    throw e;
  }

  const { data: rows } = await supabase
    .from("chat_messages")
    .select("id, role, parts")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(CHAT_HISTORY_LIMIT);
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

  const tools = chatTools(supabase, { language: thread.language, deckId: thread.deck_id });
  let messages: ChatMessage[];
  try {
    messages = await validateUIMessages<ChatMessage>({ messages: [...history, userMessage], tools });
  } catch (e) {
    // Stored history no longer matches the tool schemas: answer from this message alone.
    console.error("[api/chat] history", e);
    messages = [userMessage];
  }

  const result = streamText({
    // A separate Gemini model keeps the tutor off the word-suggestion per-model limit.
    model: model(provider, (provider.provider === "google" && serverEnv().AI_MODEL_CHAT_GOOGLE) || provider.model),
    instructions: tutorInstructions({
      language: thread.language,
      learnerName: me.profile.display_name,
      deckName: thread.deck?.name,
    }),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(4),
    maxOutputTokens: 1500,
    providerOptions: PROVIDER_OPTIONS,
  });
  // Keep generating (and saving) when the user leaves the page mid-answer.
  void result.consumeStream();

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
      onError: (e) => {
        console.error("[api/chat]", e);
        return "Gia sư đang bận. Thử gửi lại sau ít phút nhé.";
      },
      onEnd: async ({ responseMessage }) => {
        if (!responseMessage.parts.length) return;
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
    }),
  });
}
