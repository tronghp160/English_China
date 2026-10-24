import { cn } from "@/lib/utils";

/**
 * Wordmark: a violet tile holding a thin 田字格 cell with a serif "S", then "Sổ Từ".
 * The letter is CSS content so it never clashes with link/button labels (WCAG 2.5.3).
 * Same art as the app icon (scripts/gen-icons.mjs).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex items-center gap-2 font-heading text-ink", className)}>
      <span
        aria-hidden
        className="relative grid size-7 bg-ink-violet place-items-center overflow-hidden rounded-sm text-primary-foreground"
      >
        <svg viewBox="0 0 28 28" className="absolute inset-0 size-full" fill="none" stroke="currentColor" strokeWidth={1}>
          <rect x="3.5" y="3.5" width="21" height="21" rx="1.5" opacity="0.7" />
          <path d="M14 3.5v21M3.5 14h21" strokeDasharray="2 2" opacity="0.35" />
        </svg>
        <span className="relative font-display text-[1.0625rem] leading-none font-semibold before:content-['S']" />
      </span>
      <span className="text-xl font-bold tracking-[-0.02em]">Sổ Từ</span>
    </span>
  );
}
