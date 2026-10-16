import { cn } from "@/lib/utils";

/** Wordmark: "Sổ Từ" with the notebook margin line. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex items-center gap-2 font-bold text-ink", className)}>
      <span
        aria-hidden
        className="relative grid size-8 place-items-center rounded-[8px] border border-rule bg-surface"
      >
        <span className="absolute inset-y-1 left-[9px] w-[2px] rounded bg-margin-red" />
        <span className="ml-1.5 text-[0.95rem] leading-none text-ink-blue">S</span>
      </span>
      <span className="text-lg tracking-tight">Sổ Từ</span>
    </span>
  );
}
