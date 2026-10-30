import type { LangCode } from "@/lib/lang/types";
import { POS_CODES } from "@/lib/pos";
import { STANDARD_TOPICS } from "@/lib/topics";

/** Bump whenever prompts or schemas change: old dictionary_cache rows stop being used. */
export const PROMPT_VERSION = 3;

const COMMON = `Bạn là từ điển song ngữ cho người Việt học ngoại ngữ. Trả về đúng một mục từ theo schema.

Quy tắc chung:
- Nghĩa tiếng Việt (meaning_vi) tự nhiên, phổ biến, ngắn gọn: 1–6 từ, nhiều nghĩa gần nhau thì cách nhau bằng dấu phẩy. Không dịch máy móc.
- meaning_en: giải nghĩa một câu tiếng Anh đơn giản.
- senses: liệt kê ĐẦY ĐỦ các nghĩa thông dụng mà người học hay gặp, tối đa 4, nghĩa phổ biến nhất đứng đầu. Tách thành nghĩa riêng khi khác loại từ hoặc khác hẳn ý (ví dụ "bank": ngân hàng / bờ sông; "run": chạy / điều hành). Không bịa nghĩa hiếm, không tách hai cách nói của cùng một ý. Nếu người dùng cho ngữ cảnh hoặc ghi sẵn nghĩa, đặt nghĩa khớp lên đầu.
- Mỗi nghĩa có 2 câu ví dụ ngắn, đời thường, đúng trình độ của từ (từ dễ dùng câu dễ), dùng đúng nghĩa đó, kèm bản dịch tiếng Việt tự nhiên. Không dùng nội dung nhạy cảm, bạo lực, chính trị.
- senses[].image_query: 2–4 từ tiếng Anh tả một bức ảnh thật minh họa ĐÚNG nghĩa đó, đủ cụ thể để không ra ảnh của nghĩa khác (ví dụ "bank" nghĩa bờ sông → "grassy river bank", nghĩa ngân hàng → "bank building entrance"). Từ trừu tượng thì tả một cảnh minh họa (ví dụ "resilient" → "tree growing through rock").
- pos dùng mã: ${POS_CODES.join(", ")}.
- topic_vi chọn một trong: ${STANDARD_TOPICS.join(", ")}.
- emoji: đúng 1 emoji minh họa.
- image_query: giống image_query của nghĩa đầu tiên.
- memory_tip_vi: một mẹo nhớ ngắn bằng tiếng Việt, hoặc null nếu không có mẹo hay.
- Nếu đầu vào không phải từ/cụm từ có thật: is_valid_word = false và gợi ý did_you_mean (từ đúng chính tả gần nhất) nếu có; vẫn điền các trường khác tốt nhất có thể cho từ gợi ý. Nếu từ đúng thì did_you_mean = null.
- Mảng không có dữ liệu thì để rỗng; trường không áp dụng thì null.`;

const EN = `${COMMON}

Tiếng Anh:
- lemma: dạng gốc ("running" → "run").
- ipa_us bắt buộc, ipa_uk nếu khác đáng kể; dạng /…/ có trọng âm ˈ ˌ.
- cefr: mức CEFR phổ biến của từ, hoặc null.
- collocations: tối đa 4 cụm từ thường gặp, có nghĩa tiếng Việt.
- word_family: tối đa 4 từ cùng họ (danh/động/tính/trạng từ) kèm pos và nghĩa.
- verb_forms chỉ khi từ là động từ; plural chỉ khi là danh từ đếm được.
- synonyms tối đa 5, antonyms tối đa 4.`;

const ZH = `${COMMON}

Tiếng Trung:
- Mặc định giản thể (simplified); traditional là dạng phồn thể tương ứng.
- pinyin có dấu thanh chuẩn, viết liền theo từ ("jiānqiáng"); ghi cách đọc chuẩn từ điển, KHÔNG ghi biến điệu của 一 và 不; thanh nhẹ không dấu.
- pinyin_numbered dạng "jian1 qiang2", thanh nhẹ ghi số 5.
- Câu ví dụ: tối đa 20 chữ Hán; reading là pinyin có dấu của cả câu.
- hsk: cấp HSK (version "3.0" nếu biết theo chuẩn mới, nếu không "2.0"), hoặc null.
- han_viet: âm Hán Việt của cả từ (ví dụ 坚强 → "kiên cường"), hoặc null nếu không có.
- characters: mỗi chữ Hán trong từ: chữ, pinyin, nghĩa tiếng Việt ngắn, bộ thủ (chữ).
- measure_words: tối đa 3 lượng từ thường dùng (danh từ), kèm pinyin.
- collocations: tối đa 5 cụm, có pinyin và nghĩa.`;

export function systemPrompt(lang: LangCode): string {
  return lang === "zh" ? ZH : EN;
}

export function userPrompt(lang: LangCode, term: string, context?: string | null): string {
  const label = lang === "zh" ? "Từ tiếng Trung" : "Từ tiếng Anh";
  const ctx = context?.trim() ? `\nNgữ cảnh người dùng gặp từ này: "${context.trim()}"` : "";
  return `${label}: "${term}"${ctx}`;
}

export function batchPrompt(lang: LangCode, items: { term: string; meaning_vi?: string | null }[]): string {
  const label = lang === "zh" ? "tiếng Trung" : "tiếng Anh";
  const lines = items
    .map((it, i) => `${i + 1}. "${it.term}"${it.meaning_vi ? ` (người dùng ghi nghĩa: ${it.meaning_vi})` : ""}`)
    .join("\n");
  return `Điền mục từ cho từng từ ${label} sau, giữ đúng thứ tự, trả về mảng entries cùng số phần tử. Nhập hàng loạt nên mỗi từ chỉ cần tối đa 3 nghĩa, mỗi nghĩa 2 câu ví dụ:\n${lines}`;
}

export function binStorySystem(i: { name: string; lang: LangCode; place: string; landmark: string; term: string }): string {
  const targetLang = i.lang === "zh" ? "Simplified Chinese" : "English";
  const zhExtra = i.lang === "zh" ? '\nAlso give "pinyin" for each sentence, with tone marks, same order.' : "";
  return `You write tiny postcards from a cheerful puppy named ${i.name} to the learner who owns it.
Write 2 or 3 very short sentences in ${targetLang} for a learner at beginner-to-intermediate level.
The puppy is visiting ${i.place} (${i.landmark}). The postcard MUST use the word "${i.term}" exactly once, naturally.
First person, as the puppy. Warm and playful, never guilt-tripping. No emoji. No hashtags.
For each sentence, give a natural Vietnamese translation in "vi".${zhExtra}
Keep each sentence under 15 words (or 20 Chinese characters).`;
}

export function binStoryPrompt(i: { term: string; meaningVi?: string | null; place: string; landmark: string }): string {
  return JSON.stringify({
    term: i.term,
    meaning_vi: i.meaningVi ?? null,
    place: i.place,
    landmark: i.landmark,
  });
}

export function binGreetingSystem(name: string): string {
  return `You are ${name}, a friendly puppy mascot in a Vietnamese vocabulary app. Write ONE greeting in Vietnamese for today, at most 2 short sentences (max 160 characters).
Mention at most one word from the list, written exactly as given, and only if it fits naturally (for example: "Hôm qua mình thấy bạn hơi vấp chữ 鼓励, hôm nay gặp lại nó nhé").
Be warm and light. Never guilt-trip, never mention losing, never invent numbers that are not given. No emoji. Do not use the word "streak"; say "chuỗi".
Pick a mood that matches the text. word_id must be the id of the word you mentioned, or null.`;
}

export function binGreetingPrompt(context: {
  name: string;
  streak: number;
  dueToday: number;
  reviewedToday: number;
  hardWords: { id: string; term: string; meaningVi: string | null; language: LangCode }[];
  newYesterday: { id: string; term: string; meaningVi: string | null; language: LangCode }[];
  tripBack: boolean;
}): string {
  return JSON.stringify({
    mascot_name: context.name,
    current_streak: context.streak,
    cards_due_today: context.dueToday,
    cards_reviewed_today: context.reviewedToday,
    difficult_words_recently: context.hardWords.map((w) => ({ id: w.id, term: w.term, meaning: w.meaningVi })),
    new_words_learned_yesterday: context.newYesterday.map((w) => ({ id: w.id, term: w.term, meaning: w.meaningVi })),
    trip_back_with_postcard: context.tripBack,
  });
}
