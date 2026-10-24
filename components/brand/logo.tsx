import { cn } from "@/lib/utils";

/**
 * Wordmark: a blue tile with a white "S" and a small sun dot, then "Sổ Từ" (REDESIGN_V2 §5.15).
 * The letter is CSS content so it never clashes with link/button labels (WCAG 2.5.3).
 * Same art as the app icon (scripts/gen-icons.mjs).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex items-center gap-2.5 font-heading text-fg", className)}>
      <span
        aria-hidden
        className="relative grid size-9 place-items-center rounded-[11px] bg-primary text-xl leading-none font-extrabold text-on-primary"
      >
        <span className="before:content-['S']" />
        <span className="absolute -top-[3px] -right-[3px] size-[11px] rounded-full border-2 border-canvas bg-c-sun" />
      </span>
      <span className="text-[1.375rem] font-extrabold tracking-[-0.03em]">Sổ Từ</span>
    </span>
  );
}
