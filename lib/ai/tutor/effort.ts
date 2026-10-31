export type TutorEffort = "minimal" | "low";

/**
 * Most tutor questions (meaning of a word, how to say X, a quick check) need no deep thinking;
 * "minimal" starts writing much sooner. Heavier asks get "low".
 */
export function tutorEffort(text: string): TutorEffort {
  const t = text.toLowerCase();
  if (t.length > 220) return "low";
  if (/(sửa|chấm|phân biệt|khác nhau|khác gì|so sánh|giải thích kỹ|ngữ pháp|tại sao|vì sao|lộ trình|kế hoạch)/.test(t)) return "low";
  if (/[.!?。！？].+[.!?。！？]/.test(t) && /[a-z一-鿿]{3,}/.test(t)) return "low"; // looks like a paragraph to correct
  return "minimal";
}
