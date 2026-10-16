import { POS, isPosCode } from "@/lib/pos";
import { cn } from "@/lib/utils";

export function PosBadge({ pos, className }: { pos: string; className?: string }) {
  if (!isPosCode(pos)) return null;
  const info = POS[pos];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        info.badge,
        info.wash,
        className,
      )}
    >
      {info.label}
    </span>
  );
}
