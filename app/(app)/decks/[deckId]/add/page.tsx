import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/app-shell/back-link";
import { WordForm } from "@/components/word/word-form";
import { requireUser } from "@/lib/auth";
import { getDeck } from "@/lib/data/decks";
import { serverEnv } from "@/lib/env";
import { LANGUAGES } from "@/lib/lang/registry";
import { emptyWord } from "@/lib/word-schema";

export const metadata: Metadata = { title: "Thêm từ" };

export default async function AddWordPage({ params, searchParams }: PageProps<"/decks/[deckId]/add">) {
  const { deckId } = await params;
  const prefill = (await searchParams).term;
  const user = await requireUser();
  const view = await getDeck(deckId);
  if (!view) notFound();
  if (!view.canEdit) redirect(`/decks/${deckId}`);
  const { deck } = view;

  return (
    <div className="max-w-2xl">
      <BackLink href={`/decks/${deckId}`} label={deck.name} />
      <h1 className="mb-6 text-xl font-bold text-ink">
        Thêm từ {LANGUAGES[deck.language].label.toLowerCase()}
      </h1>
      <WordForm
        mode="create"
        deckId={deckId}
        deckName={deck.name}
        language={deck.language}
        userId={user.id}
        initial={typeof prefill === "string" ? { ...emptyWord(), term: prefill.slice(0, 80) } : undefined}
        aiEnabled={Boolean(serverEnv().ANTHROPIC_API_KEY)}
      />
    </div>
  );
}
