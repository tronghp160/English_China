import { cn } from "@/lib/utils";
import { segmentPinyin, toneOf } from "@/lib/lang/zh";

const TONE_CLASS = ["", "text-tone-1", "text-tone-2", "text-tone-3", "text-tone-4", "text-tone-5"];

/**
 * Pinyin with tone colors. Tone marks always stay visible, so color is never
 * the only carrier of tone information.
 */
export function PinyinText({
  pinyin,
  colored = true,
  className,
}: {
  pinyin: string;
  colored?: boolean;
  className?: string;
}) {
  if (!colored) return <span className={className}>{pinyin}</span>;
  // Keep the author's spacing: segment each space-separated chunk independently.
  const words = pinyin.split(/(\s+)/);
  return (
    <span className={className}>
      {words.map((word, wi) =>
        /^\s+$/.test(word) ? (
          word
        ) : (
          <span key={wi}>
            {segmentPinyin(word).map((syl, si) => (
              <span key={si} className={cn(TONE_CLASS[toneOf(syl)])}>
                {syl}
              </span>
            ))}
          </span>
        ),
      )}
    </span>
  );
}
