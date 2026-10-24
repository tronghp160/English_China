import Link from "next/link";
import { Plus } from "lucide-react";
import { DeckCard, type DeckRow } from "@/components/deck/deck-card";
import { SampleDecksButton } from "@/components/deck/sample-decks-button";
import { Button } from "@/components/ui/button";
import { EndPup } from "@/components/mascot/end-pup";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented";

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
          figure={<EndPup mood="wave" figure="notebook" size={96} />}
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
            <span className="text-sm font-normal text-fg-muted tabular-nums">{items.length}</span>
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
