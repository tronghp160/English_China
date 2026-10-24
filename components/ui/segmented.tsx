import Link from "next/link";
import { cn } from "@/lib/utils";

export type SegmentedItem = {
  label: React.ReactNode;
  /** Plain-text name for assistive tech when `label` is not text only */
  name?: string;
  href: string;
  active: boolean;
};

/**
 * Segmented control made of links (filters and sort orders live in the URL): a sunken pill track,
 * the chosen segment lifts onto a white pill (REDESIGN_PLAN §5.7).
 */
export function SegmentedNav({
  items,
  label,
  className,
  scroll = false,
}: {
  items: SegmentedItem[];
  /** aria-label of the nav landmark */
  label: string;
  className?: string;
  scroll?: boolean;
}) {
  return (
    <nav aria-label={label} className={cn("max-w-full", scroll && "overflow-x-auto", className)}>
      <ul className="inline-flex gap-0.5 rounded-full bg-surface-2 p-1">
        {items.map((it, i) => (
          <li key={i}>
            <Link
              href={it.href}
              aria-current={it.active ? "true" : undefined}
              aria-label={it.name}
              className={cn(
                "inline-flex h-9 min-w-11 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-[var(--dur-fast)]",
                it.active ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg",
              )}
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
