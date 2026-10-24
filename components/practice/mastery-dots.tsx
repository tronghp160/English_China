import { cn } from "@/lib/utils";

/**
 * Three small dots for how well a word is known in Learn mode (REDESIGN_V3 §8.3): none yet, learning, mastered.
 * The last dot to light up pops once when the count goes up (the key changes with it).
 */
export function MasteryDots({ filled, className }: { filled: 0 | 1 | 2 | 3; className?: string }) {
  const label = ["chưa học", "mới học", "đang học", "đã thuộc"][filled];
  return (
    <span role="img" aria-label={`Mức thuộc: ${label}`} className={cn("inline-flex items-center gap-1", className)}>
      {[1, 2, 3].map((n) => (
        <span
          key={`${n}-${n <= filled ? "on" : "off"}`}
          aria-hidden
          className={cn(
            "size-2 rounded-full transition-colors",
            n <= filled ? (filled === 3 ? "bg-success" : "bg-primary") : "bg-surface-3",
            n === filled && "animate-pop",
          )}
        />
      ))}
    </span>
  );
}
