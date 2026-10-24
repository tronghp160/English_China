import { LangMark } from "@/components/lang-mark";
import { deckColor, deckColorClasses } from "@/lib/deck-colors";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";

/** What the art shows: the deck's first word, or failing that the first letter of its name. */
function glyph(sample: string | undefined, name: string | undefined) {
  const t = (sample ?? name ?? "").trim();
  if (!t) return "";
  return sample ? t : [...t][0].toUpperCase();
}

/**
 * The pale colored block on top of a deck card (REDESIGN_V2 §6.4): the deck's first word big in the deck's
 * color, the language chip in the corner. `children` sits top right (e.g. a visibility icon). Decorative.
 */
export function DeckArtBlock({
  id,
  language,
  name,
  sample,
  compact,
  className,
  children,
}: {
  id: string;
  language: LangCode;
  name?: string;
  /** First word of the deck */
  sample?: string;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const c = deckColorClasses(deckColor(id));
  const zh = language === "zh";
  const text = glyph(sample, name);
  return (
    <div
      aria-hidden
      className={cn(
        "relative flex items-center justify-center overflow-hidden px-3",
        compact ? "h-[4.5rem]" : "h-[5.25rem]",
        c.soft,
        c.fg,
        className,
      )}
    >
      <span
        lang={zh ? "zh-CN" : "en"}
        className={cn(
          "max-w-full truncate leading-tight",
          zh ? "font-hanzi font-bold" : "font-extrabold tracking-[-0.03em]",
          zh ? (compact ? "text-[2.125rem]" : "text-[2.5rem]") : compact ? "text-[1.625rem]" : "text-[1.875rem]",
        )}
      >
        {text}
      </span>
      <LangMark lang={language} white className="absolute top-2.5 left-2.5" />
      {children && <span className="absolute top-2.5 right-2.5">{children}</span>}
    </div>
  );
}

const TILE: Record<"sm" | "md" | "lg", string> = {
  sm: "size-10 rounded-md text-lg",
  md: "size-14 rounded-md text-2xl",
  lg: "size-28 rounded-lg text-5xl",
};

/**
 * A deck as a small colored tile (lists, headers, pickers): its first letter or word in the deck's color.
 * Decorative: the name is always beside it. `small` is the old way to say size="sm".
 */
export function DeckArt({
  id,
  language,
  name,
  sample,
  size = "md",
  small,
  className,
}: {
  id: string;
  language: LangCode;
  name?: string;
  sample?: string;
  size?: "sm" | "md" | "lg";
  small?: boolean;
  className?: string;
}) {
  const s = small ? "sm" : size;
  const c = deckColorClasses(deckColor(id));
  const zh = language === "zh";
  const text = glyph(sample, name);
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden font-extrabold",
        TILE[s],
        c.soft,
        c.fg,
        zh && "font-hanzi font-bold",
        className,
      )}
    >
      <span lang={zh ? "zh-CN" : "en"} className="max-w-full truncate px-1 leading-none">
        {[...text].slice(0, zh ? 2 : 1).join("")}
      </span>
      {s === "lg" && <LangMark lang={language} white className="absolute top-1.5 left-1.5" />}
    </span>
  );
}
