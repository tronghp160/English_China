import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { LangFlag } from "@/components/lang-flag";
import { EXPLORE_PAGE_SIZE, getPublicDecks, type ExploreSort } from "@/lib/data/explore";
import { cn } from "@/lib/utils";

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

  const href = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams();
    const next = { lang, q: q || null, sort: sort === "popular" ? null : sort, page: null, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `/explore?${s}` : "/explore";
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Khám phá</h1>
      <p className="mt-1 text-sm text-ink-soft">Bộ từ công khai do mọi người chia sẻ. Học trực tiếp hoặc sao chép về.</p>

      <form action="/explore" role="search" className="mt-4 flex gap-2">
        {lang && <input type="hidden" name="lang" value={lang} />}
        {sort !== "popular" && <input type="hidden" name="sort" value={sort} />}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Tìm theo tên bộ từ"
            aria-label="Tìm theo tên bộ từ"
            className="h-11 w-full rounded-[10px] border border-rule bg-surface pr-3 pl-9 text-base text-ink placeholder:text-ink-soft"
          />
        </div>
        <button type="submit" className="h-11 shrink-0 rounded-[10px] border border-rule bg-surface px-4 text-sm font-medium text-ink hover:bg-muted">
          Tìm
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Lọc theo ngôn ngữ" className="flex gap-2 overflow-x-auto pb-1">
          {LANG_FILTERS.map((f) => {
            const active = f.value === lang;
            return (
              <Link
                key={f.label}
                href={href({ lang: f.value })}
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
        <nav aria-label="Sắp xếp" className="flex gap-1">
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={href({ sort: s.value === "popular" ? null : s.value })}
              aria-current={s.value === sort ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-[10px] px-3 text-sm",
                s.value === sort ? "font-medium text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      {decks.length ? (
        <ul className="ruled-list mt-4 overflow-hidden rounded-[12px] border border-rule bg-surface">
          {decks.map((d) => {
            return (
              <li key={d.id}>
                <Link
                  href={`/decks/${d.id}`}
                  className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <LangFlag lang={d.language} label className="text-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{d.name}</span>
                    {d.description && <span className="block truncate text-sm text-ink">{d.description}</span>}
                    <span className="block truncate text-sm text-ink-soft">
                      {d.word_count} từ · {d.learner_count} người học · {d.isMine ? "của bạn" : d.owner?.display_name}
                      {d.isSubscribed && (
                        <>
                          {" · "}
                          <span className="text-jade-text">đang học</span>
                        </>
                      )}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-ink-soft" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="notebook-card mt-6 px-6 py-8">
          <p className="font-medium text-ink">{q ? `Không có bộ từ nào tên có “${q}”.` : "Chưa có bộ từ công khai nào."}</p>
          <p className="mt-1 text-sm text-ink-soft">
            Đặt một bộ từ của bạn ở chế độ “Công khai” trong cài đặt bộ từ để mọi người cùng học.
          </p>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Trang" className="mt-4 flex items-center justify-between gap-2">
          {page > 1 ? (
            <Link href={href({ page: String(page - 1) })} className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-sm font-medium text-ink-blue">
              ← Trang trước
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-soft">
            Trang {page}/{pages}
          </span>
          {page < pages ? (
            <Link href={href({ page: String(page + 1) })} className="inline-flex min-h-11 items-center rounded-[10px] px-3 text-sm font-medium text-ink-blue">
              Trang sau →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
