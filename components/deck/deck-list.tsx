import Link from "next/link";
import { ChevronRight, Globe2, Link2, Lock, Users } from "lucide-react";
import { LangFlag } from "@/components/lang-flag";
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

function VisibilityIcon({ deck }: { deck: DeckRow }) {
  if (deck.visibility === "public") return <Globe2 className="size-3.5" aria-label="Công khai" />;
  if (deck.visibility === "group") return <Users className="size-3.5" aria-label="Nhóm" />;
  if (deck.share_slug) return <Link2 className="size-3.5" aria-label="Chia sẻ bằng link" />;
  return <Lock className="size-3.5" aria-label="Riêng tư" />;
}

export function DeckList({ decks, langFilter }: { decks: DeckRow[]; langFilter: "en" | "zh" | null }) {
  const shown = langFilter ? decks.filter((d) => d.language === langFilter) : decks;
  const groups = (["own", "subscribed", "group"] as const)
    .map((rel) => ({ rel, items: shown.filter((d) => d.relation === rel) }))
    .filter((g) => g.items.length);

  return (
    <>
      <nav aria-label="Lọc theo ngôn ngữ" className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const active = f.value === langFilter;
          return (
            <Link
              key={f.label}
              href={f.value ? `/decks?lang=${f.value}` : "/decks"}
              aria-current={active ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm",
                active ? "border-ink-blue bg-wash-blue font-medium text-ink" : "border-rule text-ink-soft",
              )}
            >
              {f.value && <LangFlag lang={f.value} className="mr-1.5" />}
              {f.label}
            </Link>
          );
        })}
      </nav>

      {!shown.length && (
        <div className="notebook-card mt-6 px-6 py-8">
          <p className="font-medium text-ink">Chưa có bộ từ nào.</p>
          <p className="mt-1 text-sm text-ink-soft">Tạo bộ từ đầu tiên để bắt đầu ghi từ.</p>
          <Link
            href="/decks/new"
            className="mt-4 inline-flex min-h-11 items-center rounded-[10px] bg-primary px-5 font-medium text-primary-foreground"
          >
            Tạo bộ từ
          </Link>
        </div>
      )}

      {groups.map(({ rel, items }) => (
        <section key={rel} className="mt-8">
          <h2 className="mb-2 text-sm font-medium text-ink-soft">{RELATION_TITLE[rel]}</h2>
          <ul className="ruled-list overflow-hidden rounded-xl border border-rule bg-surface">
            {items.map((d) => {
              return (
                <li key={d.id}>
                  <Link
                    href={`/decks/${d.id}`}
                    className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                  >
                    <LangFlag lang={d.language} label className="text-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-ink">{d.name}</span>
                        <span className="shrink-0 text-ink-soft">
                          <VisibilityIcon deck={d} />
                        </span>
                      </span>
                      <span className="block truncate text-sm text-ink-soft">
                        {d.word_count} từ
                        {d.relation !== "own" && ` · ${d.group_name ? `${d.group_name} · ` : ""}${d.owner_name}`}
                      </span>
                    </span>
                    {d.due_count > 0 && (
                      <span className="shrink-0 text-right">
                        <span className="highlighter font-bold text-ink">{d.due_count}</span>
                        <span className="block text-xs text-ink-soft">cần ôn</span>
                      </span>
                    )}
                    <ChevronRight className="size-5 shrink-0 text-ink-soft" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
