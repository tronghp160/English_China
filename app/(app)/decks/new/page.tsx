import type { Metadata } from "next";
import { BackLink } from "@/components/app-shell/back-link";
import { DeckForm } from "@/components/deck/deck-form";
import { getMyGroups } from "@/lib/data/groups";

export const metadata: Metadata = { title: "Tạo bộ từ" };

export default async function NewDeckPage({ searchParams }: PageProps<"/decks/new">) {
  const params = await searchParams;
  const groups = await getMyGroups();
  const groupId = typeof params.group === "string" ? params.group : undefined;
  const lang = params.lang === "zh" ? "zh" : "en";
  return (
    <div className="max-w-xl">
      <BackLink href="/decks" label="Bộ từ" />
      <h1 className="mb-6 text-xl font-bold text-ink">Tạo bộ từ</h1>
      <DeckForm
        mode="create"
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        initial={groupId ? { visibility: "group", group_id: groupId, language: lang } : { language: lang }}
      />
    </div>
  );
}
