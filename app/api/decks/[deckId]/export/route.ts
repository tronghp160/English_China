import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { deckWords, WORD_CSV_HEADER, wordCsvRow } from "@/lib/export";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/decks/[deckId]/export">) {
  const { deckId } = await ctx.params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(deckId)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const supabase = await createClient();
  const { data: deck } = await supabase.from("decks").select("name").eq("id", deckId).maybeSingle();
  if (!deck) return NextResponse.json({ error: "not found" }, { status: 404 });

  const words = await deckWords(supabase, [deckId]);
  const csv = toCsv(WORD_CSV_HEADER, words.map(wordCsvRow));
  const filename = `${deck.name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "bo-tu"}.csv`;
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="bo-tu.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
