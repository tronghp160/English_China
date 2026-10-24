import { LangMark } from "@/components/lang-mark";
import { deckTone } from "@/lib/deck-colors";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";

export type CoverSize = "sm" | "md" | "lg";

const BOX: Record<CoverSize, string> = {
  sm: "h-10 w-8",
  md: "h-[4.5rem] w-14",
  lg: "h-40 w-[7.5rem]",
};

/**
 * A deck as a notebook: cover cloth in the deck's color, a darker spine on the left,
 * a white name label, the language mark in the corner. Decorative (the name is always beside it).
 * `small` is the old name of size="sm".
 */
export function DeckCover({
  id,
  language,
  name,
  size = "md",
  small,
  className,
}: {
  id: string;
  language: LangCode;
  /** Shown on the label; without it the label is just two ruled lines */
  name?: string;
  size?: CoverSize;
  small?: boolean;
  className?: string;
}) {
  const s = small ? "sm" : size;
  return (
    <span
      aria-hidden
      className={cn(
        "rounded-md relative inline-flex shrink-0 overflow-hidden dark:[filter:saturate(0.9)_brightness(0.9)]",
        BOX[s],
        deckTone(id).cover,
        className,
      )}
    >
      <span className={cn("shrink-0 bg-black/15", s === "lg" ? "w-2" : "w-1")} />
      {s !== "sm" && (
        <span className={cn("flex min-w-0 flex-1 flex-col justify-between", s === "lg" ? "p-3" : "p-1.5")}>
          <span
            className={cn(
              "block rounded-sm border border-border bg-white text-fg",
              s === "lg" ? "px-2 py-2" : "px-1 py-1",
            )}
          >
            {name ? (
              <span
                className={cn(
                  "line-clamp-2 block font-semibold break-words",
                  s === "lg" ? "text-sm leading-snug" : "text-[0.5625rem] leading-[1.15]",
                )}
              >
                {name}
              </span>
            ) : (
              <span className="block h-2" />
            )}
            <span className={cn("mt-1 block border-t border-fg/15", s === "lg" && "mt-2")} />
            <span className={cn("mt-1 block border-t border-fg/15", s === "lg" && "mt-2")} />
          </span>
          <span className="flex justify-end">
            <LangMark
              lang={language}
              className={cn("border-white/40", s === "lg" ? "" : "h-4 min-w-5 px-0.5 text-[0.625rem]")}
            />
          </span>
        </span>
      )}
    </span>
  );
}
