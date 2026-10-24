import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/app-shell/back-link";
import { DeckForm } from "@/components/deck/deck-form";
import { DeleteDeckButton } from "@/components/deck/delete-deck-button";
import { getDeck } from "@/lib/data/decks";
import { getMyGroups } from "@/lib/data/groups";

export const metadata: Metadata = { title: "Cài đặt bộ từ" };

export default async function DeckSettingsPage({ params }: PageProps<"/decks/[deckId]/settings">) {
  const { deckId } = await params;
  const view = await getDeck(deckId);
  if (!view) notFound();
  if (!view.isOwner) redirect(`/decks/${deckId}`);
  const { deck } = view;
  const groups = await getMyGroups();

  return (
    <div className="max-w-3xl">
      <BackLink href={`/decks/${deckId}`} label={deck.name} />
      <h1 className="mb-6 text-xl">Cài đặt bộ từ</h1>
      <DeckForm
        mode="edit"
        deckId={deckId}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        initial={{
          name: deck.name,
          description: deck.description ?? "",
          language: deck.language,
          visibility: deck.visibility,
          group_id: deck.group_id,
          allow_member_edit: deck.allow_member_edit,
          enable_recall: deck.enable_recall,
        }}
      />
      <section className="mt-10 max-w-xl rounded-lg border border-danger/60 p-5">
        <h2 className="text-base">Xóa bộ từ</h2>
        <p className="mt-1 mb-4 text-sm text-fg-muted">
          Xóa {deck.word_count} từ và tiến độ ôn của mọi người đang học bộ này. Không hoàn tác được.
        </p>
        <DeleteDeckButton deckId={deckId} name={deck.name} />
      </section>
    </div>
  );
}
