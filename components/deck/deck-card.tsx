import Link from "next/link";
import { Check, Globe2, Link2, Lock, Play, Users } from "lucide-react";
import { DeckArtBlock } from "@/components/deck/deck-art";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { deckColor, deckColorClasses } from "@/lib/deck-colors";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export type DeckRow = Database["public"]["Functions"]["my_decks"]["Returns"][number];

export function VisibilityIcon({ deck, className }: { deck: Pick<DeckRow, "visibility" | "share_slug">; className?: string }) {
  const cls = cn("size-3.5", className);
  if (deck.visibility === "public") return <Globe2 className={cls} aria-label="Công khai" />;
  if (deck.visibility === "group") return <Users className={cls} aria-label="Nhóm" />;
  if (deck.share_slug) return <Link2 className={cls} aria-label="Chia sẻ bằng link" />;
  return <Lock className={cls} aria-label="Riêng tư" />;
}

/**
 * A deck as a card (REDESIGN_V2 §6.4): a pale block in the deck's color with its first word, the name,
 * the word count with a "need review" badge, and progress in the deck's color. The whole card is the link.
 */
export function DeckCard({
  d,
  sample,
  compact,
  trailing,
  quickReview,
  className,
}: {
  d: DeckRow;
  /** First word of the deck, shown on the art */
  sample?: string;
  /** The smaller card of the phone carousel */
  compact?: boolean;
  trailing?: React.ReactNode;
  /** A small "Ôn" button over the art for a mouse: shows on hover or focus when the deck has cards due. */
  quickReview?: boolean;
  className?: string;
}) {
  const started = Math.max(0, d.word_count - Number(d.new_count));
  const pct = d.word_count ? Math.round((started / d.word_count) * 100) : 0;
  const color = deckColorClasses(deckColor(d.id));
  return (
    <Card interactive className={cn("group/deck relative h-full overflow-hidden", className)}>
      <Link href={`/decks/${d.id}`} className="flex h-full flex-col rounded-[inherit]">
        <DeckArtBlock id={d.id} language={d.language} name={d.name} sample={sample} compact={compact}>
          <span className="grid size-6 place-items-center rounded-full bg-white/80 text-fg-muted">
            <VisibilityIcon deck={d} className="size-3" />
          </span>
        </DeckArtBlock>
        <span className={cn("flex flex-1 flex-col gap-2", compact ? "px-3.5 pt-3 pb-3.5" : "px-4 pt-3.5 pb-4")}>
          <span className={cn("line-clamp-2 leading-snug font-bold text-fg", compact ? "text-[0.9375rem]" : "text-base")}>{d.name}</span>
          <span className="flex items-center justify-between gap-2 text-[0.8125rem] text-fg-muted">
            <span className="flex min-w-0 flex-wrap gap-x-2">
              <span>{d.word_count} từ</span>
              {d.relation !== "own" && d.owner_name && <span className="truncate">{d.owner_name}</span>}
            </span>
            {trailing ??
              (d.due_count > 0 ? (
                <Badge variant="due" className="h-[1.375rem]">{d.due_count} cần ôn</Badge>
              ) : (
                <Badge variant="success" className="h-[1.375rem]">
                  <Check aria-hidden /> Đã ôn xong
                </Badge>
              ))}
          </span>
          <span className="mt-auto block h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <span className={cn("block h-full rounded-full", color.bar)} style={{ width: `${pct}%` }} />
          </span>
          <span className="sr-only">{pct}% đã học</span>
        </span>
      </Link>
      {quickReview && d.due_count > 0 && (
        <Link
          href={`/review?deck=${d.id}`}
          aria-label={`Ôn bộ ${d.name}`}
          className="absolute top-2 right-2 hidden min-h-10 items-center gap-1 rounded-full bg-primary px-3 text-sm font-bold text-on-primary opacity-0 shadow-primary transition-opacity group-focus-within/deck:opacity-100 group-hover/deck:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:inline-flex"
        >
          <Play className="size-3 fill-current" aria-hidden />
          Ôn
        </Link>
      )}
    </Card>
  );
}
