"use client";

import { Camera, Check, ImageOff, ImagePlus, Loader2, Search } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ImageSuggestion } from "@/lib/ai/to-word";
import { compressImage, extensionFor } from "@/lib/image-compress";
import { providerLabel, type ImageResult } from "@/lib/images/types";
import { cn } from "@/lib/utils";
import type { ImageSource } from "@/lib/word-schema";

export type ImageValue = { image_url: string | null; image_source: ImageSource | null };

export function ImageCredit({ source, className }: { source: ImageSource | null | undefined; className?: string }) {
  if (!source || source.provider === "upload") return null;
  return (
    <p className={cn("text-xs text-ink-soft", className)}>
      Ảnh:{" "}
      {source.author_url ? (
        <a href={source.author_url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
          {source.author || "Tác giả"}
        </a>
      ) : (
        source.author || "Tác giả"
      )}{" "}
      /{" "}
      {source.page_url ? (
        <a href={source.page_url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
          {providerLabel(source.provider)}
        </a>
      ) : (
        providerLabel(source.provider)
      )}
    </p>
  );
}

export function ImagePicker({
  value,
  onChange,
  suggestedQuery,
  userId,
  emoji,
  autoSearchKey,
  suggestions = [],
}: {
  value: ImageValue;
  onChange: (v: ImageValue) => void;
  suggestedQuery: string;
  userId: string;
  emoji?: string | null;
  /** One search per meaning of the word (from the AI), shown as chips. */
  suggestions?: ImageSuggestion[];
  /** Changing this triggers a fresh search with suggestedQuery (e.g. after AI fill). */
  autoSearchKey?: string | number;
}) {
  const [query, setQuery] = useState(suggestedQuery);
  const [results, setResults] = useState<ImageResult[] | null>(null);
  const [searched, setSearched] = useState<{ q: string; page: number; hasMore: boolean } | null>(null);
  const [loading, setLoading] = useState<"new" | "more" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // Pages already fetched in this form, so switching between meanings is instant and free.
  const cache = useRef(new Map<string, { results: ImageResult[]; hasMore: boolean }>());
  const latest = useRef("");

  const search = useCallback(async (q: string, page = 1) => {
    const term = q.trim();
    if (!term) return;
    const key = `${term.toLowerCase()}|${page}`;
    latest.current = key;
    setError(null);
    let hit = cache.current.get(key);
    if (!hit) {
      setLoading(page > 1 ? "more" : "new");
      try {
        const res = await fetch(`/api/images/search?q=${encodeURIComponent(term)}&page=${page}`);
        const body = (await res.json()) as { results?: ImageResult[]; hasMore?: boolean; error?: string };
        if (!res.ok) throw new Error(body.error || "Không tìm được ảnh.");
        hit = { results: body.results ?? [], hasMore: Boolean(body.hasMore) };
        cache.current.set(key, hit);
      } catch (e) {
        if (latest.current === key) {
          setError((e as Error).message);
          if (page === 1) setResults([]);
          setLoading(null);
        }
        return;
      }
    }
    if (latest.current !== key) return; // a newer search won
    const found = hit.results;
    setResults((prev) => {
      if (page === 1 || !prev) return found;
      const ids = new Set(prev.map((r) => `${r.provider}-${r.id}`));
      return [...prev, ...found.filter((r) => !ids.has(`${r.provider}-${r.id}`))];
    });
    setSearched({ q: term.toLowerCase(), page, hasMore: hit.hasMore });
    setLoading(null);
  }, []);

  // New AI suggestion: adopt its query (state adjusted during render, not in an effect).
  const [seenKey, setSeenKey] = useState(autoSearchKey);
  if (autoSearchKey !== seenKey) {
    setSeenKey(autoSearchKey);
    if (autoSearchKey !== undefined && suggestedQuery) setQuery(suggestedQuery);
  }
  useEffect(() => {
    if (autoSearchKey === undefined || !suggestedQuery) return;
    const timer = setTimeout(() => void search(suggestedQuery), 0);
    return () => clearTimeout(timer);
    // Only re-run when a new suggestion arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearchKey]);

  function pick(r: ImageResult) {
    onChange({
      image_url: r.url,
      image_source: { provider: r.provider, author: r.author, author_url: r.author_url, page_url: r.page_url },
    });
    if (r.download_location) {
      // Required by the Unsplash API terms when a photo is used.
      void fetch("/api/images/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ download_location: r.download_location }),
      });
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Chọn một file ảnh.");
    setUploading(true);
    try {
      const blob = await compressImage(file, { maxSize: 800, maxBytes: 300 * 1024 });
      const path = `${userId}/${crypto.randomUUID()}.${extensionFor(blob)}`;
      const { createClient } = await import("@/lib/supabase/client"); // ~65 KB gzip, load on demand
      const supabase = createClient();
      const { error } = await supabase.storage.from("word-images").upload(path, blob, { contentType: blob.type });
      if (error) throw error;
      const url = supabase.storage.from("word-images").getPublicUrl(path).data.publicUrl;
      onChange({ image_url: url, image_source: { provider: "upload", storage_path: path } });
    } catch {
      toast.error("Không tải được ảnh lên. Thử ảnh khác.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-card border border-rule bg-surface-sunk">
          {value.image_url ? (
            <Image src={value.image_url} alt="Ảnh đã chọn" fill sizes="96px" className="object-cover" />
          ) : (
            <span className="text-4xl" aria-hidden>
              {emoji || <ImagePlus className="size-8 text-ink-faint" strokeWidth={1.5} />}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <ImageCredit source={value.image_source} />
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              id="word-image-upload"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => upload(e.target.files?.[0])}
            />
            <label
              htmlFor="word-image-upload"
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-btn border border-rule-strong bg-surface px-3 text-sm font-medium transition-colors hover:bg-surface-sunk"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
              Tải ảnh của tôi lên
            </label>
            {value.image_url && (
              <Button type="button" variant="ghost" onClick={() => onChange({ image_url: null, image_source: null })}>
                <ImageOff aria-hidden />
                Không dùng ảnh
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Not a <form>: this picker lives inside the word form. */}
      <div className="flex gap-2" role="search">
        <label htmlFor="image-query" className="sr-only">
          Từ khóa tìm ảnh (tiếng Anh)
        </label>
        <Input
          id="image-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Từ khóa tiếng Anh, ví dụ: tree in rock"
          className="min-w-0 flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search(query);
            }
          }}
        />
        <Button type="button" variant="outline" onClick={() => void search(query)}>
          <Search aria-hidden />
          Tìm ảnh
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm text-ink-soft">Ảnh theo từng nghĩa:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => {
              const active = searched?.q === s.query.toLowerCase();
              return (
                <button
                  key={s.query}
                  type="button"
                  aria-pressed={active}
                  title={s.query}
                  onClick={() => {
                    setQuery(s.query);
                    void search(s.query);
                  }}
                  className={cn(
                    "inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-chip border px-3 text-sm transition-colors",
                    active ? "border-ink-violet bg-tint-violet font-medium text-ink" : "border-input bg-surface text-ink-soft hover:text-ink",
                  )}
                >
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading === "new" ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-seal-text">{error}</p>
      ) : results && results.length === 0 ? (
        <p className="text-sm text-ink-soft">Không có ảnh phù hợp. Thử từ khóa cụ thể hơn.</p>
      ) : results ? (
        <>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Ảnh gợi ý">
          {results.map((r) => {
            const active = value.image_url === r.url;
            return (
              <li key={`${r.provider}-${r.id}`}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  aria-pressed={active}
                  aria-label={`Chọn ảnh của ${r.author} (${providerLabel(r.provider)})`}
                  className={cn(
                    "relative block aspect-square w-full overflow-hidden rounded-lg border-2",
                    active ? "border-ink-violet" : "border-transparent",
                  )}
                >
                  <Image src={r.thumb_url} alt={r.alt ?? ""} fill sizes="25vw" className="object-cover" />
                  {active && (
                    <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-ink-violet text-primary-foreground">
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {searched?.hasMore && (
          <Button type="button" variant="outline" className="w-full" disabled={loading === "more"} onClick={() => void search(searched.q, searched.page + 1)}>
            {loading === "more" ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
            Xem thêm ảnh
          </Button>
        )}
        </>
      ) : null}
    </div>
  );
}
