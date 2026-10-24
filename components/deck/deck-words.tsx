"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckSquare, ChevronDown, LayoutGrid, List, Loader2, Search, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PinyinText } from "@/components/zh/pinyin-text";
import { bulkWords, loadDeckWords, type DeckWordQuery, type DeckWordRow } from "@/lib/actions/words";
import { LANGUAGES, levelOf } from "@/lib/lang/registry";
import type { LangCode } from "@/lib/lang/types";
import { POS, posFor } from "@/lib/pos";
import { STANDARD_TOPICS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { StatusDot, StatusLegend } from "./status-dot";

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
          "h-10 appearance-none rounded-btn border bg-surface pr-8 pl-3 text-sm outline-none focus-visible:border-ink-violet focus-visible:ring-3 focus-visible:ring-tint-violet",
          value ? "border-ink-violet bg-tint-violet font-medium text-ink" : "border-input text-ink-soft",
        )}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-soft" />
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
    <section className="mt-10" aria-label="Danh sách từ">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[1.125rem] -translate-y-1/2 text-ink-soft" strokeWidth={1.75} aria-hidden />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={language === "zh" ? "Tìm chữ Hán, pinyin không dấu, nghĩa…" : "Tìm từ hoặc nghĩa…"}
          aria-label="Tìm trong bộ từ"
          className="pl-10"
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
            <Button
              type="button"
              variant={selecting ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setSelecting((s) => !s);
                setSelected(new Set());
              }}
              aria-pressed={selecting}
            >
              <CheckSquare aria-hidden />
              {selecting ? "Xong" : "Chọn"}
            </Button>
          )}
          <div role="group" aria-label="Kiểu hiển thị" className="flex gap-0.5 rounded-chip bg-surface-sunk p-1">
            <button
              type="button"
              aria-label="Dạng danh sách"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={cn("grid size-9 place-items-center rounded-chip", view === "list" ? "bg-surface text-ink shadow-card" : "text-ink-soft hover:text-ink")}
            >
              <List className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Dạng lưới có ảnh"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={cn("grid size-9 place-items-center rounded-chip", view === "grid" ? "bg-surface text-ink shadow-card" : "text-ink-soft hover:text-ink")}
            >
              <LayoutGrid className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        anyFilter ? (
          <EmptyState className="mt-3" figure="grid" title="Không có từ nào khớp.">
            Thử bỏ bớt bộ lọc.
          </EmptyState>
        ) : (
          <EmptyState
            className="mt-3"
            figure="notebook"
            title="Bộ này chưa có từ nào."
            actions={
              canEdit && (
                <Button asChild>
                  <Link href={`/decks/${deckId}/add`}>Thêm từ đầu tiên</Link>
                </Button>
              )
            }
          />
        )
      ) : view === "list" ? (
        <div className="mt-3">
          <div aria-hidden className={cn("hidden items-center gap-3 border-b border-rule px-4 pb-2 text-xs font-medium text-ink-soft md:grid", ROW_COLS[selecting ? 1 : 0])}>
            {selecting && <span />}
            <span>Từ</span>
            <span>Cách đọc</span>
            <span>Nghĩa</span>
            <span>{def.levelLabel}</span>
            <span />
          </div>
          <ul className="ruled-list">
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
          <StatusLegend className="mt-3 px-4" />
        </div>
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
          className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-card bg-ink p-3 text-paper shadow-lift lg:bottom-6 lg:left-64"
        >
          <span className="mr-auto pl-1 text-sm font-medium">Đã chọn {ids.length}</span>
          {moveTargets.length > 0 && (
            <select
              aria-label="Chuyển sang bộ"
              defaultValue=""
              disabled={pending}
              onChange={(e) => {
                if (e.target.value) runBulk({ action: "move", wordIds: ids, targetDeckId: e.target.value }, "Đã chuyển");
                e.target.value = "";
              }}
              className="h-11 max-w-36 rounded-btn border border-paper/25 bg-ink px-2 text-sm text-paper"
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
            className="h-11 max-w-36 rounded-btn border border-paper/25 bg-ink px-2 text-sm text-paper"
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
            className="min-h-11 rounded-btn border border-paper/25 px-3 text-sm hover:bg-paper/10"
          >
            {status === "suspended" ? "Bỏ ẩn" : "Tạm ẩn"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
            className="min-h-11 rounded-btn bg-seal px-3 text-sm font-semibold text-on-seal"
          >
            Xóa
          </button>
          <button type="button" aria-label="Bỏ chọn" onClick={() => setSelected(new Set())} className="grid size-11 place-items-center rounded-btn text-paper/80 hover:bg-paper/10">
            <X className="size-5" aria-hidden />
          </button>
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa {ids.length} từ?</AlertDialogTitle>
            <AlertDialogDescription>Tiến độ ôn của mọi người với các từ này cũng bị xóa. Không hoàn tác được.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ lại</AlertDialogCancel>
            <AlertDialogAction
              className="bg-seal text-on-seal hover:bg-seal/90"
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

// Table columns on desktop: word, reading, meaning, level, status dot (and a checkbox while selecting).
const ROW_COLS = [
  "md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.6fr)_3rem_0.875rem]",
  "md:grid-cols-[1.25rem_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.6fr)_3rem_0.875rem]",
] as const;

function SelectBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-sm border",
        checked ? "border-ink-violet bg-ink-violet text-primary-foreground" : "border-input bg-surface",
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={2.5} />}
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
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 md:contents">
        <span className={cn("block truncate text-lg leading-snug font-medium text-ink", language === "zh" ? "font-hanzi" : "font-display", word.suspended && "line-through opacity-60")}>
          {word.term}
        </span>
        <span className="block truncate text-sm text-ink-soft md:text-base">
          {word.reading &&
            (language === "zh" ? (
              <PinyinText pinyin={word.reading} colored={toneColors} />
            ) : (
              <span className="font-ipa">{word.reading}</span>
            ))}
        </span>
        <span className="block w-full truncate text-sm text-ink-soft md:w-auto md:text-base md:text-ink">{word.meaning_vi}</span>
        <span className="hidden text-xs text-ink-soft md:block">{levelOf(language, word.lang_extra)}</span>
      </span>
      <StatusDot state={word.card_state} lapses={word.lapses} suspended={word.suspended} />
    </>
  );
  const cls = cn(
    "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-sunk md:grid md:gap-3",
    ROW_COLS[selecting ? 1 : 0],
  );
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
      <span className="relative block aspect-square overflow-hidden bg-surface-sunk">
        {word.image_url ? (
          <Image src={word.image_url} alt="" fill sizes="(min-width: 640px) 33vw, 50vw" className="object-cover" />
        ) : (
          <span
            className={cn("grid h-full place-items-center text-5xl text-ink", language === "zh" ? "font-hanzi" : "font-display")}
            aria-hidden
          >
            {word.emoji || Array.from(word.term)[0]}
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
        <span className={cn("block truncate text-lg font-medium text-ink", language === "zh" ? "font-hanzi" : "font-display")}>{word.term}</span>
        <span className="block truncate text-sm text-ink-soft">{word.meaning_vi}</span>
      </span>
    </>
  );
  const cls = "block w-full overflow-hidden rounded-card border border-rule bg-surface text-left transition-colors hover:border-rule-strong";
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
