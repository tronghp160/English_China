import type { LangCode } from "@/lib/lang/types";
import { LANGUAGES } from "@/lib/lang/registry";
import { cn } from "@/lib/utils";

/**
 * Language flag as an SVG background (.lang-flag in globals.css), sized in em so
 * it follows the surrounding font size. Pass `label` when the flag is the only
 * thing naming the language; otherwise it is decorative.
 */
export function LangFlag({ lang, label, className }: { lang: LangCode; label?: boolean; className?: string }) {
  return label ? (
    <span role="img" aria-label={LANGUAGES[lang].label} className={cn("lang-flag", `lang-flag-${lang}`, className)} />
  ) : (
    <span aria-hidden className={cn("lang-flag", `lang-flag-${lang}`, className)} />
  );
}
