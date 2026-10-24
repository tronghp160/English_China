import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/app-shell/back-link";
import { WordComposer } from "@/components/word/word-composer";
import { requireUser } from "@/lib/auth";
import { getDeck, getMyDecks } from "@/lib/data/decks";
import { aiProvider } from "@/lib/env";

export const metadata: Metadata = { title: "Thêm từ" };

export default async function AddWordPage({ params, searchParams }: PageProps<"/decks/[deckId]/add">) {
  const [{ deckId }, sp] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const view = await getDeck(deckId);
  if (!view) notFound();
  if (!view.canEdit) redirect(`/decks/${deckId}`);
  const myDecks = await getMyDecks();
  const targets = myDecks
    .filter((d) => d.language === view.deck.language && (d.relation === "own" || d.id === deckId))
    .map((d) => ({ id: d.id, name: d.name }));
  if (!targets.some((t) => t.id === deckId)) targets.unshift({ id: deckId, name: view.deck.name });

  return (
    <div className="max-w-3xl">
      <BackLink href={`/decks/${deckId}`} label={view.deck.name} />
      <WordComposer
        deckId={deckId}
        language={view.deck.language}
        targets={targets}
        userId={user.id}
        initialTerm={typeof sp.term === "string" ? sp.term.slice(0, 80) : undefined}
        initialMode={sp.mode === "list" ? "list" : "cards"}
        aiEnabled={aiProvider() !== null}
      />
    </div>
  );
}
