import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Plus } from "lucide-react";
import { AddWordFab } from "@/components/app-shell/fab";
import { BackLink } from "@/components/app-shell/back-link";
import { DeckActionsMenu } from "@/components/deck/deck-actions-menu";
import { DeckArt } from "@/components/deck/deck-art";
import { DeckWords } from "@/components/deck/deck-words";
import { StudyStrip } from "@/components/deck/study-strip";
import { SubscribeButton } from "@/components/deck/subscribe-button";
import { Button } from "@/components/ui/button";
import { LANGUAGES, type PracticeMode } from "@/lib/lang/registry";
import { getDeck, getMyDecks } from "@/lib/data/decks";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export async function generateMetadata({ params }: PageProps<"/decks/[deckId]">): Promise<Metadata> {
  const view = await getDeck((await params).deckId);
  return { title: view?.deck.name ?? "Bộ từ" };
}

// Quick study cells under the deck header (set size per mode).
const STUDY_LINKS: { mode: PracticeMode; n: number }[] = [
  { mode: "learn", n: 20 },
  { mode: "test", n: 20 },
  { mode: "match", n: 6 },
  { mode: "flashcard", n: 200 },
];

export default async function DeckPage({ params }: PageProps<"/decks/[deckId]">) {
  const { deckId } = await params;
  const view = await getDeck(deckId);
  if (!view) notFound();
  const { deck, isOwner, canEdit, isSubscribed } = view;

  const supabase = await createClient();
  const [{ data: topics }, myDecks] = await Promise.all([
    supabase.rpc("deck_topics", { p_deck_id: deckId }),
    getMyDecks(),
  ]);
  const moveTargets = myDecks
    .filter((d) => d.relation === "own" && d.language === deck.language && d.id !== deckId)
    .map((d) => ({ id: d.id, name: d.name }));
  const dueHere = myDecks.find((d) => d.id === deckId)?.due_count ?? 0;
  const studying = myDecks.some((d) => d.id === deckId);
  const studyItems = STUDY_LINKS.filter((s) => LANGUAGES[deck.language].practiceModes.includes(s.mode));

  return (
    <div>
      <BackLink href="/decks" label="Bộ từ" />
      <header className="flex items-start gap-4 md:gap-6">
        <DeckArt id={deckId} language={deck.language} name={deck.name} size="md" className="md:hidden" />
        <DeckArt id={deckId} language={deck.language} name={deck.name} size="lg" className="hidden md:inline-flex" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl break-words sm:text-2xl">{deck.name}</h1>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
            <span>{LANGUAGES[deck.language].label}</span>
            <span>{deck.word_count} từ</span>
            {!isOwner && deck.owner && <span>của {deck.owner.display_name}</span>}
            {deck.group && <span>nhóm {deck.group.name}</span>}
            {dueHere > 0 && <span className="font-semibold text-danger-fg">{dueHere} cần ôn</span>}
          </p>
          {deck.description && <p className="mt-3 max-w-[62ch] text-[0.9375rem] text-fg">{deck.description}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {studying ? (
              <Button asChild>
                <Link href={`/review?deck=${deckId}`}>
                  <Play className="fill-current" aria-hidden />
                  Ôn bộ này
                  {dueHere > 0 && <span className="tabular-nums">({dueHere})</span>}
                </Link>
              </Button>
            ) : (
              <SubscribeButton deckId={deckId} subscribed={isSubscribed} />
            )}
            {canEdit && (
              <Button asChild variant="outline">
                <Link href={`/decks/${deckId}/add`}>
                  <Plus aria-hidden />
                  Thêm từ
                </Link>
              </Button>
            )}
            <DeckActionsMenu
              deckId={deckId}
              slug={deck.share_slug}
              siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
              canEdit={canEdit}
              isOwner={isOwner}
              isSubscribed={isSubscribed}
            />
          </div>
        </div>
      </header>

      {deck.word_count > 0 && (
        <section className="mt-8" aria-labelledby="deck-study">
          <h2 id="deck-study" className="mb-2 text-base">
            Học bộ này
          </h2>
          <StudyStrip deckId={deckId} items={studyItems} wordCount={deck.word_count} />
        </section>
      )}

      <DeckWords
        deckId={deckId}
        language={deck.language}
        canEdit={canEdit}
        topics={(topics ?? []).map((t) => t.topic)}
        moveTargets={moveTargets}
        wordCount={deck.word_count}
      />

      {canEdit && <AddWordFab href={`/decks/${deckId}/add`} />}
    </div>
  );
}
