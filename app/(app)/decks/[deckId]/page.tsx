import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileUp, PenLine, Play, Plus, Settings } from "lucide-react";
import { AddWordFab } from "@/components/app-shell/fab";
import { BackLink } from "@/components/app-shell/back-link";
import { DeckWords } from "@/components/deck/deck-words";
import { ShareDeckDialog } from "@/components/deck/share-deck-dialog";
import { SubscribeButton } from "@/components/deck/subscribe-button";
import { getDeck, getMyDecks } from "@/lib/data/decks";
import { LANGUAGES } from "@/lib/lang/registry";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export async function generateMetadata({ params }: PageProps<"/decks/[deckId]">): Promise<Metadata> {
  const view = await getDeck((await params).deckId);
  return { title: view?.deck.name ?? "Bộ từ" };
}

function ActionLink({ href, icon: Icon, children }: { href: string; icon: typeof Plus; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] border border-rule bg-surface px-3.5 text-sm font-medium text-ink hover:bg-muted"
    >
      <Icon className="size-4 text-ink-soft" aria-hidden />
      {children}
    </Link>
  );
}

export default async function DeckPage({ params }: PageProps<"/decks/[deckId]">) {
  const { deckId } = await params;
  const view = await getDeck(deckId);
  if (!view) notFound();
  const { deck, isOwner, canEdit, isSubscribed } = view;
  const def = LANGUAGES[deck.language];

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
      <header className="flex items-start gap-3">
        <span className="mt-0.5 text-3xl" aria-label={def.label}>
          {def.flag}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold break-words text-ink">{deck.name}</h1>
          <p className="text-sm text-ink-soft">
            {deck.word_count} từ
            {!isOwner && deck.owner && ` · của ${deck.owner.display_name}`}
            {deck.group && ` · nhóm ${deck.group.name}`}
            {dueHere > 0 && (
              <>
                {" · "}
                <span className="highlighter font-medium text-ink">{dueHere} cần ôn</span>
              </>
            )}
          </p>
          {deck.description && <p className="mt-2 text-[0.9375rem] text-ink">{deck.description}</p>}
        </div>
      </header>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {studying ? (
          <Link
            href={`/review?deck=${deckId}`}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            <Play className="size-4" aria-hidden />
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
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] border border-rule bg-surface px-3.5 text-sm font-medium text-ink hover:bg-muted"
        >
          <Download className="size-4 text-ink-soft" aria-hidden />
          Xuất CSV
        </a>
        {isOwner && <ActionLink href={`/decks/${deckId}/settings`} icon={Settings}>Cài đặt</ActionLink>}
        {isSubscribed && <SubscribeButton deckId={deckId} subscribed />}
      </div>

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
