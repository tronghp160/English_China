import { createIdGenerator, createUIMessageStream, createUIMessageStreamResponse, type ModelMessage } from "ai";
import { NextResponse } from "next/server";
import { CHAT_MAX_CHARS } from "@/lib/ai/chat-prompt";
import { cloneEffort } from "@/lib/ai/clone/effort";
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
import { cloneConfig, type AiProvider } from "@/lib/env";
import { studyDay } from "@/lib/srs/streak";

/**
 * "<name> (bản AI)": a chat companion built from the owner's private profile (env CLONE_PROFILE).
 *
 * PRIVACY (decisions in PLAN-tam-su-va-gia-su.md section 1): the conversation lives only in the visitor's browser,
 * which sends its latest messages with every request. This route stores nothing: no database write of any kind (the
 * only counter is the AI usage unit, no text), no message text and no profile in any log, and it is in neither the
 * admin pages nor the account export. Do not log `e` of a failed model call as is: the SDK attaches the request body.
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

  // The name and time zone, and the limits (a separate per-minute bucket; the daily quota is shared with the tutor).
  const [me, gate] = await Promise.all([
    loadMe(user),
    aiGate(user.id, "clone", 12, 60).then(
      (g) => ({ allowed: g.allowed, error: null as unknown }),
      (error: unknown) => ({ allowed: true, error: error ?? new Error("aiGate failed") }),
    ),
  ]);
  timer.mark("limits");
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

  const stream = createUIMessageStream({
    generateId: createIdGenerator({ prefix: "msg", size: 16 }),
    onError,
    execute: async ({ writer }) => {
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
    },
    onEnd: () => {
      // Marks, status, effort and token counts only: no message text, no profile.
      timer.log({ status: outcome.status, effort, turns: history.length, ...(hedged ? { hedged: true } : {}), ...outcome.usage });
      if (outcome.status === "answered") recordUsage(user.id);
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
