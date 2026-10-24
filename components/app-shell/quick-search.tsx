"use client";

import { Command as CommandPrimitive } from "cmdk";
import {
  BarChart3,
  BookOpen,
  Brain,
  CalendarCheck,
  Compass,
  MessageCircleHeart,
  PenLine,
  Search,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { LangMark } from "@/components/lang-mark";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { quickSearch, type QuickSearchResult } from "@/lib/actions/search";
import { cn } from "@/lib/utils";

const PAGES: { href: string; label: string; icon: LucideIcon; keywords: string }[] = [
  { href: "/today", label: "Hôm nay", icon: CalendarCheck, keywords: "hom nay trang chu" },
  { href: "/review", label: "Ôn tập ngay", icon: CalendarCheck, keywords: "on tap review" },
  { href: "/decks", label: "Bộ từ", icon: BookOpen, keywords: "bo tu deck" },
  { href: "/practice", label: "Luyện tập", icon: PenLine, keywords: "luyen tap practice" },
  { href: "/hard-words", label: "Từ hay quên", icon: Brain, keywords: "tu hay quen kho nho" },
  { href: "/chat", label: "Gia sư", icon: MessageCircleHeart, keywords: "gia su chat hoi" },
  { href: "/groups", label: "Nhóm", icon: Users, keywords: "nhom group ban be" },
  { href: "/explore", label: "Khám phá", icon: Compass, keywords: "kham pha explore" },
  { href: "/stats", label: "Thống kê", icon: BarChart3, keywords: "thong ke stats" },
  { href: "/settings", label: "Cài đặt", icon: Settings, keywords: "cai dat settings" },
];

/** Lowercase without Vietnamese diacritics, so "hom nay" finds "Hôm nay". */
function fold(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();
}

const EMPTY: QuickSearchResult = { words: [], decks: [] };
const subscribeNever = () => () => {};

/** Header search button + Ctrl/⌘+K palette over the user's words, decks and pages. */
export function QuickSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // "Ctrl K" on the server and during hydration; "⌘K" on Apple devices afterwards.
  const shortcut = useSyncExternalStore(
    subscribeNever,
    () => (/mac|iphone|ipad/i.test(navigator.platform) ? "⌘K" : "Ctrl K"),
    () => "Ctrl K",
  );
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ q: string; data: QuickSearchResult }>({ q: "", data: EMPTY });
  const q = query.trim();
  const loading = q.length > 0 && result.q !== q;
  const data = result.q === q ? result.data : EMPTY;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!q) return;
    let alive = true;
    const t = setTimeout(() => {
      quickSearch(q).then((d) => alive && setResult({ q, data: d }));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };
  const pages = q ? PAGES.filter((p) => fold(`${p.label} ${p.keywords}`).includes(fold(q))) : PAGES;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tìm từ, bộ từ (Ctrl+K)"
        className="inline-flex size-11 items-center justify-center gap-2 rounded-btn text-sm text-ink-soft transition-colors hover:bg-surface-sunk hover:text-ink lg:mr-auto lg:h-11 lg:w-70 lg:justify-start lg:border lg:border-rule-strong lg:bg-surface lg:px-3"
      >
        <Search className="size-[1.125rem] shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="hidden lg:inline">Tìm từ trong sổ</span>
        <kbd className="ml-auto hidden rounded-sm border border-rule px-1.5 font-sans text-xs lg:inline">{shortcut}</kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
        title="Tìm nhanh"
        description="Tìm từ trong sổ, bộ từ hoặc mở một trang"
        className="max-w-[calc(100%-2rem)] sm:max-w-[560px]"
      >
        {/* Results come from the server, so cmdk's own filtering is off. */}
        <Command shouldFilter={false} className="bg-surface">
          <div className="flex items-center gap-2 border-b border-rule px-4">
            <Search className="size-5 shrink-0 text-ink-soft" strokeWidth={1.75} aria-hidden />
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Gõ từ, nghĩa, pinyin hoặc tên bộ từ…"
              className="h-[3.25rem] w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
          <CommandList className="max-h-[min(60vh,28rem)] p-1">
            {q && !loading && <CommandEmpty>Không tìm thấy “{q}”.</CommandEmpty>}
            {loading && <p className="py-6 text-center text-sm text-ink-soft">Đang tìm…</p>}
            {data.words.length > 0 && (
              <CommandGroup heading="Từ">
                {data.words.map((w) => (
                  <CommandItem key={w.id} value={`word-${w.id}`} onSelect={() => go(`/words/${w.id}`)} className="min-h-12 gap-3 px-3">
                    <LangMark lang={w.language} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span lang={w.language} className={cn("truncate text-base font-medium text-ink", w.language === "zh" ? "font-hanzi" : "font-display")}>
                          {w.term}
                        </span>
                        {w.reading && <span className="truncate text-xs text-ink-soft">{w.reading}</span>}
                      </span>
                      <span className="flex gap-x-3 text-xs text-ink-soft">
                        <span className="truncate">{w.meaning_vi}</span>
                        <span className="shrink-0 truncate">{w.deck}</span>
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {data.decks.length > 0 && (
              <CommandGroup heading="Bộ từ">
                {data.decks.map((d) => (
                  <CommandItem key={d.id} value={`deck-${d.id}`} onSelect={() => go(`/decks/${d.id}`)} className="min-h-12 gap-3 px-3">
                    <BookOpen className="size-5 text-ink-soft" strokeWidth={1.75} aria-hidden />
                    <span className="truncate font-semibold text-ink">{d.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {pages.length > 0 && (
              <CommandGroup heading="Đi tới">
                {pages.map((p) => (
                  <CommandItem key={p.href} value={`page-${p.href}`} onSelect={() => go(p.href)} className="min-h-11 gap-3 px-3">
                    <p.icon className="size-5 text-ink-soft" strokeWidth={1.75} aria-hidden />
                    <span className="text-ink">{p.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <p className="flex gap-4 border-t border-rule px-4 py-2.5 text-xs text-ink-soft" aria-hidden>
            <span>↑↓ chọn</span>
            <span>Enter mở</span>
            <span>Esc đóng</span>
          </p>
        </Command>
      </CommandDialog>
    </>
  );
}
