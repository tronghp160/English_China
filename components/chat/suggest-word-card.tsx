import { BookPlus, Plus } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { WordSpecimen } from "@/components/word/word-specimen";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";

export type SuggestedWord = {
  term: string;
  reading?: string;
  meaning_vi: string;
  decks: { id: string; name: string }[];
};

function AddLink({ deckId, name, term }: { deckId: string; name: string; term: string }) {
  return (
    <Link
      href={`/decks/${deckId}/add?term=${encodeURIComponent(term)}`}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "max-w-full")}
    >
      <Plus aria-hidden />
      <span className="truncate">Thêm vào {name}</span>
    </Link>
  );
}

/** A suggested word as a small specimen, with a way to add it. It opens the normal add-word form; nothing is saved here. */
export function SuggestWordCard({ word, language }: { word: SuggestedWord; language: LangCode }) {
  // The thread's own deck comes first (chatTools.suggestWord sorts it).
  const [first, ...others] = word.decks.slice(0, 6);
  return (
    <div className="my-3">
      <WordSpecimen lang={language} term={word.term} reading={word.reading} size="sm" className={language === "zh" ? "rounded-lg border border-border/60 bg-surface shadow-sm p-3" : undefined}>
        <p className="flex min-h-[var(--line)] items-end pb-1 text-sm text-fg">{word.meaning_vi}</p>
      </WordSpecimen>
      <div className="mt-2">
        {first ? (
          <>
            <AddLink deckId={first.id} name={first.name} term={word.term} />
            {others.length > 0 && (
              <details className="mt-1">
                <summary className="inline-flex min-h-11 cursor-pointer items-center px-1 text-sm font-medium text-fg-muted">Bộ khác</summary>
                <div className="flex flex-col items-start gap-1.5">
                  {others.map((d) => (
                    <AddLink key={d.id} deckId={d.id} name={d.name} term={word.term} />
                  ))}
                </div>
              </details>
            )}
          </>
        ) : (
          <Link href="/decks/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <BookPlus aria-hidden />
            Tạo bộ từ để lưu từ này
          </Link>
        )}
      </div>
    </div>
  );
}
