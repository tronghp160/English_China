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

/** Server: one short line for the instructions, read through the user's RLS client; null when nothing useful. */
export async function pageContextLine(
  supabase: ServerSupabase,
  path: string,
): Promise<string | null> {
  const parsed = parsePagePath(path);

  if (parsed.kind === "word") {
    const { data: word } = await supabase
      .from("words")
      .select("term, reading, meaning_vi, language")
      .eq("id", parsed.id)
      .maybeSingle();

    if (!word) return null;
    const readingPart = word.reading ? ` (${word.reading})` : "";
    return `Người học đang xem từ ${word.term}${readingPart}: ${word.meaning_vi}. "Từ này" nghĩa là từ đó.`;
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
