import { cn } from "@/lib/utils";

/**
 * Wordmark: a blue tile with a white "S" and a small sun dot, then "Sổ Từ" (REDESIGN_V2 §5.15).
 * The letter is CSS content so it never clashes with link/button labels (WCAG 2.5.3).
 * Same art as the app icon (scripts/gen-icons.mjs).
 */
export function Logo({ className, inverse }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cn("relative inline-flex items-center gap-2.5 font-heading", inverse ? "text-white" : "text-fg", className)}>
      <span
        aria-hidden
        className={cn("relative grid size-9 place-items-center rounded-[11px] text-xl leading-none font-extrabold", inverse ? "bg-white text-primary-press" : "bg-primary text-on-primary")}
      >
        <span className="before:content-['S']" />
        <span className={cn("absolute -top-[3px] -right-[3px] size-[11px] rounded-full border-2 bg-c-sun", inverse ? "border-primary" : "border-canvas")} />
      </span>
      <span className="text-[1.375rem] font-extrabold tracking-[-0.03em]">Sổ Từ</span>
    </span>
  );
}
