import Link from "next/link";
import { CheckCircle2, Globe2, Link2, Lock, Plus, Users } from "lucide-react";
import { DeckCover } from "@/components/deck/deck-cover";
import { SampleDecksButton } from "@/components/deck/sample-decks-button";
import { LangFlag } from "@/components/lang-flag";
import { buttonVariants } from "@/components/ui/button";
import { deckTone } from "@/lib/deck-colors";
import { LANGUAGES } from "@/lib/lang/registry";
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

function DeckCard({ d }: { d: DeckRow }) {
  const started = Math.max(0, d.word_count - Number(d.new_count));
  const pct = d.word_count ? Math.round((started / d.word_count) * 100) : 0;
  return (
    <Link
      href={`/decks/${d.id}`}
      className="group flex h-full items-center gap-4 rounded-card border border-rule bg-surface p-4 shadow-card transition-transform hover:-translate-y-0.5"
    >
      <DeckCover id={d.id} language={d.language} className="transition-transform group-hover:-rotate-6" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="line-clamp-2 font-bold leading-snug text-ink">{d.name}</span>
          <span className="shrink-0 text-ink-soft">
            <VisibilityIcon deck={d} />
          </span>
        </span>
        <span className="block truncate text-sm text-ink-soft">
          {LANGUAGES[d.language].label} · {d.word_count} từ
          {d.relation !== "own" && ` · ${d.group_name ? `${d.group_name} · ` : ""}${d.owner_name}`}
        </span>
        <span className="mt-2 flex items-center gap-2">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <span className={cn("block h-full rounded-full", deckTone(d.id).bar)} style={{ width: `${pct}%` }} />
          </span>
          <span className="shrink-0 text-xs whitespace-nowrap text-ink-soft tabular-nums">{pct}% đã học</span>
        </span>
      </span>
      {d.due_count > 0 ? (
        <span className="flex shrink-0 flex-col items-center rounded-2xl bg-wash-red px-2.5 py-1.5 text-danger">
          <span className="font-heading text-lg leading-none font-black tabular-nums">{d.due_count}</span>
          <span className="text-[0.6875rem] font-semibold">cần ôn</span>
        </span>
      ) : (
        <CheckCircle2 className="size-6 shrink-0 text-jade" aria-label="Không còn từ cần ôn" />
      )}
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
      <nav aria-label="Lọc theo ngôn ngữ" className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const active = f.value === langFilter;
          return (
            <Link
              key={f.label}
              href={f.value ? `/decks?lang=${f.value}` : "/decks"}
              aria-current={active ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 text-sm font-semibold transition-colors",
                active ? "border-ink-blue bg-ink-blue text-primary-foreground" : "border-rule bg-surface text-ink-soft hover:text-ink",
              )}
            >
              {f.value && <LangFlag lang={f.value} className="mr-1.5" />}
              {f.label}
            </Link>
          );
        })}
      </nav>

      {!shown.length && (
        <div className="notebook-card mt-6 flex flex-col items-center px-6 py-10 text-center">
          <span aria-hidden className="animate-float text-6xl">
            📒
          </span>
          <p className="mt-4 font-heading text-xl font-black text-ink">Chưa có bộ từ nào</p>
          <p className="mt-1 max-w-sm text-ink-soft">Thêm vài bộ từ mẫu để thử ngay, hoặc tự tạo bộ từ đầu tiên của bạn.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <SampleDecksButton variant="default" />
            <Link href="/decks/new" className={cn(buttonVariants({ variant: "outline" }), "h-12 gap-2 px-5 text-base")}>
              <Plus className="size-5" aria-hidden />
              Tạo bộ từ
            </Link>
          </div>
        </div>
      )}

      {groups.map(({ rel, items }) => (
        <section key={rel} className="mt-7">
          <h2 className="mb-3 text-lg text-ink">{RELATION_TITLE[rel]}</h2>
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
