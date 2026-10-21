import { LangFlag } from "@/components/lang-flag";
import { deckTone } from "@/lib/deck-colors";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";

/** Colored square standing for a deck: "Aa" or 字 on the deck's candy color, flag in the corner. Decorative. */
export function DeckCover({
  id,
  language,
  small,
  className,
}: {
  id: string;
  language: LangCode;
  /** 40px variant for compact lists */
  small?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center text-white",
        small ? "size-10 rounded-xl" : "size-14 rounded-2xl",
        deckTone(id).cover,
        className,
      )}
    >
      {!small && (
        <span className="pointer-events-none absolute inset-x-2 top-1.5 h-2 rounded-full bg-white/25" />
      )}
      <span
        className={cn(
          "leading-none font-black",
          language === "zh" ? "font-hanzi-sans" : "font-heading",
          small ? "text-base" : "text-2xl",
        )}
      >
        {language === "zh" ? "字" : "Aa"}
      </span>
      <LangFlag
        lang={language}
        className={cn(
          "absolute -right-1 -bottom-1 ring-2 ring-surface",
          small ? "text-xs" : "text-sm",
        )}
      />
    </span>
  );
}
