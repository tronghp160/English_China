export type TutorEffort = "minimal" | "low";

const HEAVY_WORK = /(\b(ielts|writing|speaking|task\s*[12]|band)\b|viết đoạn|viết bài|dịch đoạn|đoạn văn|chữa bài|vì sao sai)/;
const QUICK_LOOKUP = /(nghĩa là gì|là gì|đọc thế nào|phát âm|dùng thế nào)/;

/**
 * Most tutor questions (meaning of a word, how to say X, a quick check) need no deep thinking;
 * "minimal" starts writing much sooner. Heavier asks get "low".
 */
export function tutorEffort(text: string): TutorEffort {
  const t = text.toLowerCase();
  if (t.length > 220) return "low";
  if (/(sửa|chấm|phân biệt|khác nhau|khác gì|so sánh|giải thích kỹ|ngữ pháp|tại sao|vì sao|lộ trình|kế hoạch)/.test(t)) return "low";
  // Exam writing, speaking and longer rewrites. A plain "writing nghĩa là gì" is still a quick word question.
  if (HEAVY_WORK.test(t) && !(t.length <= 40 && QUICK_LOOKUP.test(t))) return "low";
  if (/[.!?。！？].+[.!?。！？]/.test(t) && /[a-z一-鿿]{3,}/.test(t)) return "low"; // looks like a paragraph to correct
  return "minimal";
}
