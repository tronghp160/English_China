import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PracticeSession } from "@/components/practice/practice-session";
import { LANGUAGES, type PracticeMode } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import type { StudyWord } from "@/lib/practice";
import { buildQuestions, MODE_INFO } from "@/lib/practice/questions";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCES = ["all", "due", "hard", "recent"] as const;

function isMode(v: string): v is PracticeMode {
  return v in MODE_INFO;
}

export async function generateMetadata({
  params,
}: PageProps<"/practice/[mode]">): Promise<Metadata> {
  const { mode } = await params;
  return { title: isMode(mode) ? MODE_INFO[mode].label : "Luyện tập" };
}

export default async function PracticeModePage({
  params,
  searchParams,
}: PageProps<"/practice/[mode]">) {
  const [{ mode }, sp] = await Promise.all([params, searchParams]);
  if (!isMode(mode)) notFound();
  const deckId = typeof sp.deck === "string" && UUID.test(sp.deck) ? sp.deck : null;
  const n = [10, 20, 30].includes(Number(sp.n)) ? Number(sp.n) : 10;
  const source = SOURCES.find((s) => s === sp.source) ?? "all";
  const srs = sp.srs === "1";

  const supabase = await createClient();
  let language: LangCode = sp.lang === "zh" ? "zh" : "en";
  if (deckId) {
    const { data: deck } = await supabase
      .from("decks")
      .select("language")
      .eq("id", deckId)
      .maybeSingle();
    if (!deck) notFound();
    language = deck.language;
  }
  if (!LANGUAGES[language].practiceModes.includes(mode)) notFound();

  // Ask for extra targets: some words cannot be used in every mode (no example, no pinyin…).
  const needsFilter = mode === "cloze" || mode === "tones";
  const [{ data: targets }, { data: pool }] = await Promise.all([
    supabase.rpc("practice_words", {
      p_deck_id: deckId as string,
      p_language: language,
      p_source: source,
      p_limit: needsFilter ? n * 4 : n,
    }),
    supabase.rpc("practice_words", {
      p_deck_id: deckId as string,
      p_language: language,
      p_source: "all",
      p_limit: 200,
    }),
  ]);
  const words = (targets ?? []).map((t) => t.word as unknown as StudyWord);
  const questions = buildQuestions(
    mode,
    words,
    (pool ?? []).map((p) => p.word as unknown as StudyWord),
  ).slice(0, n);

  const back = deckId ? `/practice?deck=${deckId}` : "/practice";
  const query = new URLSearchParams(
    Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
  const againHref = `/practice/${mode}?${query}`;

  if (!questions.length) {
    const why =
      source === "due"
        ? "Chưa có từ nào đến hạn ôn."
        : mode === "cloze"
          ? "Chưa có từ nào có câu ví dụ chứa chính từ đó."
          : mode === "tones"
            ? "Chưa có từ nào có pinyin khớp với số chữ."
            : "Bộ này chưa có từ nào.";
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-ink">Chưa luyện được</h1>
        <p className="text-ink-soft">{why}</p>
        <Link
          href={back}
          className="inline-flex min-h-12 items-center rounded-[10px] bg-primary px-5 font-medium text-primary-foreground"
        >
          Chọn cách luyện khác
        </Link>
      </div>
    );
  }

  return (
    <PracticeSession
      mode={mode}
      questions={questions}
      countsToSrs={srs}
      exitHref={back}
      againHref={againHref}
    />
  );
}
