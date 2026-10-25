"use client";

import { Camera, Check, ImageOff, ImagePlus, Loader2, Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ImageSuggestion } from "@/lib/ai/to-word";
import { compressImage, extensionFor } from "@/lib/image-compress";
import { toImageValue, trackPick } from "@/lib/images/pick";
import { providerLabel, type ImageResult } from "@/lib/images/types";
import { cn } from "@/lib/utils";
import type { ImageSource } from "@/lib/word-schema";
import { useImageSearch } from "./use-image-search";

export type ImageValue = { image_url: string | null; image_source: ImageSource | null };

export function ImageCredit({ source, className }: { source: ImageSource | null | undefined; className?: string }) {
  if (!source || source.provider === "upload") return null;
  return (
    <p className={cn("text-xs text-fg-muted", className)}>
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
  const [currentQuery, setCurrentQuery] = useState(suggestedQuery);
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const { results, loading, error, hasMore, search } = useImageSearch();

  // Auto search on mount if suggestedQuery is present
  useEffect(() => {
    if (suggestedQuery?.trim() && !results) {
      void search(suggestedQuery.trim(), 1);
    }
  }, [suggestedQuery, results, search]);

  // When autoSearchKey changes (e.g. AI fill)
  const [seenKey, setSeenKey] = useState(autoSearchKey);
  if (autoSearchKey !== seenKey) {
    setSeenKey(autoSearchKey);
    if (autoSearchKey !== undefined && suggestedQuery) {
      setQuery(suggestedQuery);
      setCurrentQuery(suggestedQuery);
    }
  }

  useEffect(() => {
    if (autoSearchKey === undefined || !suggestedQuery) return;
    const timer = setTimeout(() => {
      setPage(1);
      void search(suggestedQuery, 1);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearchKey]);

  function pick(r: ImageResult) {
    onChange(toImageValue(r));
    void trackPick(r);
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Chọn một file ảnh.");
    setUploading(true);
    try {
      const blob = await compressImage(file, { maxSize: 800, maxBytes: 300 * 1024 });
      const path = `${userId}/${crypto.randomUUID()}.${extensionFor(blob)}`;
      const { createClient } = await import("@/lib/supabase/client");
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
    <div className="space-y-4">
      {/* Current selection and upload */}
      <div className="flex items-start gap-3">
        <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-2">
          {value.image_url ? (
            <Image src={value.image_url} alt="Ảnh đã chọn" fill sizes="96px" className="object-cover" />
          ) : (
            <span className="text-4xl" aria-hidden>
              {emoji || <ImagePlus className="size-8 text-fg-subtle" strokeWidth={1.5} />}
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
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium transition-colors hover:bg-surface-2"
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

      {/* Meaning-based suggestion chips above grid */}
      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm text-fg-muted">Ảnh theo từng nghĩa:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => {
              const active = currentQuery.toLowerCase() === s.query.toLowerCase();
              return (
                <button
                  key={s.query}
                  type="button"
                  aria-pressed={active}
                  title={s.query}
                  onClick={() => {
                    setQuery(s.query);
                    setCurrentQuery(s.query);
                    setPage(1);
                    void search(s.query, 1);
                  }}
                  className={cn(
                    "inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary font-medium text-on-primary"
                      : "border-border-strong bg-surface text-fg-muted hover:text-fg",
                  )}
                >
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid of images */}
      {loading === "new" ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-danger-fg">{error}</p>
      ) : results && results.length === 0 ? (
        <p className="text-sm text-fg-muted">Không có ảnh phù hợp. Thử từ khóa cụ thể hơn.</p>
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
                      active ? "border-primary" : "border-transparent",
                    )}
                  >
                    <Image src={r.thumb_url} alt={r.alt ?? ""} fill sizes="25vw" className="object-cover" />
                    {active && (
                      <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={loading === "more"}
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                void search(currentQuery, nextPage);
              }}
            >
              {loading === "more" ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
              Xem thêm ảnh
            </Button>
          )}
        </>
      ) : null}

      {/* Search box moved below the grid */}
      <div className="space-y-1.5 pt-2 border-t border-border" role="search">
        <label htmlFor="image-query" className="block text-sm font-medium text-fg-muted">
          Không ưng? Tìm bằng từ khóa khác
        </label>
        <div className="flex gap-2">
          <Input
            id="image-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Từ khóa tiếng Anh, ví dụ: tree in rock"
            className="min-w-0 flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setCurrentQuery(query);
                setPage(1);
                void search(query, 1);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCurrentQuery(query);
              setPage(1);
              void search(query, 1);
            }}
          >
            <Search aria-hidden />
            Tìm ảnh
          </Button>
        </div>
      </div>
    </div>
  );
}
