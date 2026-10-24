import type { CSSProperties } from "react";
import { PinyinText } from "@/components/zh/pinyin-text";
import { containsHan, segmentPinyin } from "@/lib/lang/zh";
import type { LangCode } from "@/lib/lang/types";
import { cn } from "@/lib/utils";

export type SpecimenSize = "sm" | "md" | "lg";

// EN: font size of the word, the notebook line height and how many lines the word row spans.
const EN: Record<SpecimenSize, { font: string; line: string; rows: number }> = {
  lg: { font: "var(--text-word)", line: "2rem", rows: 3 },
  md: { font: "clamp(1.875rem, 6vw, 2.75rem)", line: "2rem", rows: 2 },
  sm: { font: "1.75rem", line: "1.75rem", rows: 2 },
};
// ZH: side of one 田字格 cell.
const ZH: Record<SpecimenSize, string> = {
  lg: "var(--text-hanzi)",
  md: "clamp(3rem, 10vw, 4.25rem)",
  sm: "2.75rem",
};

/**
 * A page of ruled notebook paper with its red margin line. Content that should sit on the rules
 * uses heights in multiples of `line` (default 2rem); `children` get the left padding past the margin.
 */
export function Paper({
  line = "2rem",
  framed = true,
  className,
  innerClassName,
  children,
}: {
  line?: string;
  /** false: no border, radius or background, the parent card supplies them */
  framed?: boolean;
  className?: string;
  innerClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn("ruled-paper margin-line", framed && "overflow-hidden rounded-sheet border border-rule bg-surface", className)}
      style={{ "--line": line } as CSSProperties}
    >
      <div className={cn("pr-4 pl-[calc(var(--margin-x)+1rem)]", innerClassName)}>{children}</div>
    </div>
  );
}

/** One 田字格 cell: seal-red frame, dashed cross and diagonals (REDESIGN_PLAN §5.1). */
export function HanziCell({ char, side }: { char: string; side: string }) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: side, height: side }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full">
        <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="2" fill="none" stroke="var(--seal)" strokeWidth="1.5" strokeOpacity="0.55" vectorEffect="non-scaling-stroke" />
        <g stroke="var(--seal)" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke">
          <path d="M50 1V99M1 50H99" vectorEffect="non-scaling-stroke" />
          <path d="M1 1L99 99M99 1L1 99" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      <span lang="zh-CN" className="relative font-hanzi leading-none font-medium text-ink" style={{ fontSize: `calc(${side} * 0.72)` }}>
        {char}
      </span>
    </span>
  );
}

/**
 * A word shown as a specimen, the one signature element of the app:
 * English sits on a ruled notebook page with a red margin line, Chinese goes into 田字格 cells
 * with the pinyin under each cell. `actions` (pronounce button) sits at the end of the reading line,
 * `children` below it, `aside` (a picture) in the top right corner.
 */
export function WordSpecimen({
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
  /** Classes of the padded content area of the English page (e.g. a min-height) */
  innerClassName?: string;
  children?: React.ReactNode;
}) {
  if (lang === "zh") {
    const chars = Array.from(term.trim());
    const han = chars.filter((c) => containsHan(c));
    const syllables = reading ? segmentPinyin(reading) : [];
    const perCell = showReading && syllables.length === han.length;
    let h = 0;
    return (
      <div className={cn("relative flex flex-col gap-3", align === "center" && "items-center", className)}>
        {aside && <div className="absolute top-0 right-0">{aside}</div>}
        <div className="flex flex-wrap gap-1.5" style={align === "center" ? { justifyContent: "center" } : undefined}>
          {chars.map((c, i) => {
            const isHan = containsHan(c);
            const syl = isHan && perCell ? syllables[h++] : null;
            return (
              <span key={i} className="flex flex-col items-center gap-1">
                {isHan ? (
                  <HanziCell char={c} side={ZH[size]} />
                ) : (
                  <span lang="zh-CN" className="self-end font-hanzi text-2xl text-ink-soft">
                    {c}
                  </span>
                )}
                {syl && <PinyinText pinyin={syl} colored={toneColors} className={cn("leading-none font-medium", size === "sm" ? "text-sm" : "text-lg")} />}
              </span>
            );
          })}
        </div>
        {(actions || (showReading && reading && !perCell)) && (
          <div className="flex items-center gap-1">
            {showReading && reading && !perCell && (
              <PinyinText pinyin={reading} colored={toneColors} className="text-lg font-medium" />
            )}
            {actions}
          </div>
        )}
        {children}
      </div>
    );
  }

  const cfg = EN[size];
  // Long words and phrases shrink to stay on one ruled line.
  const fit = Math.min(1, 11 / Math.max(term.trim().length, 1));
  return (
    <Paper line={cfg.line} framed={framed} className={cn("relative", className)} innerClassName={innerClassName}>
      {aside && <div className="absolute top-4 right-4">{aside}</div>}
      <p
        lang="en"
        className="flex items-end font-display font-medium break-words text-ink"
        style={{ minHeight: `calc(var(--line) * ${cfg.rows})`, fontSize: fit < 1 ? `calc(${cfg.font} * ${fit.toFixed(3)})` : cfg.font, lineHeight: 1 }}
      >
        {/* In a line-height 1 box the baseline is on the box's bottom edge, which is a rule: descenders cross it like handwriting */}
        <span className="translate-y-[0.035em]">{term}</span>
      </p>
      <div className="flex items-end gap-1" style={{ height: "var(--line)" }}>
        {showReading && (readingNode ?? reading) && (
          <span className="flex translate-y-[0.1em] flex-wrap items-center gap-x-3 font-ipa text-base leading-none text-ink-soft">{readingNode ?? reading}</span>
        )}
        {actions && <span className="-mb-2 flex">{actions}</span>}
      </div>
      {children}
    </Paper>
  );
}
