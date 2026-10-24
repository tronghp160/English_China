import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DeckList } from "@/components/deck/deck-list";
import { Button } from "@/components/ui/button";
import { getDeckSamples, getMyDecks } from "@/lib/data/decks";

export const metadata: Metadata = { title: "Bộ từ" };

export default async function DecksPage({ searchParams }: PageProps<"/decks">) {
  const params = await searchParams;
  const langFilter = params.lang === "en" || params.lang === "zh" ? params.lang : null;
  const decks = await getMyDecks();
  const samples = await getDeckSamples(decks.map((d) => d.id));

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[1.6875rem] sm:text-[2.125rem]">Bộ từ</h1>
        <Button asChild>
          <Link href="/decks/new">
            <Plus aria-hidden />
            Tạo bộ từ
          </Link>
        </Button>
      </div>
      <DeckList decks={decks} langFilter={langFilter} samples={samples} />
    </div>
  );
}
