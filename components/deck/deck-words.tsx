"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, LayoutGrid, List, Loader2, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOptionalMe } from "@/components/app-shell/me-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PinyinText } from "@/components/zh/pinyin-text";
import { bulkWords, loadDeckWords, type DeckWordQuery, type DeckWordRow } from "@/lib/actions/words";
import { LANGUAGES, levelOf } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { POS, posFor } from "@/lib/pos";
import { STANDARD_TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { StatusDot } from "./status-dot";

const STATUS = [
  { value: "", label: "Mọi trạng thái" },
  { value: "new", label: "Mới" },
  { value: "learning", label: "Đang học" },
  { value: "learned", label: "Đã thuộc" },
  { value: "hard", label: "Hay quên" },
  { value: "suspended", label: "Đang tạm ẩn" },
] as const;

const SORTS = [
  { value: "newest", label: "Mới thêm" },
  { value: "az", label: "A–Z" },
  { value: "hard", label: "Hay quên nhất" },
] as const;

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 appearance-none rounded-full border bg-surface pr-8 pl-3.5 text-sm",
          value ? "border-ink-blue bg-wash-blue font-medium text-ink" : "border-rule text-ink-soft",
        )}
      >
        {children}
      </select>
      <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-soft">
        ▾
      </span>
    </label>
  );
}

export function DeckWords({
  deckId,
  language,
  canEdit,
  topics,
  moveTargets,
  wordCount,
}: {
  deckId: string;
  language: LangCode;
  canEdit: boolean;
  topics: (string | null)[];
  moveTargets: { id: string; name: string }[];
  wordCount: number;
}) {
  const me = useOptionalMe();
  const def = LANGUAGES[language];
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [topic, setTopic] = useState("");
  const [pos, setPos] = useState("");
  const [status, setStatus] = useState("");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState<"newest" | "az" | "hard">("newest");
  const [view, setView] = useState<"list" | "grid">("list");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(deferredQ.trim()), 300);
    return () => clearTimeout(t);
  }, [deferredQ]);

  const filters: Omit<DeckWordQuery, "offset"> = useMemo(
    () => ({
      deckId,
      q: debouncedQ || undefined,
      topic: topic || undefined,
      pos: pos || undefined,
      status: (status || undefined) as DeckWordQuery["status"],
      level: level || undefined,
      sort,
    }),
    [deckId, debouncedQ, topic, pos, status, level, sort],
  );

  const query = useInfiniteQuery({
    queryKey: ["deck-words", filters],
    queryFn: ({ pageParam }) => loadDeckWords({ ...filters, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });
  const rows = useMemo(() => query.data?.pages.flatMap((p) => p.rows) ?? [], [query.data]);

  // Infinite scroll sentinel
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [query]);

  const allTopics = useMemo(() => {
    const set = new Set<string>(topics.filter(Boolean) as string[]);
    return [...set];
  }, [topics]);

  const anyFilter = Boolean(debouncedQ || topic || pos || status || level);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulk(input: Parameters<typeof bulkWords>[1], doneMsg: string) {
    startTransition(async () => {
      const res = await bulkWords(deckId, input);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`${doneMsg} ${res.data.count} từ`);
      setSelected(new Set());
      setSelecting(false);
      await queryClient.invalidateQueries({ queryKey: ["deck-words"] });
    });
  }

  const ids = [...selected];

  return (
    <section className="mt-6" aria-label="Danh sách từ">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-soft" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={language === "zh" ? "Tìm chữ Hán, pinyin không dấu, nghĩa…" : "Tìm từ hoặc nghĩa…"}
          aria-label="Tìm trong bộ từ"
          className="h-12 w-full rounded-btn border border-rule bg-surface pr-4 pl-11 text-base text-ink placeholder:text-ink-soft"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <FilterSelect label="Sắp xếp" value={sort === "newest" ? "" : sort} onChange={(v) => setSort((v || "newest") as typeof sort)}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value === "newest" ? "" : s.value}>
              {s.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Trạng thái" value={status} onChange={setStatus}>
          {STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Chủ đề" value={topic} onChange={setTopic}>
          <option value="">Mọi chủ đề</option>
          {allTopics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="Loại từ" value={pos} onChange={setPos}>
          <option value="">Mọi loại từ</option>
          {posFor(language).map((p) => (
            <option key={p} value={p}>
              {POS[p].label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label={def.levelLabel} value={level} onChange={setLevel}>
          <option value="">Mọi {def.levelLabel}</option>
          {def.levels.map((l) => (
            <option key={l} value={l}>
              {language === "zh" ? `HSK ${l}` : l}
            </option>
          ))}
        </FilterSelect>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-sm text-ink-soft" aria-live="polite">
          {query.isLoading ? "Đang tải…" : anyFilter ? `${rows.length}${query.hasNextPage ? "+" : ""} kết quả` : `${wordCount} từ`}
        </p>
        <div className="flex items-center gap-1">
          {canEdit && rows.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelecting((s) => !s);
                setSelected(new Set());
              }}
              aria-pressed={selecting}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-btn px-3 text-sm",
                selecting ? "bg-wash-blue font-medium text-ink" : "text-ink-soft hover:bg-muted",
              )}
            >
              <CheckSquare className="size-4" aria-hidden />
              {selecting ? "Xong" : "Chọn"}
            </button>
          )}
          <div role="group" aria-label="Kiểu hiển thị" className="flex rounded-btn border border-rule bg-surface p-0.5">
            <button
              type="button"
              aria-label="Dạng danh sách"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={cn("grid size-10 place-items-center rounded-[8px]", view === "list" ? "bg-wash-blue text-ink" : "text-ink-soft")}
            >
              <List className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Dạng lưới có ảnh"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={cn("grid size-10 place-items-center rounded-[8px]", view === "grid" ? "bg-wash-blue text-ink" : "text-ink-soft")}
            >
              <LayoutGrid className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="notebook-card mt-3 px-6 py-8">
          {anyFilter ? (
            <p className="text-ink-soft">Không có từ nào khớp. Thử bỏ bớt bộ lọc.</p>
          ) : (
            <>
              <p className="font-medium text-ink">Bộ này chưa có từ nào.</p>
              {canEdit && (
                <Link href={`/decks/${deckId}/add`} className="mt-3 inline-flex min-h-11 items-center rounded-btn bg-primary px-5 font-medium text-primary-foreground">
                  Thêm từ đầu tiên
                </Link>
              )}
            </>
          )}
        </div>
      ) : view === "list" ? (
        <ul className="ruled-list mt-3 overflow-hidden rounded-xl border border-rule bg-surface">
          {rows.map((w) => (
            <WordRowItem
              key={w.id}
              word={w}
              language={language}
              toneColors={me?.prefs.tone_colors ?? true}
              selecting={selecting}
              selected={selected.has(w.id)}
              onToggle={() => toggle(w.id)}
            />
          ))}
        </ul>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map((w) => (
            <WordGridItem key={w.id} word={w} language={language} selecting={selecting} selected={selected.has(w.id)} onToggle={() => toggle(w.id)} />
          ))}
        </ul>
      )}

      <div ref={sentinel} className="h-8" />
      {query.isFetchingNextPage && (
        <p className="flex items-center justify-center gap-2 py-3 text-sm text-ink-soft">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Đang tải thêm…
        </p>
      )}

      {selecting && ids.length > 0 && (
        <div
          role="toolbar"
          aria-label="Thao tác với từ đã chọn"
          className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-sheet border border-rule bg-surface p-3 shadow-lg lg:bottom-6 lg:left-64"
        >
          <span className="mr-auto pl-1 text-sm font-medium text-ink">Đã chọn {ids.length}</span>
          {moveTargets.length > 0 && (
            <select
              aria-label="Chuyển sang bộ"
              defaultValue=""
              disabled={pending}
              onChange={(e) => {
                if (e.target.value) runBulk({ action: "move", wordIds: ids, targetDeckId: e.target.value }, "Đã chuyển");
                e.target.value = "";
              }}
              className="h-11 max-w-36 rounded-btn border border-rule bg-surface px-2 text-sm"
            >
              <option value="">Chuyển bộ…</option>
              {moveTargets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Đổi chủ đề"
            defaultValue=""
            disabled={pending}
            onChange={(e) => {
              if (e.target.value) runBulk({ action: "topic", wordIds: ids, topic: e.target.value === "__none" ? null : e.target.value }, "Đã đổi chủ đề");
              e.target.value = "";
            }}
            className="h-11 max-w-36 rounded-btn border border-rule bg-surface px-2 text-sm"
          >
            <option value="">Chủ đề…</option>
            <option value="__none">Bỏ chủ đề</option>
            {[...new Set([...allTopics, ...STANDARD_TOPICS])].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={() => runBulk({ action: "suspend", wordIds: ids, suspended: status !== "suspended" }, status === "suspended" ? "Đã bỏ ẩn" : "Đã tạm ẩn")}
            className="min-h-11 rounded-btn border border-rule px-3 text-sm"
          >
            {status === "suspended" ? "Bỏ ẩn" : "Tạm ẩn"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
            className="min-h-11 rounded-btn bg-wash-red px-3 text-sm font-medium text-danger"
          >
            Xóa
          </button>
          <button type="button" aria-label="Bỏ chọn" onClick={() => setSelected(new Set())} className="grid size-11 place-items-center rounded-btn text-ink-soft">
            <X className="size-5" aria-hidden />
          </button>
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-sheet">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa {ids.length} từ?</AlertDialogTitle>
            <AlertDialogDescription>Tiến độ ôn của mọi người với các từ này cũng bị xóa. Không hoàn tác được.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-btn">Giữ lại</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-btn bg-danger text-paper hover:bg-danger/90"
              onClick={() => runBulk({ action: "delete", wordIds: ids }, "Đã xóa")}
            >
              Xóa từ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function SelectBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-md border-2",
        checked ? "border-ink-blue bg-ink-blue text-primary-foreground" : "border-rule bg-surface",
      )}
    >
      {checked && "✓"}
    </span>
  );
}

function WordRowItem({
  word,
  language,
  toneColors,
  selecting,
  selected,
  onToggle,
}: {
  word: DeckWordRow;
  language: LangCode;
  toneColors: boolean;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const content = (
    <>
      {selecting && <SelectBox checked={selected} />}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn("font-medium text-ink", language === "zh" ? "font-hanzi-sans text-lg" : "text-base", word.suspended && "line-through opacity-60")}>
            {word.term}
          </span>
          {word.reading &&
            (language === "zh" ? (
              <PinyinText pinyin={word.reading} colored={toneColors} className="text-sm" />
            ) : (
              <span className="font-ipa text-sm text-ink-soft">{word.reading}</span>
            ))}
        </span>
        <span className="block truncate text-sm text-ink-soft">{word.meaning_vi}</span>
      </span>
      {levelOf(language, word.lang_extra) && (
        <span className="hidden shrink-0 text-xs text-ink-soft sm:block">{levelOf(language, word.lang_extra)}</span>
      )}
      <StatusDot state={word.card_state} lapses={word.lapses} suspended={word.suspended} />
    </>
  );
  const cls = "flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60";
  return (
    <li>
      {selecting ? (
        <button type="button" role="checkbox" aria-checked={selected} onClick={onToggle} className={cls}>
          {content}
        </button>
      ) : (
        <Link href={`/words/${word.id}`} className={cls}>
          {content}
        </Link>
      )}
    </li>
  );
}

function WordGridItem({
  word,
  language,
  selecting,
  selected,
  onToggle,
}: {
  word: DeckWordRow;
  language: LangCode;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const inner = (
    <>
      <span className="relative block aspect-square overflow-hidden rounded-t-[11px] bg-wash-blue">
        {word.image_url ? (
          <Image src={word.image_url} alt="" fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover" />
        ) : (
          <span className="grid h-full place-items-center text-5xl" aria-hidden>
            {word.emoji || "📝"}
          </span>
        )}
        {selecting && (
          <span className="absolute top-2 left-2">
            <SelectBox checked={selected} />
          </span>
        )}
        <span className="absolute top-2.5 right-2.5">
          <StatusDot state={word.card_state} lapses={word.lapses} suspended={word.suspended} />
        </span>
      </span>
      <span className="block px-3 py-2.5">
        <span className={cn("block truncate font-medium text-ink", language === "zh" && "font-hanzi-sans text-lg")}>{word.term}</span>
        <span className="block truncate text-sm text-ink-soft">{word.meaning_vi}</span>
      </span>
    </>
  );
  const cls = "block w-full overflow-hidden rounded-xl border border-rule bg-surface text-left";
  return (
    <li>
      {selecting ? (
        <button type="button" role="checkbox" aria-checked={selected} onClick={onToggle} className={cls}>
          {inner}
        </button>
      ) : (
        <Link href={`/words/${word.id}`} className={cls}>
          {inner}
        </Link>
      )}
    </li>
  );
}
