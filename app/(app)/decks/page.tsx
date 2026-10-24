import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DeckList } from "@/components/deck/deck-list";
import { Button } from "@/components/ui/button";
import { getMyDecks } from "@/lib/data/decks";

export const metadata: Metadata = { title: "Bộ từ" };

export default async function DecksPage({ searchParams }: PageProps<"/decks">) {
  const params = await searchParams;
  const langFilter = params.lang === "en" || params.lang === "zh" ? params.lang : null;
  const decks = await getMyDecks();

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl">Bộ từ</h1>
        <Button asChild>
          <Link href="/decks/new">
            <Plus aria-hidden />
            Tạo bộ từ
          </Link>
        </Button>
      </div>
      <DeckList decks={decks} langFilter={langFilter} />
    </div>
  );
}
