import { BookPlus, Plus } from "lucide-react";
import Link from "next/link";
import { PronounceButton } from "@/components/word/pronounce-button";
import { PinyinText } from "@/components/zh/pinyin-text";
import { LANGUAGES } from "@/lib/lang/registry";
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
      className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-btn bg-wash-jade px-3 text-sm font-bold text-jade-text"
    >
      <Plus className="size-4 shrink-0" aria-hidden />
      <span className="truncate">Thêm vào {name}</span>
    </Link>
  );
}

/** "Thêm vào sổ" card: opens the normal add-word form with the term filled in (nothing is saved here). */
export function SuggestWordCard({ word, language }: { word: SuggestedWord; language: LangCode }) {
  const l = LANGUAGES[language];
  // The thread's own deck comes first (chatTools.suggestWord sorts it).
  const [first, ...others] = word.decks.slice(0, 6);
  return (
    <div className="mt-2 rounded-card border-2 border-dashed border-rule bg-paper p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p lang={language} className={cn("text-xl font-bold text-ink", l.termFontClass)}>
            {word.term}
          </p>
          {word.reading &&
            (language === "zh" ? (
              <PinyinText pinyin={word.reading} className="text-sm" />
            ) : (
              <p className="font-ipa text-sm text-ink-soft">{word.reading}</p>
            ))}
          <p className="mt-1 text-sm text-ink">{word.meaning_vi}</p>
        </div>
        <PronounceButton text={word.term} lang={language} size="sm" />
      </div>
      <div className="mt-3">
        {first ? (
          <>
            <AddLink deckId={first.id} name={first.name} term={word.term} />
            {others.length > 0 && (
              <details className="mt-1">
                <summary className="inline-flex min-h-11 cursor-pointer items-center px-1 text-sm font-semibold text-ink-soft">
                  Bộ khác
                </summary>
                <div className="flex flex-col items-start gap-1.5">
                  {others.map((d) => (
                    <AddLink key={d.id} deckId={d.id} name={d.name} term={word.term} />
                  ))}
                </div>
              </details>
            )}
          </>
        ) : (
          <Link
            href="/decks/new"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-btn bg-wash-jade px-3 text-sm font-bold text-jade-text"
          >
            <BookPlus className="size-4" aria-hidden />
            Tạo bộ từ để lưu từ này
          </Link>
        )}
      </div>
    </div>
  );
}
