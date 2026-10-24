import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashcardDeck } from "@/components/practice/flashcard-deck";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LearnSession } from "@/components/practice/learn-session";
import { MatchGame } from "@/components/practice/match-game";
import { TestSession } from "@/components/practice/test-session";
import { PracticeSession } from "@/components/practice/practice-session";
import { LANGUAGES, type PracticeMode } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import type { StudyWord } from "@/lib/practice";
import { buildMatchBoards } from "@/lib/practice/match";
import { buildQuestions, countsFor, MODE_INFO } from "@/lib/practice/questions";
import { buildTest, parseTestAsk, parseTestTypes } from "@/lib/practice/test";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCES = ["all", "due", "hard", "recent"] as const;

function isMode(v: string): v is PracticeMode {
  return v in MODE_INFO;
}

function CannotPractice({ back, why }: { back: string; why: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <EmptyState
        figure="grid"
        title="Chưa luyện được"
        actions={
          <Button asChild size="lg">
            <Link href={back}>Chọn cách luyện khác</Link>
          </Button>
        }
      >
        {why}
      </EmptyState>
    </div>
  );
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
  const counts = countsFor(mode);
  const n = counts.includes(Number(sp.n)) ? Number(sp.n) : counts[0];
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

  const back = deckId
    ? sp.from === "deck"
      ? `/decks/${deckId}`
      : `/practice?deck=${deckId}`
    : "/practice";
  const query = new URLSearchParams(
    Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
  const againHref = `/practice/${mode}?${query}`;
  const deckKey = deckId ?? `lang:${language}`;
  // Links between the study games keep the deck (or language) and the way back.
  const scope = new URLSearchParams(deckId ? { deck: deckId } : { lang: language });
  if (sp.from === "deck") scope.set("from", "deck");
  const learnBase = `/practice/learn?${scope}`;
  const testHref = `/practice/test?${scope}&n=20`;

  if (mode === "learn") {
    const wordIds =
      typeof sp.words === "string"
        ? [...new Set(sp.words.split(",").filter((id) => UUID.test(id)))].slice(0, 50)
        : [];
    const { data: poolRows } = await supabase.rpc("practice_words", {
      p_deck_id: deckId as string,
      p_language: language,
      p_source: "all",
      p_limit: 300,
    });
    const pool = (poolRows ?? []).map((p) => p.word as unknown as StudyWord);
    let words: StudyWord[];
    if (wordIds.length) {
      // "Học các từ sai" from a test: just these words, progress not saved.
      let q = supabase.from("words").select("*").in("id", wordIds).eq("language", language);
      if (deckId) q = q.eq("deck_id", deckId);
      const { data } = await q;
      words = (data ?? []) as unknown as StudyWord[];
    } else if (source === "all") {
      // The whole deck in its own order, so saved progress lines up on the next visit.
      words = [...pool]
        .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
        .slice(0, n);
    } else {
      const { data } = await supabase.rpc("practice_words", {
        p_deck_id: deckId as string,
        p_language: language,
        p_source: source,
        p_limit: n,
      });
      words = (data ?? []).map((t) => t.word as unknown as StudyWord);
    }
    if (!words.length)
      return (
        <CannotPractice
          back={back}
          why={source === "due" ? "Chưa có từ nào đến hạn ôn." : "Bộ này chưa có từ nào."}
        />
      );
    return (
      <LearnSession
        words={words}
        pool={pool}
        progressKey={wordIds.length ? null : `${deckKey}:${source}`}
        countsToSrs={srs}
        exitHref={back}
        testHref={testHref}
      />
    );
  }

  if (mode === "match") {
    const { data } = await supabase.rpc("practice_words", {
      p_deck_id: deckId as string,
      p_language: language,
      p_source: source,
      p_limit: n,
    });
    const boards = buildMatchBoards((data ?? []).map((t) => t.word as unknown as StudyWord));
    if (!boards.length)
      return (
        <CannotPractice
          back={back}
          why={source === "due" ? "Chưa có từ nào đến hạn ôn." : "Cần ít nhất 2 từ để ghép thẻ."}
        />
      );
    return (
      <MatchGame
        boards={boards}
        deckKey={deckKey}
        exitHref={back}
        againHref={againHref}
        learnHref={`${learnBase}&n=20`}
      />
    );
  }

  const emptyWhy = source === "due" ? "Chưa có từ nào đến hạn ôn." : "Bộ này chưa có từ nào.";

  if (mode === "test") {
    const types = parseTestTypes(sp.types);
    const ask = parseTestAsk(sp.ask);
    const [{ data: targets }, { data: pool }] = await Promise.all([
      supabase.rpc("practice_words", {
        p_deck_id: deckId as string,
        p_language: language,
        p_source: source,
        // extra words so cloze finds enough with a usable example
        p_limit: types.includes("cloze") ? n * 2 : n,
      }),
      supabase.rpc("practice_words", {
        p_deck_id: deckId as string,
        p_language: language,
        p_source: "all",
        p_limit: 200,
      }),
    ]);
    const questions = buildTest(
      (targets ?? []).map((t) => t.word as unknown as StudyWord),
      (pool ?? []).map((p) => p.word as unknown as StudyWord),
      { types, ask, count: n },
    );
    if (!questions.length) return <CannotPractice back={back} why={emptyWhy} />;
    return (
      <TestSession
        questions={questions}
        countsToSrs={srs}
        exitHref={back}
        againHref={againHref}
        types={types}
        ask={ask}
        learnBase={learnBase}
        matchHref={`/practice/match?${scope}&n=6`}
        deckKey={deckKey}
      />
    );
  }

  // Ask for extra targets: some words cannot be used in every mode (no example, no pinyin…).
  const needsFilter = mode === "cloze" || mode === "tones";
  const [{ data: targets }, { data: pool }] = await Promise.all([
    supabase.rpc("practice_words", {
      p_deck_id: deckId as string,
      p_language: language,
      p_source: source,
      p_limit: needsFilter ? n * 4 : n,
    }),
    // Flashcards need no distractors.
    mode === "flashcard"
      ? { data: [] }
      : supabase.rpc("practice_words", {
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

  if (!questions.length) {
    const why =
      source === "due"
        ? emptyWhy
        : mode === "cloze"
          ? "Chưa có từ nào có câu ví dụ chứa chính từ đó."
          : mode === "tones"
            ? "Chưa có từ nào có pinyin khớp với số chữ."
            : emptyWhy;
    return <CannotPractice back={back} why={why} />;
  }

  if (mode === "flashcard") {
    return (
      <FlashcardDeck
        words={questions.map((q) => q.word)}
        countsToSrs={srs}
        exitHref={back}
      />
    );
  }

  return (
    <PracticeSession
      questions={questions}
      countsToSrs={srs}
      exitHref={back}
      againHref={againHref}
    />
  );
}
