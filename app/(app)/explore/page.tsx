import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { DeckCover } from "@/components/deck/deck-cover";
import { LangFlag } from "@/components/lang-flag";
import { LANGUAGES } from "@/lib/lang/registry";
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
      <h1 className="text-xl text-ink">Khám phá</h1>
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
            className="h-11 w-full rounded-btn border-2 border-rule bg-surface pr-3 pl-9 text-base text-ink placeholder:text-ink-soft focus:border-ink-blue"
          />
        </div>
        <button type="submit" className="btn-3d h-11 shrink-0 rounded-btn bg-primary px-4 text-sm font-bold text-primary-foreground [--edge-color:var(--ink-blue-shade)]">
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
        <nav aria-label="Sắp xếp" className="flex gap-1">
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={href({ sort: s.value === "popular" ? null : s.value })}
              aria-current={s.value === sort ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-btn px-3 text-sm",
                s.value === sort ? "font-bold text-ink-blue underline decoration-2 underline-offset-8" : "text-ink-soft hover:text-ink",
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </div>

      {decks.length ? (
        <ul className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {decks.map((d) => {
            return (
              <li key={d.id} className="min-w-0">
                <Link
                  href={`/decks/${d.id}`}
                  className="group flex h-full items-center gap-4 rounded-card border border-rule bg-surface p-4 shadow-card transition-transform hover:-translate-y-0.5"
                >
                  <DeckCover id={d.id} language={d.language} className="transition-transform group-hover:-rotate-6" />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-bold leading-snug text-ink">{d.name}</span>
                    {d.description && <span className="block truncate text-sm text-ink">{d.description}</span>}
                    <span className="block truncate text-sm text-ink-soft">
                      {LANGUAGES[d.language].label} · {d.word_count} từ · {d.learner_count} người học · {d.isMine ? "của bạn" : d.owner?.display_name}
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
        <div className="notebook-card mt-6 flex flex-col items-center px-6 py-10 text-center">
          <span aria-hidden className="animate-float text-6xl">
            🔭
          </span>
          <p className="mt-4 font-heading text-xl font-black text-ink">{q ? `Không có bộ từ nào tên có “${q}”.` : "Chưa có bộ từ công khai nào."}</p>
          <p className="mt-1 text-sm text-ink-soft">
            Đặt một bộ từ của bạn ở chế độ “Công khai” trong cài đặt bộ từ để mọi người cùng học.
          </p>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Trang" className="mt-4 flex items-center justify-between gap-2">
          {page > 1 ? (
            <Link href={href({ page: String(page - 1) })} className="inline-flex min-h-11 items-center rounded-btn px-3 text-sm font-medium text-ink-blue">
              ← Trang trước
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-soft">
            Trang {page}/{pages}
          </span>
          {page < pages ? (
            <Link href={href({ page: String(page + 1) })} className="inline-flex min-h-11 items-center rounded-btn px-3 text-sm font-medium text-ink-blue">
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
