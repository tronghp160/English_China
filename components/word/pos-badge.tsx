import { Badge } from "@/components/ui/badge";
import { POS, isPosCode } from "@/lib/pos";

/** Part of speech as a small outlined tag. */
export function PosBadge({ pos, className }: { pos: string; className?: string }) {
  if (!isPosCode(pos)) return null;
  return (
    <Badge variant="outline" className={className}>
      {POS[pos].label}
    </Badge>
  );
}
