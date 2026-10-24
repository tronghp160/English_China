import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/app-shell/back-link";
import { ImportWizard } from "@/components/import/import-wizard";
import { getDeck } from "@/lib/data/decks";
import { serverEnv, aiProvider } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nhập hàng loạt" };

export default async function ImportPage({ params }: PageProps<"/decks/[deckId]/import">) {
  const { deckId } = await params;
  const view = await getDeck(deckId);
  if (!view) notFound();
  if (!view.canEdit) redirect(`/decks/${deckId}`);

  const supabase = await createClient();
  const existing: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from("words").select("normalized").eq("deck_id", deckId).range(from, from + 999);
    if (!data?.length) break;
    existing.push(...data.map((d) => d.normalized));
    if (data.length < 1000) break;
  }
  const env = serverEnv();

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href={`/decks/${deckId}`} label={view.deck.name} />
      <h1 className="text-xl text-fg">Nhập hàng loạt</h1>
      <p className="mt-1 mb-6 text-sm text-fg-muted">Dán danh sách từ trong vở, mỗi dòng một từ. Tối đa 100 từ mỗi lần.</p>
      <ImportWizard
        deckId={deckId}
        language={view.deck.language}
        existing={existing}
        aiEnabled={aiProvider() !== null}
        visionEnabled={Boolean(env.ANTHROPIC_API_KEY)}
      />
    </div>
  );
}
