import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileUp, PenLine, Play, Plus, Settings } from "lucide-react";
import { AddWordFab } from "@/components/app-shell/fab";
import { BackLink } from "@/components/app-shell/back-link";
import { DeckWords } from "@/components/deck/deck-words";
import { ShareDeckDialog } from "@/components/deck/share-deck-dialog";
import { CloneDeckButton, SubscribeButton } from "@/components/deck/subscribe-button";
import { DeckCover } from "@/components/deck/deck-cover";
import { MODE_LOOK } from "@/components/practice/mode-look";
import { deckTone } from "@/lib/deck-colors";
import { LANGUAGES, type PracticeMode } from "@/lib/lang/registry";
import { MODE_INFO } from "@/lib/practice/questions";
import { cn } from "@/lib/utils";
import { getDeck, getMyDecks } from "@/lib/data/decks";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export async function generateMetadata({ params }: PageProps<"/decks/[deckId]">): Promise<Metadata> {
  const view = await getDeck((await params).deckId);
  return { title: view?.deck.name ?? "Bộ từ" };
}

// Quick study buttons under the deck header (set size per mode).
const STUDY_LINKS: { mode: PracticeMode; n: number }[] = [
  { mode: "flashcard", n: 200 },
  { mode: "match", n: 6 },
];

function ActionLink({ href, icon: Icon, children }: { href: string; icon: typeof Plus; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="btn-3d inline-flex min-h-11 shrink-0 items-center gap-2 rounded-btn border-2 border-rule bg-surface px-3.5 text-sm font-semibold text-ink [--edge-color:var(--rule)] hover:bg-muted"
    >
      <Icon className="size-4 text-ink-blue" aria-hidden />
      {children}
    </Link>
  );
}

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

  return (
    <div>
      <BackLink href="/decks" label="Bộ từ" />
      <header className={cn("relative flex items-start gap-4 overflow-hidden rounded-sheet p-5", deckTone(deckId).wash)}>
        <span aria-hidden className="pointer-events-none absolute -top-8 -right-8 size-28 rounded-full bg-surface/40" />
        <DeckCover id={deckId} language={deck.language} className="size-16 -rotate-3 shadow-card" />
        <div className="relative min-w-0 flex-1">
          <h1 className="text-xl leading-tight break-words text-ink">{deck.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {LANGUAGES[deck.language].label} · {deck.word_count} từ
            {!isOwner && deck.owner && ` · của ${deck.owner.display_name}`}
            {deck.group && ` · nhóm ${deck.group.name}`}
            {dueHere > 0 && (
              <>
                {" · "}
                <span className="rounded-full bg-surface px-2 py-0.5 font-bold text-danger">{dueHere} cần ôn</span>
              </>
            )}
          </p>
          {deck.description && <p className="mt-2 text-[0.9375rem] text-ink">{deck.description}</p>}
        </div>
      </header>

      <div className="mt-5 flex gap-2 overflow-x-auto pt-0.5 pb-2">
        {studying ? (
          <Link
            href={`/review?deck=${deckId}`}
            className="btn-3d inline-flex min-h-11 shrink-0 items-center gap-2 rounded-btn bg-primary px-4 text-sm font-bold text-primary-foreground [--edge-color:var(--ink-blue-shade)]"
          >
            <Play className="size-4 fill-current" aria-hidden />
            Ôn bộ này
          </Link>
        ) : (
          <SubscribeButton deckId={deckId} subscribed={isSubscribed} />
        )}
        {canEdit && <ActionLink href={`/decks/${deckId}/add`} icon={Plus}>Thêm từ</ActionLink>}
        {canEdit && <ActionLink href={`/decks/${deckId}/import`} icon={FileUp}>Nhập hàng loạt</ActionLink>}
        <ActionLink href={`/practice?deck=${deckId}`} icon={PenLine}>Luyện tập</ActionLink>
        {isOwner && (
          <ShareDeckDialog deckId={deckId} slug={deck.share_slug} siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL} />
        )}
        <a
          href={`/api/decks/${deckId}/export`}
          className="btn-3d inline-flex min-h-11 shrink-0 items-center gap-2 rounded-btn border-2 border-rule bg-surface px-3.5 text-sm font-semibold text-ink [--edge-color:var(--rule)] hover:bg-muted"
        >
          <Download className="size-4 text-ink-blue" aria-hidden />
          Xuất CSV
        </a>
        {!isOwner && <CloneDeckButton deckId={deckId} />}
        {isOwner && <ActionLink href={`/decks/${deckId}/settings`} icon={Settings}>Cài đặt</ActionLink>}
        {isSubscribed && <SubscribeButton deckId={deckId} subscribed />}
      </div>

      {deck.word_count > 0 && (
        <nav aria-label="Học bộ này" className="mt-3 mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STUDY_LINKS.filter((s) => LANGUAGES[deck.language].practiceModes.includes(s.mode)).map(
            ({ mode, n }) => {
              const look = MODE_LOOK[mode];
              const Icon = look.icon;
              return (
                <Link
                  key={mode}
                  href={`/practice/${mode}?deck=${deckId}&n=${n}&from=deck`}
                  className="notebook-card flex min-h-14 items-center gap-3 px-3 py-2 font-bold text-ink transition-transform hover:-translate-y-0.5"
                >
                  <span className={cn("icon-tile size-10", look.tile)}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {MODE_INFO[mode].label}
                </Link>
              );
            },
          )}
        </nav>
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
