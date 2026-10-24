import { LANGUAGES } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";

/**
 * The language of a deck or word as a small chip (REDESIGN_V2 §5.14): "EN" in blue, 中 in coral.
 * `white` puts it on a white chip for colored backgrounds (deck art, the Today hero).
 * Decorative unless `label` is set, i.e. when nothing else names the language.
 */
export function LangMark({
  lang,
  label,
  white,
  className,
}: {
  lang: LangCode;
  label?: boolean;
  white?: boolean;
  className?: string;
}) {
  const zh = lang === "zh";
  return (
    <span
      {...(label ? { role: "img", "aria-label": LANGUAGES[lang].label } : { "aria-hidden": true })}
      className={cn(
        "inline-flex h-6 min-w-[26px] shrink-0 items-center justify-center rounded-sm px-1.5 text-xs leading-none font-extrabold",
        white ? "bg-white" : zh ? "bg-zh-soft" : "bg-en-soft",
        zh ? "font-hanzi text-zh-fg" : "text-en-fg",
        className,
      )}
    >
      {zh ? "中" : "EN"}
    </span>
  );
}
