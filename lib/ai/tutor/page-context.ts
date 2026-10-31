import type { ServerSupabase } from "@/lib/supabase/server";

export type PageContextResult =
  | { kind: "word"; id: string }
  | { kind: "deck"; id: string }
  | { kind: "practice" }
  | { kind: "other" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pure: which page the learner is on based on pathname. */
export function parsePagePath(path: string): PageContextResult {
  const clean = path.split("?")[0].split("#")[0].replace(/\/+$/, "");

  // /words/<uuid> or /words/<uuid>/edit
  const wordMatch = clean.match(/^\/words\/([^/]+)(?:\/edit)?$/);
  if (wordMatch) {
    const id = wordMatch[1];
    if (UUID_RE.test(id)) return { kind: "word", id };
    return { kind: "other" };
  }

  // /decks/<uuid>
  const deckMatch = clean.match(/^\/decks\/([^/]+)$/);
  if (deckMatch) {
    const id = deckMatch[1];
    if (UUID_RE.test(id)) return { kind: "deck", id };
    return { kind: "other" };
  }

  // /review, /practice, /practice/*
  if (/^\/(review|practice|test)(\/.*)?$/.test(clean)) {
    return { kind: "practice" };
  }

  return { kind: "other" };
}

type ViewedWord = {
  term: string;
  reading: string | null;
  meaning_vi: string;
  parts_of_speech?: string[] | null;
  examples?: unknown;
  personal_note?: string | null;
};

/** Longest word context line (characters): enough to answer about the word without a lookup. */
export const WORD_CONTEXT_MAX = 400;

/**
 * Pure: what the learner sees on a word page, so the tutor can explain "this word" without
 * calling lookupWord for it: meaning, part of speech, up to 2 saved examples and their own note.
 */
export function wordContextLine(word: ViewedWord): string {
  const readingPart = word.reading ? ` (${word.reading})` : "";
  const pos = word.parts_of_speech?.length ? ` [${word.parts_of_speech.join(", ")}]` : "";
  const examples = (Array.isArray(word.examples) ? word.examples : [])
    .filter((e): e is { text: string; vi?: string } => typeof e?.text === "string" && e.text.trim() !== "")
    .slice(0, 2)
    .map((e) => (e.vi ? `${e.text} = ${e.vi}` : e.text));
  const note = word.personal_note?.trim().replace(/\s+/g, " ");
  const line = [
    `Người học đang xem từ ${word.term}${readingPart}${pos}: ${word.meaning_vi}. "Từ này" nghĩa là từ đó.`,
    examples.length ? `Ví dụ đã lưu: ${examples.join("; ")}.` : null,
    note ? `Ghi chú của người học: ${note}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return line.length > WORD_CONTEXT_MAX ? `${line.slice(0, WORD_CONTEXT_MAX - 1)}…` : line;
}

/** Server: one short line for the instructions, read through the user's RLS client; null when nothing useful. */
export async function pageContextLine(
  supabase: ServerSupabase,
  path: string,
): Promise<string | null> {
  const parsed = parsePagePath(path);

  if (parsed.kind === "word") {
    const { data: word } = await supabase
      .from("words")
      .select("term, reading, meaning_vi, parts_of_speech, examples, personal_note")
      .eq("id", parsed.id)
      .maybeSingle();

    return word ? wordContextLine(word) : null;
  }

  if (parsed.kind === "deck") {
    const { data: deck } = await supabase
      .from("decks")
      .select("name, language")
      .eq("id", parsed.id)
      .maybeSingle();

    if (!deck) return null;
    return `Người học đang xem bộ từ "${deck.name}".`;
  }

  if (parsed.kind === "practice") {
    return "Người học đang ôn tập; đừng đưa đáp án các từ đang ôn nếu họ không hỏi thẳng.";
  }

  return null;
}
