import { PinyinText } from "@/components/zh/pinyin-text";
import { containsHan, segmentPinyin } from "@/lib/lang/zh";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";

export type SpecimenSize = "sm" | "md" | "lg";

// Font size of an English word and of one Chinese character per size.
const EN: Record<SpecimenSize, string> = {
  lg: "var(--text-word)",
  md: "clamp(1.875rem, 6vw, 2.75rem)",
  sm: "1.75rem",
};
const ZH: Record<SpecimenSize, string> = {
  lg: "var(--text-hanzi)",
  md: "clamp(3rem, 10vw, 4.25rem)",
  sm: "2.5rem",
};

/**
 * A word as the hero of a screen (REDESIGN_V2 §6.6). A white card with a 4px strip of the language color on
 * top (blue English, coral Chinese); English in bold sans, Chinese in bold Noto Sans SC with the pinyin under
 * each character in its tone color, no cells. `actions` (pronounce button) sits at the end of the reading line,
 * `children` below it, `aside` (a picture) in the top right corner. `framed={false}`: the parent supplies the card.
 */
export function WordHero({
  lang,
  term,
  reading,
  readingNode,
  size = "lg",
  toneColors = true,
  align = "start",
  showReading = true,
  framed = true,
  actions,
  aside,
  className,
  innerClassName,
  children,
}: {
  lang: LangCode;
  term: string;
  /** IPA for English, pinyin for Chinese */
  reading?: string | null;
  /** English only: replaces `reading` (e.g. US and UK transcriptions) */
  readingNode?: React.ReactNode;
  size?: SpecimenSize;
  toneColors?: boolean;
  align?: "start" | "center";
  showReading?: boolean;
  framed?: boolean;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
  /** Classes of the padded content area (e.g. a min-height) */
  innerClassName?: string;
  children?: React.ReactNode;
}) {
  const zh = lang === "zh";
  const center = align === "center";

  let body: React.ReactNode;
  if (zh) {
    const chars = Array.from(term.trim());
    const han = chars.filter((c) => containsHan(c));
    const syllables = reading ? segmentPinyin(reading) : [];
    const perChar = showReading && syllables.length === han.length;
    let h = 0;
    body = (
      <>
        <div className={cn("flex flex-wrap gap-x-1.5 gap-y-2", center && "justify-center")}>
          {chars.map((c, i) => {
            const isHan = containsHan(c);
            const syl = isHan && perChar ? syllables[h++] : null;
            return (
              <span key={i} className="flex flex-col items-center gap-1">
                <span lang="zh-CN" className="font-hanzi-sans leading-none font-bold text-fg" style={{ fontSize: ZH[size] }}>
                  {c}
                </span>
                {syl && <PinyinText pinyin={syl} colored={toneColors} className={cn("leading-none font-semibold", size === "sm" ? "text-sm" : "text-lg")} />}
              </span>
            );
          })}
        </div>
        {(actions || (showReading && reading && !perChar)) && (
          <div className={cn("flex items-center gap-1", center && "justify-center")}>
            {showReading && reading && !perChar && <PinyinText pinyin={reading} colored={toneColors} className="text-lg font-semibold" />}
            {actions}
          </div>
        )}
      </>
    );
  } else {
    // Long words and phrases shrink to stay on one or two lines.
    const fit = Math.min(1, 11 / Math.max(term.trim().length, 1));
    body = (
      <>
        <p
          lang="en"
          className={cn("font-extrabold tracking-[-0.03em] break-words text-fg", center && "text-center")}
          style={{ fontSize: fit < 1 ? `calc(${EN[size]} * ${fit.toFixed(3)})` : EN[size], lineHeight: 1.1 }}
        >
          {term}
        </p>
        {(actions || (showReading && (readingNode ?? reading))) && (
          <div className={cn("flex items-center gap-1", center && "justify-center")}>
            {showReading && (readingNode ?? reading) && (
              <span className="flex flex-wrap items-center gap-x-3 font-ipa text-base text-fg-muted">{readingNode ?? reading}</span>
            )}
            {actions}
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className={cn(
        "relative",
        framed && "overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm dark:border-border",
        className,
      )}
    >
      {framed && <div aria-hidden className={cn("h-1", zh ? "bg-zh" : "bg-en")} />}
      {aside && <div className="absolute top-5 right-4">{aside}</div>}
      <div className={cn("flex flex-col gap-3", framed && "p-5 sm:p-6", center && "items-center", innerClassName)}>
        {body}
        {children}
      </div>
    </div>
  );
}
