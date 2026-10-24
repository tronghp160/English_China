import { cn } from "@/lib/utils";

/**
 * The card on top of a deck (REDESIGN_V3 §8.1): up to two blank cards peek out under it, smaller and lower, so the
 * pile reads as many cards left. `behind` is how many more cards are waiting (only 0 to 2 are drawn). Decorative.
 * `children` is the card itself; an `overlay` (a card flying away, a drag hint) sits above everything.
 */
export function CardStack({
  behind,
  children,
  overlay,
  className,
}: {
  behind: number;
  children: React.ReactNode;
  overlay?: React.ReactNode;
  className?: string;
}) {
  const ghosts = Math.max(0, Math.min(2, behind));
  return (
    <div className={cn("relative mx-auto w-full max-w-[32.5rem] pb-5", className)}>
      {ghosts >= 2 && (
        <span aria-hidden className="absolute inset-x-0 top-5 bottom-0 origin-bottom scale-[0.92] rounded-xl bg-surface opacity-60 shadow-md dark:border dark:border-border" />
      )}
      {ghosts >= 1 && (
        <span aria-hidden className="absolute inset-x-0 top-2.5 bottom-2.5 origin-bottom scale-[0.96] rounded-xl bg-surface opacity-85 shadow-md dark:border dark:border-border" />
      )}
      <div className="relative">{children}</div>
      {overlay}
    </div>
  );
}
