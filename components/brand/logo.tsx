import { cn } from "@/lib/utils";

/** Wordmark: violet tile with a white "S" over a highlighter stroke (same art as the app icon). */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex items-center gap-2 font-heading text-ink", className)}>
      <span
        aria-hidden
        className="relative grid size-9 place-items-center overflow-hidden rounded-[11px] brand-tile shadow-[0_3px_0_0_var(--ink-blue-shade)]"
      >
        <span className="absolute top-[55%] left-[22%] h-[16%] w-[56%] -rotate-6 rounded-sm bg-highlight" />
        <span className="relative text-[1.35rem] leading-none font-black text-white before:content-['S']" />
      </span>
      <span className="text-xl font-black tracking-tight">Sổ Từ</span>
    </span>
  );
}
