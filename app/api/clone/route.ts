import { createIdGenerator, createUIMessageStream, createUIMessageStreamResponse, type ModelMessage } from "ai";
import { NextResponse } from "next/server";
import { CHAT_MAX_CHARS, threadTitle } from "@/lib/ai/chat-prompt";
import { cloneEffort } from "@/lib/ai/clone/effort";
import { CLONE_FORBIDDEN_KIND, CLONE_FORBIDDEN_MESSAGE } from "@/lib/ai/clone/forbidden";
import { cloneBodySchema, sanitizeCloneHistory } from "@/lib/ai/clone/history";
import { cloneInstructionParts } from "@/lib/ai/clone/prompt";
import { AiError, recordUsage, requireProvider } from "@/lib/ai/enrich";
import { aiGate } from "@/lib/ai/gate";
import { writeTutorAnswer, type AnswerOutcome } from "@/lib/ai/tutor/answer";
import { classifyTutorError, tutorErrorMessage } from "@/lib/ai/tutor/errors";
import { toInstructions } from "@/lib/ai/tutor/instructions";
import { tutorModel } from "@/lib/ai/tutor/model";
import { tutorTimer } from "@/lib/ai/tutor/timing";
import { getUser, loadMe } from "@/lib/auth";
import { canUseClone } from "@/lib/clone/access";
import { cloneConfig, type AiProvider } from "@/lib/env";
import { studyDay } from "@/lib/srs/streak";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/**
 * "<name> (bản AI)": a chat companion built from the owner's private profile (env CLONE_PROFILE).
 *
 * STORAGE: each user turn and answer is written to clone_threads / clone_messages through the service role, and admins
 * can read them under /admin/users/[id]?tab=tamsu. The tables are created by migration 20261106000020; until it is
 * applied the writes fail silently and the chat still works. The browser keeps nothing and sends its latest messages
 * with every request. The notice on /tam-su promises the opposite of this storage; see CLAUDE.md before applying it.
 *
 * LOGS: no message text and no profile in any log. Do not log `e` of a failed model call as is: the SDK attaches the
 * request body.
 *
 * ACCESS: only admins and the accounts an admin switched it on for (table clone_access, lib/clone/access.ts). Anyone
 * else gets a 404 before the model is called, and no usage unit is counted (a unit is recorded only after an answer).
 */
export const maxDuration = 60;

const fail = (error: string, status: number, extra?: { kind: string; retryAfter?: number }) =>
  NextResponse.json(
    { error, ...extra },
    { status, headers: extra?.retryAfter ? { "Retry-After": String(Math.ceil(extra.retryAfter)) } : undefined },
  );

/** The largest legitimate request is ~30 000 characters (about 100 KB as UTF-8 JSON); a bigger one is not read at all. */
const MAX_BODY_BYTES = 200_000;

/** Written when the model produced nothing even after a retry (the study tutor's apology talks about "câu hỏi"). */
const CLONE_NO_ANSWER_TEXT = "Xin lỗi, mình chưa nghĩ ra nên nói gì. Bạn nhắn lại giúp mình một lần nữa nhé.";

/** What a failed model call may put in the log: its kind, name and HTTP status. Never the error itself (it holds the prompt). */
function safeErrorInfo(e: unknown) {
  const err = e as { name?: unknown; statusCode?: unknown };
  return {
    name: typeof err?.name === "string" ? err.name : undefined,
    status: typeof err?.statusCode === "number" ? err.statusCode : undefined,
  };
}

/** Warm-up ping, like /api/chat: wakes this function before the first message. No data, no session, no quota. */
export async function GET() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const timer = tutorTimer("clone");
  const tooBig = Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES;
  const [user, body] = await Promise.all([getUser(), tooBig ? null : request.json().catch(() => null)]);
  timer.mark("user");
  if (!user) return fail("Bạn cần đăng nhập.", 401);
  const parsed = cloneBodySchema.safeParse(body);
  const history = parsed.success ? sanitizeCloneHistory(parsed.data.messages) : [];
  if (!parsed.success || history.length === 0 || history[history.length - 1].role !== "user") {
    return fail(`Tin nhắn trống hoặc dài quá ${CHAT_MAX_CHARS} ký tự.`, 400);
  }
  const config = cloneConfig();
  if (!config) return fail("Tính năng chưa bật.", 404);

  const limitFailure = (e: unknown) => {
    const err = classifyTutorError(e);
    if (err.kind === "no_key") console.error("[clone] no AI key on the server");
    if (e instanceof AiError || err.kind !== "unknown") return fail(tutorErrorMessage(err, "clone"), err.kind === "quota" ? 429 : 503, err);
    throw e;
  };
  let provider: AiProvider;
  try {
    provider = requireProvider(); // no I/O
  } catch (e) {
    return limitFailure(e);
  }

  // Access, the name and time zone, and the limits (a separate per-minute bucket; the daily quota is shared with the tutor),
  // all together: the access check adds no wait of its own.
  const [allowed, me, gate] = await Promise.all([
    canUseClone(user).then(
      (ok) => ({ ok, error: null as unknown }),
      (error: unknown) => ({ ok: false, error: error ?? new Error("access check failed") }),
    ),
    loadMe(user),
    aiGate(user.id, "clone", 12, 60).then(
      (g) => ({ allowed: g.allowed, error: null as unknown }),
      (error: unknown) => ({ allowed: true, error: error ?? new Error("aiGate failed") }),
    ),
  ]);
  timer.mark("limits");
  // Checked first: no access means a plain 404 whatever the limits say, and the model is never called.
  if (allowed.error) {
    console.error("[clone] access check failed"); // no error object: nothing but this line
    return fail("Chưa kiểm tra được quyền dùng tính năng này. Thử lại sau một chút nhé.", 503, { kind: "unknown" });
  }
  if (!allowed.ok) return fail(CLONE_FORBIDDEN_MESSAGE, 404, { kind: CLONE_FORBIDDEN_KIND });
  if (!me) return fail("Bạn cần đăng nhập.", 401);
  if (!gate.allowed) return fail("Bạn gửi nhanh quá. Đợi một chút rồi gửi tiếp nhé.", 429, { kind: "rate", retryAfter: 20 });
  if (gate.error) return limitFailure(gate.error);

  const lastText = history[history.length - 1].content;
  const effort = cloneEffort(lastText);
  const parts = cloneInstructionParts({
    name: config.name,
    realName: config.realName,
    profile: config.profile,
    listenerName: me.profile.display_name,
    today: studyDay(new Date(), me.settings.timezone),
    birthday: config.birthday,
    firstTurn: history.length === 1,
  });
  const instructions = toInstructions(provider, parts);
  const messages: ModelMessage[] = history.map((m) => ({ role: m.role, content: m.content }));
  const providerOptions = {
    anthropic: { effort: "low" as const },
    google: { thinkingConfig: { thinkingLevel: effort } },
  };
  const onError = (e: unknown) => {
    const err = classifyTutorError(e);
    console.error("[clone]", { kind: err.kind, ...safeErrorInfo(e) });
    return tutorErrorMessage(err, "clone");
  };
  let outcome: AnswerOutcome = { status: "failed" };
  let hedged = false;
  timer.mark("prelude");

  const threadId = parsed.data.threadId || crypto.randomUUID();
  const rawLastMsg = parsed.data.messages[parsed.data.messages.length - 1];
  const adminSb = createAdminClient();

  const saveUserTurn = async () => {
    try {
      const now = new Date().toISOString();
      const { data: existing } = await adminSb
        .from("clone_threads")
        .select("id")
        .eq("id", threadId)
        .maybeSingle();

      if (!existing) {
        await adminSb.from("clone_threads").insert({
          id: threadId,
          user_id: user.id,
          title: threadTitle(lastText),
          first_message: lastText.slice(0, 200),
          last_message_at: now,
          updated_at: now,
          message_count: 1,
        });
      } else {
        await adminSb
          .from("clone_threads")
          .update({
            last_message_at: now,
            updated_at: now,
          })
          .eq("id", threadId);
      }

      await adminSb.from("clone_messages").upsert(
        {
          thread_id: threadId,
          id: rawLastMsg.id,
          user_id: user.id,
          role: "user",
          content: lastText,
          parts: rawLastMsg.parts as unknown as Json,
          created_at: now,
        },
        { onConflict: "thread_id,id" },
      );
    } catch (e) {
      console.error("[clone] failed to persist user message:", e);
    }
  };
  const saveUserPromise = saveUserTurn();

  const stream = createUIMessageStream({
    generateId: createIdGenerator({ prefix: "msg", size: 16 }),
    onError,
    execute: async ({ writer }) => {
      try {
        outcome = await writeTutorAnswer({
          writer,
          model: tutorModel(provider, { onHedge: () => (hedged = true) }),
          instructions,
          messages,
          tools: {},
          providerOptions,
          retryProviderOptions: { anthropic: { effort: "low" as const }, google: { thinkingConfig: { thinkingLevel: "minimal" as const } } },
          onError,
          maxOutputTokens: 1024, // short chat-style bubbles
          fallbackText: CLONE_NO_ANSWER_TEXT,
          onTiming: timer.mark,
        });
      } finally {
        await saveUserPromise;
      }
    },
    onEnd: async ({ responseMessage }) => {
      // Marks, status, effort and token counts only: no message text, no profile.
      timer.log({ status: outcome.status, effort, turns: history.length, ...(hedged ? { hedged: true } : {}), ...outcome.usage });
      if (outcome.status === "answered") recordUsage(user.id);

      const parts = responseMessage?.parts as Array<{ type: string; text?: string }> | undefined;
      const text = parts
        ?.filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text)
        .join("\n")
        .trim();

      if (text) {
        try {
          const now = new Date().toISOString();
          await adminSb.from("clone_messages").upsert(
            {
              thread_id: threadId,
              id: responseMessage.id,
              user_id: user.id,
              role: "assistant",
              content: text,
              parts: (responseMessage.parts ?? []) as unknown as Json,
              created_at: now,
            },
            { onConflict: "thread_id,id" },
          );

          const { count } = await adminSb
            .from("clone_messages")
            .select("id", { count: "exact", head: true })
            .eq("thread_id", threadId);

          await adminSb
            .from("clone_threads")
            .update({
              last_message_at: now,
              updated_at: now,
              message_count: count ?? 2,
            })
            .eq("id", threadId);
        } catch (e) {
          console.error("[clone] failed to persist assistant message:", e);
        }
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: { "Server-Timing": timer.header(), "Cache-Control": "no-store" },
    // Read a copy to the end, so the answer is still generated (and counted) when the visitor leaves the page.
    consumeSseStream: async ({ stream: copy }) => {
      const reader = copy.getReader();
      while (!(await reader.read()).done) {
        // drain
      }
    },
  });
}
