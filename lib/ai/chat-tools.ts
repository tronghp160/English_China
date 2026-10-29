import "server-only";
import { tool, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
import { lookupBest } from "@/lib/ai/lookup";
import { summarizeEntry } from "@/lib/ai/tutor/summarize";
import type { LangCode } from "@/lib/lang/types";
import { searchMyWords } from "@/lib/search";
import type { ServerSupabase } from "@/lib/supabase/server";

type StoredWord = { term: string; reading: string | null; meaning_vi: string };

const languageInput = z
  .enum(["en", "zh"])
  .optional()
  .describe('Ngôn ngữ của từ đang nói tới: "en" tiếng Anh, "zh" tiếng Trung. Bỏ trống = ngôn ngữ của cuộc trò chuyện.');

/**
 * Tools of the study tutor. They read through the signed-in user's client, so RLS
 * still decides what is visible. None of them writes: adding a word goes through
 * the normal add-word form after the user taps the card.
 * Every tool takes an optional language, because one thread can touch both languages.
 */
export function chatTools(supabase: ServerSupabase, ctx: { language: LangCode; deckId: string | null; deckLanguage?: LangCode | null }) {
  const pick = (l?: LangCode) => l ?? ctx.language;
  // The thread's deck only narrows words of its own language.
  const deckFor = (l: LangCode) => (ctx.deckId && (ctx.deckLanguage ?? ctx.language) === l ? ctx.deckId : null);

  return {
    lookupWord: tool({
      description:
        "Tra một từ trong từ điển đã kiểm chứng: nghĩa tiếng Việt, loại từ, phiên âm (IPA/pinyin), cấp độ, ví dụ, âm Hán Việt, lượng từ. Dùng khi không chắc về một từ.",
      inputSchema: z.object({
        term: z.string().trim().min(1).max(60).describe("Từ cần tra, dạng gốc (tiếng Anh) hoặc chữ Hán giản thể"),
        language: languageInput,
      }),
      inputExamples: [{ input: { term: "resilient", language: "en" } }, { input: { term: "坚强", language: "zh" } }],
      execute: async ({ term, language }) => {
        const l = pick(language);
        const { result, source } = await lookupBest(l, term);
        if (!result) return { found: false as const, term, language: l };
        return { found: true as const, language: l, source, entry: summarizeEntry(result) };
      },
    }),

    searchMyWords: tool({
      description: "Tìm trong sổ từ của người học (các bộ từ họ đang học) theo từ, nghĩa tiếng Việt hoặc pinyin không dấu.",
      inputSchema: z.object({
        query: z.string().trim().min(1).max(80).describe("Từ hoặc một phần nghĩa tiếng Việt"),
        language: languageInput,
      }),
      execute: async ({ query, language }) => {
        const l = pick(language);
        const { words } = await searchMyWords(supabase, query, { language: l, limit: 8 });
        return { language: l, found: words.map(({ term, reading, meaning_vi, deck }) => ({ term, reading, meaning_vi, deck })) };
      },
    }),

    getStudyFocus: tool({
      description:
        "Lấy từ của người học để luyện: due = đến hạn ôn, hard = hay quên, recent = mới thêm. Trả về từ, phiên âm, nghĩa và số lần quên.",
      inputSchema: z.object({
        kind: z.enum(["due", "hard", "recent"]),
        limit: z.number().int().min(1).max(10).optional().describe("Mặc định 5"),
        language: languageInput,
      }),
      execute: async ({ kind, limit, language }) => {
        const l = pick(language);
        const { data } = await supabase.rpc("practice_words", {
          // null = every deck the user studies (the RPC handles it)
          p_deck_id: deckFor(l) as string,
          p_language: l,
          p_source: kind,
          p_limit: limit ?? 5,
        });
        return {
          language: l,
          words: (data ?? []).map((row) => {
            const w = row.word as unknown as StoredWord;
            return { term: w.term, reading: w.reading, meaning_vi: w.meaning_vi, lapses: row.lapses };
          }),
        };
      },
    }),

    suggestWord: tool({
      description:
        "Hiện thẻ \"Thêm vào sổ\" cho một từ mới hữu ích mà người học chưa có. Không lưu gì; người học tự bấm để mở form thêm từ.",
      inputSchema: z.object({
        term: z.string().trim().min(1).max(80),
        reading: z.string().trim().max(80).optional().describe("IPA hoặc pinyin có dấu"),
        meaning_vi: z.string().trim().min(1).max(120),
        language: languageInput,
      }),
      execute: async ({ language, ...input }) => {
        const l = pick(language);
        const { data } = await supabase.rpc("my_decks");
        const decks = (data ?? []).filter((d) => d.language === l && d.relation === "own");
        // The thread's own deck first, then the rest.
        decks.sort((a, b) => Number(b.id === ctx.deckId) - Number(a.id === ctx.deckId));
        return { ...input, language: l, decks: decks.slice(0, 6).map((d) => ({ id: d.id, name: d.name })) };
      },
    }),
  };
}

export type ChatTools = ReturnType<typeof chatTools>;
export type ChatMessage = UIMessage<never, never, InferUITools<ChatTools>>;
