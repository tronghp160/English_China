import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/app-shell/back-link";
import { DeleteWordButton } from "@/components/word/delete-word-button";
import { WordForm } from "@/components/word/word-form";
import { requireUser } from "@/lib/auth";
import { getDeck } from "@/lib/data/decks";
import { getWord } from "@/lib/data/words";
import { aiProvider } from "@/lib/env";
import { rowToWordInput } from "@/lib/word-mapper";

export const metadata: Metadata = { title: "Sửa từ" };

export default async function EditWordPage({ params }: PageProps<"/words/[wordId]/edit">) {
  const { wordId } = await params;
  const user = await requireUser();
  const word = await getWord(wordId);
  if (!word) notFound();
  const view = await getDeck(word.deck_id);
  if (!view?.canEdit) redirect(`/words/${wordId}`);

  return (
    <div className="max-w-2xl">
      <BackLink href={`/words/${wordId}`} label={word.term} />
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl">Sửa từ</h1>
        <DeleteWordButton wordId={wordId} term={word.term} />
      </div>
      <WordForm
        mode="edit"
        wordId={wordId}
        deckId={word.deck_id}
        deckName={view.deck.name}
        language={word.language}
        userId={user.id}
        initial={rowToWordInput(word)}
        aiEnabled={aiProvider() !== null}
      />
    </div>
  );
}
