import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { examplesOf, extraOf } from "@/lib/word-mapper";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/decks/[deckId]/export">) {
  const { deckId } = await ctx.params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const { data: deck } = await supabase.from("decks").select("name").eq("id", deckId).maybeSingle();
  if (!deck) return NextResponse.json({ error: "not found" }, { status: 404 });

  const rows: unknown[][] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("words")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at")
      .range(from, from + 999);
    if (!data?.length) break;
    for (const w of data) {
      const ex = examplesOf(w)[0];
      const extra = extraOf(w);
      rows.push([
        w.term,
        w.reading,
        w.meaning_vi,
        w.meaning_en,
        w.parts_of_speech,
        w.topic,
        ex?.text,
        ex?.vi,
        w.synonyms,
        w.antonyms,
        extra.han_viet ?? "",
        extra.cefr ?? (extra.hsk?.level ? `HSK ${extra.hsk.level}` : ""),
        w.personal_note,
      ]);
    }
    if (data.length < 1000) break;
  }
  const csv = toCsv(
    ["term", "reading", "meaning_vi", "meaning_en", "parts_of_speech", "topic", "example", "example_vi", "synonyms", "antonyms", "han_viet", "level", "note"],
    rows,
  );
  const filename = `${deck.name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "bo-tu"}.csv`;
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="bo-tu.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
