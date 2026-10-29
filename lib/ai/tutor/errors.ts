import { APICallError } from "ai";
import { AiError, isRateLimited } from "@/lib/ai/enrich";

export type TutorErrorKind = "no_key" | "quota" | "rate" | "config" | "timeout" | "unknown";
export type TutorError = { kind: TutorErrorKind; retryAfter?: number };

function findApiError(e: unknown, depth = 0): APICallError | null {
  if (!e || depth > 3) return null;
  if (APICallError.isInstance(e)) return e;
  const err = e as { lastError?: unknown; cause?: unknown };
  return findApiError(err.lastError, depth + 1) ?? findApiError(err.cause, depth + 1);
}

/** Sorts a failure of the tutor call into something the learner can act on. Pure. */
export function classifyTutorError(e: unknown): TutorError {
  if (e instanceof AiError) {
    if (e.code === "not_configured") return { kind: "no_key" };
    if (e.code === "quota_user" || e.code === "quota_global") return { kind: "quota" };
    if (e.code === "busy") return { kind: "rate", retryAfter: e.retryAfter };
  }
  const limit = isRateLimited(e);
  if (limit.limited) return { kind: "rate", retryAfter: limit.retryAfter };
  const api = findApiError(e);
  // 401/403: wrong key; 404: unknown model name; 400: a setting the model rejects.
  if (api?.statusCode && [400, 401, 403, 404].includes(api.statusCode)) return { kind: "config" };
  const name = (e as { name?: unknown })?.name;
  if (name === "TimeoutError" || name === "AbortError" || (e instanceof Error && /timed? ?out/i.test(e.message)))
    return { kind: "timeout" };
  return { kind: "unknown" };
}

/** Friendly Vietnamese text for the chat bubble. */
export function tutorErrorMessage({ kind, retryAfter }: TutorError): string {
  switch (kind) {
    case "rate":
      return retryAfter
        ? `Gia sư đang có nhiều người hỏi. Bạn đợi khoảng ${Math.ceil(retryAfter)} giây rồi bấm "Thử lại" nhé.`
        : 'Gia sư đang có nhiều người hỏi. Đợi chút rồi bấm "Thử lại" nhé.';
    case "quota":
      return "Hôm nay bạn đã dùng hết lượt hỏi gia sư. Mai quay lại nhé.";
    case "no_key":
    case "config":
      return "Gia sư chưa được cấu hình đúng trên máy chủ (khóa AI hoặc tên model). Báo quản trị viên giúp mình nhé.";
    case "timeout":
      return 'Gia sư trả lời lâu quá nên đã dừng. Bấm "Thử lại" nhé.';
    default:
      return 'Gia sư gặp trục trặc khi trả lời. Bấm "Thử lại" nhé.';
  }
}
