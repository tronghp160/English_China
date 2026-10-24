import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DeckArtBlock } from "@/components/deck/deck-art";
import { SubscribeButton } from "@/components/deck/subscribe-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SegmentedNav } from "@/components/ui/segmented";
import { LANGUAGES } from "@/lib/lang/registry";
import { getDeckSamples } from "@/lib/data/decks";
import { EXPLORE_PAGE_SIZE, getPublicDecks, type ExploreSort } from "@/lib/data/explore";

export const metadata: Metadata = { title: "Khám phá" };

const LANG_FILTERS = [
  { value: null, label: "Tất cả" },
  { value: "en", label: "Tiếng Anh" },
  { value: "zh", label: "Tiếng Trung" },
] as const;

const SORTS: { value: ExploreSort; label: string }[] = [
  { value: "popular", label: "Nhiều người học" },
  { value: "new", label: "Mới nhất" },
];

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const params = await searchParams;
  const lang = params.lang === "en" || params.lang === "zh" ? params.lang : null;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const sort: ExploreSort = params.sort === "new" ? "new" : "popular";
  const page = Math.max(1, Math.min(100, Number(params.page) || 1));
  const { decks, total } = await getPublicDecks({ lang, q, sort, page });
  const pages = Math.ceil(total / EXPLORE_PAGE_SIZE);
  const samples = await getDeckSamples(decks.map((d) => d.id));

  const href = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams();
    const next = { lang, q: q || null, sort: sort === "popular" ? null : sort, page: null, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `/explore?${s}` : "/explore";
  };

  return (
    <div>
      <h1 className="text-[1.6875rem] sm:text-[2.125rem]">Khám phá</h1>
      <p className="mt-1 text-fg-muted">Bộ từ công khai do mọi người chia sẻ. Học trực tiếp hoặc sao chép về.</p>

      <form action="/explore" role="search" className="mt-5 flex max-w-xl gap-2">
        {lang && <input type="hidden" name="lang" value={lang} />}
        {sort !== "popular" && <input type="hidden" name="sort" value={sort} />}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[1.125rem] -translate-y-1/2 text-fg-muted" strokeWidth={1.75} aria-hidden />
          <Input type="search" name="q" defaultValue={q} placeholder="Tìm theo tên bộ từ" aria-label="Tìm theo tên bộ từ" className="rounded-full pl-11" />
        </div>
        <Button type="submit" variant="secondary" className="h-12 rounded-full px-5">
          Tìm
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <SegmentedNav
          label="Lọc theo ngôn ngữ"
          scroll
          items={LANG_FILTERS.map((f) => ({ label: f.label, href: href({ lang: f.value }), active: f.value === lang }))}
        />
        <SegmentedNav
          label="Sắp xếp"
          scroll
          items={SORTS.map((s) => ({ label: s.label, href: href({ sort: s.value === "popular" ? null : s.value }), active: s.value === sort }))}
        />
      </div>

      {decks.length ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {decks.map((d) => (
            <li key={d.id} className="min-w-0">
              <Card interactive className="flex h-full flex-col overflow-hidden">
                <Link href={`/decks/${d.id}`} className="flex flex-1 flex-col">
                  <DeckArtBlock id={d.id} language={d.language} name={d.name} sample={samples[d.id]} />
                  <span className="flex flex-1 flex-col gap-1 px-4 pt-3.5">
                    <span className="line-clamp-2 leading-snug font-bold text-fg">{d.name}</span>
                    {d.description && <span className="line-clamp-1 text-sm text-fg">{d.description}</span>}
                    <span className="flex flex-wrap gap-x-3 text-[0.8125rem] text-fg-muted">
                      <span>{LANGUAGES[d.language].label}</span>
                      <span>{d.word_count} từ</span>
                      <span>{d.isMine ? "của bạn" : d.owner?.display_name}</span>
                    </span>
                  </span>
                </Link>
                <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-4">
                  <span className="text-sm font-semibold text-fg-muted tabular-nums">{d.learner_count} người học</span>
                  {d.isSubscribed ? (
                    <Badge variant="success" className="h-7">
                      <Check aria-hidden />
                      Đang theo học
                    </Badge>
                  ) : !d.isMine ? (
                    <SubscribeButton deckId={d.id} subscribed={false} variant="secondary" size="sm" />
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-6"
          figure="notebook"
          title={q ? `Không có bộ từ nào khớp “${q}”.` : "Chưa có bộ từ công khai nào."}
          actions={
            q || lang ? (
              <Button asChild variant="outline">
                <Link href="/explore">Xóa bộ lọc</Link>
              </Button>
            ) : undefined
          }
        >
          Đặt một bộ từ của bạn ở chế độ “Công khai” trong cài đặt bộ từ để mọi người cùng học.
        </EmptyState>
      )}

      {pages > 1 && (
        <nav aria-label="Trang" className="mt-6 flex items-center justify-between gap-2">
          {page > 1 ? (
            <Button asChild variant="ghost">
              <Link href={href({ page: String(page - 1) })}>
                <ChevronLeft aria-hidden />
                Trang trước
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-fg-muted tabular-nums">
            Trang {page}/{pages}
          </span>
          {page < pages ? (
            <Button asChild variant="ghost">
              <Link href={href({ page: String(page + 1) })}>
                Trang sau
                <ChevronRight aria-hidden />
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
