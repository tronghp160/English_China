import { LANGUAGES } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";

/**
 * The language of a deck or word as a small ink stamp: "EN" in violet, 中 in seal red
 * (REDESIGN_PLAN §5.5). Decorative unless `label` is set, i.e. when nothing else names the language.
 */
export function LangMark({ lang, label, className }: { lang: LangCode; label?: boolean; className?: string }) {
  const zh = lang === "zh";
  return (
    <span
      {...(label ? { role: "img", "aria-label": LANGUAGES[lang].label } : { "aria-hidden": true })}
      className={cn(
        "inline-flex h-[22px] min-w-[26px] shrink-0 items-center justify-center rounded-sm border px-1 text-xs leading-none font-semibold",
        zh
          ? "border-danger/40 bg-danger-soft font-hanzi text-danger-fg"
          : "border-primary/30 bg-primary-soft text-primary",
        className,
      )}
    >
      {zh ? "中" : "EN"}
    </span>
  );
}
