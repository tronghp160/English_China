import "server-only";
import { tool, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
import type { LangCode } from "@/lib/lang/types";
import { searchMyWords } from "@/lib/search";
import type { ServerSupabase } from "@/lib/supabase/server";

type StoredWord = { term: string; reading: string | null; meaning_vi: string };

/**
 * Tools of the study tutor. They read through the signed-in user's client, so RLS
 * still decides what is visible. None of them writes: adding a word goes through
 * the normal add-word form after the user taps the card.
 */
export function chatTools(supabase: ServerSupabase, ctx: { language: LangCode; deckId: string | null }) {
  const studyDecks = async () => {
    const { data } = await supabase.rpc("my_decks");
    return (data ?? []).filter((d) => d.language === ctx.language);
  };

  return {
    searchMyWords: tool({
      description:
        "Tìm trong sổ từ của người học (các bộ từ họ đang học, đúng ngôn ngữ của cuộc trò chuyện) theo từ hoặc nghĩa tiếng Việt.",
      inputSchema: z.object({ query: z.string().trim().min(1).max(80).describe("Từ hoặc một phần nghĩa tiếng Việt") }),
      execute: async ({ query }) => {
        const { words } = await searchMyWords(supabase, query, { language: ctx.language, limit: 8 });
        return { found: words.map(({ term, reading, meaning_vi, deck }) => ({ term, reading, meaning_vi, deck })) };
      },
    }),

    getStudyFocus: tool({
      description:
        "Lấy từ của người học để luyện: due = đến hạn ôn, hard = hay quên, recent = mới thêm. Trả về từ, phiên âm, nghĩa và số lần quên.",
      inputSchema: z.object({
        kind: z.enum(["due", "hard", "recent"]),
        limit: z.number().int().min(1).max(10).optional().describe("Mặc định 5"),
      }),
      execute: async ({ kind, limit }) => {
        const { data } = await supabase.rpc("practice_words", {
          // null = every deck the user studies (the RPC handles it)
          p_deck_id: ctx.deckId as string,
          p_language: ctx.language,
          p_source: kind,
          p_limit: limit ?? 5,
        });
        return {
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
      }),
      execute: async (input) => {
        const decks = (await studyDecks()).filter((d) => d.relation === "own");
        // The thread's own deck first, then the rest.
        decks.sort((a, b) => Number(b.id === ctx.deckId) - Number(a.id === ctx.deckId));
        return { ...input, decks: decks.slice(0, 6).map((d) => ({ id: d.id, name: d.name })) };
      },
    }),
  };
}

export type ChatTools = ReturnType<typeof chatTools>;
export type ChatMessage = UIMessage<never, never, InferUITools<ChatTools>>;
