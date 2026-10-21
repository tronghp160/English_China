"use server";

import { z } from "zod";
import { getUser } from "@/lib/auth";
import { hitRateLimit } from "@/lib/rate-limit";
import { searchMyWords } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.string().trim().min(1).max(80);

/** Ctrl+K search over the user's words and decks. */
export async function quickSearch(query: string) {
  const user = await getUser();
  const parsed = querySchema.safeParse(query);
  if (!user || !parsed.success) return { words: [], decks: [] };
  if (!(await hitRateLimit(user.id, "quick-search", 600, 3600))) return { words: [], decks: [] };
  return searchMyWords(await createClient(), parsed.data, { limit: 12 });
}

export type QuickSearchResult = Awaited<ReturnType<typeof quickSearch>>;
