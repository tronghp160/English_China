import Link from "next/link";
import { Check, Globe2, Link2, Lock, Plus, Users } from "lucide-react";
import { DeckCover } from "@/components/deck/deck-cover";
import { SampleDecksButton } from "@/components/deck/sample-decks-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented";
import { deckTone } from "@/lib/deck-colors";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type DeckRow = Database["public"]["Functions"]["my_decks"]["Returns"][number];

const FILTERS = [
  { value: null, label: "Tất cả" },
  { value: "en", label: "Tiếng Anh" },
  { value: "zh", label: "Tiếng Trung" },
] as const;

const RELATION_TITLE: Record<string, string> = {
  own: "Bộ từ của tôi",
  subscribed: "Đang theo học",
  group: "Bộ từ của nhóm",
};

export function VisibilityIcon({ deck, className }: { deck: Pick<DeckRow, "visibility" | "share_slug">; className?: string }) {
  const cls = cn("size-3.5", className);
  if (deck.visibility === "public") return <Globe2 className={cls} aria-label="Công khai" />;
  if (deck.visibility === "group") return <Users className={cls} aria-label="Nhóm" />;
  if (deck.share_slug) return <Link2 className={cls} aria-label="Chia sẻ bằng link" />;
  return <Lock className={cls} aria-label="Riêng tư" />;
}

/** A deck on the shelf: its notebook cover, name, a few facts as separate pieces, progress in the cover's color. */
export function DeckCard({ d, trailing }: { d: DeckRow; trailing?: React.ReactNode }) {
  const started = Math.max(0, d.word_count - Number(d.new_count));
  const pct = d.word_count ? Math.round((started / d.word_count) * 100) : 0;
  return (
    <Link
      href={`/decks/${d.id}`}
      className="group flex h-full items-center gap-4 rounded-card border border-rule bg-surface p-4 transition-colors duration-[var(--dur-fast)] hover:border-rule-strong"
    >
      <DeckCover
        id={d.id}
        language={d.language}
        name={d.name}
        className="transition-transform duration-[var(--dur-fast)] group-hover:-translate-x-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="line-clamp-2 leading-snug font-semibold text-ink">{d.name}</span>
          <span className="shrink-0 text-ink-soft">
            <VisibilityIcon deck={d} />
          </span>
        </span>
        <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-soft">
          <span>{d.word_count} từ</span>
          {d.relation !== "own" && d.group_name && <span className="truncate">{d.group_name}</span>}
          {d.relation !== "own" && <span className="truncate">{d.owner_name}</span>}
        </span>
        <span className="mt-2 flex items-center gap-2">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-sunk">
            <span className={cn("block h-full rounded-full", deckTone(d.id).bar)} style={{ width: `${pct}%` }} />
          </span>
          <span className="shrink-0 text-xs whitespace-nowrap text-ink-soft tabular-nums">{pct}% đã học</span>
        </span>
      </span>
      {trailing ??
        (d.due_count > 0 ? (
          <span className="shrink-0 text-right text-sm font-semibold text-seal-text tabular-nums">{d.due_count} cần ôn</span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 text-sm text-leaf-text">
            <Check className="size-4" aria-hidden />
            Đã ôn xong
          </span>
        ))}
    </Link>
  );
}

export function DeckList({ decks, langFilter }: { decks: DeckRow[]; langFilter: "en" | "zh" | null }) {
  const shown = langFilter ? decks.filter((d) => d.language === langFilter) : decks;
  const groups = (["own", "subscribed", "group"] as const)
    .map((rel) => ({ rel, items: shown.filter((d) => d.relation === rel) }))
    .filter((g) => g.items.length);

  return (
    <>
      <SegmentedNav
        label="Lọc theo ngôn ngữ"
        className="mt-4"
        scroll
        items={FILTERS.map((f) => ({
          label: f.label,
          href: f.value ? `/decks?lang=${f.value}` : "/decks",
          active: f.value === langFilter,
        }))}
      />

      {!shown.length && (
        <EmptyState
          className="mt-6"
          figure="notebook"
          title="Chưa có bộ từ nào."
          actions={
            <>
              <SampleDecksButton variant="default" />
              <Button asChild variant="outline">
                <Link href="/decks/new">
                  <Plus aria-hidden />
                  Tạo bộ từ
                </Link>
              </Button>
            </>
          }
        >
          Thêm vài bộ từ mẫu để thử ngay, hoặc tự tạo bộ từ đầu tiên.
        </EmptyState>
      )}

      {groups.map(({ rel, items }) => (
        <section key={rel} className="mt-8" aria-labelledby={`decks-${rel}`}>
          <h2 id={`decks-${rel}`} className="mb-3 flex items-baseline gap-2 text-lg">
            {RELATION_TITLE[rel]}
            <span className="text-sm font-normal text-ink-soft tabular-nums">{items.length}</span>
          </h2>
          <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {items.map((d) => (
              <li key={d.id} className="min-w-0">
                <DeckCard d={d} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
