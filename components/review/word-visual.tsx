import Image from "next/image";
import { POS, isPosCode } from "@/lib/pos";
import { cn } from "@/lib/utils";
import type { StudyWord } from "@/lib/practice";

/** Picture for a word: its image, else the emoji on a wash tinted by part of speech (§8.3). */
export function WordVisual({
  word,
  size = 112,
  className,
}: {
  word: Pick<StudyWord, "image_url" | "emoji" | "parts_of_speech" | "term">;
  size?: number;
  className?: string;
}) {
  if (word.image_url) {
    return (
      <Image
        src={word.image_url}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        className={cn("shrink-0 rounded-[12px] object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  if (!word.emoji) return null;
  const pos = word.parts_of_speech.find(isPosCode);
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-[12px]",
        pos ? POS[pos].wash : "bg-muted",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.48 }}
    >
      {word.emoji}
    </span>
  );
}
