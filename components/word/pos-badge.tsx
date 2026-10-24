import { Badge } from "@/components/ui/badge";
import { POS, isPosCode } from "@/lib/pos";

/** Part of speech as a small violet chip. */
export function PosBadge({ pos, className }: { pos: string; className?: string }) {
  if (!isPosCode(pos)) return null;
  return (
    <Badge variant="soft" tone="grape" className={className}>
      {POS[pos].label}
    </Badge>
  );
}
