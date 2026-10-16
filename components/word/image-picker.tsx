"use client";

import { Camera, ImageOff, Loader2, RefreshCw, Search } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
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
}: {
  value: ImageValue;
  onChange: (v: ImageValue) => void;
  suggestedQuery: string;
  userId: string;
  emoji?: string | null;
  /** Changing this triggers a fresh search with suggestedQuery (e.g. after AI fill). */
  autoSearchKey?: string | number;
}) {
  const [query, setQuery] = useState(suggestedQuery);
  const [results, setResults] = useState<ImageResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/images/search?q=${encodeURIComponent(term)}`);
      const body = (await res.json()) as { results?: ImageResult[]; error?: string };
      if (!res.ok) throw new Error(body.error || "Không tìm được ảnh.");
      setResults(body.results ?? []);
    } catch (e) {
      setError((e as Error).message);
      setResults([]);
    } finally {
      setLoading(false);
    }
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
        <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-[12px] border border-rule bg-wash-blue">
          {value.image_url ? (
            <Image src={value.image_url} alt="Ảnh đã chọn" fill sizes="96px" className="object-cover" />
          ) : (
            <span className="text-4xl" aria-hidden>
              {emoji || "🖼️"}
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
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] border border-rule bg-surface px-3 text-sm font-medium hover:bg-muted"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Camera className="size-4" aria-hidden />}
              Tải ảnh của tôi lên
            </label>
            {value.image_url && (
              <button
                type="button"
                onClick={() => onChange({ image_url: null, image_source: null })}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-3 text-sm text-ink-soft hover:bg-muted"
              >
                <ImageOff className="size-4" aria-hidden />
                Không dùng ảnh
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Not a <form>: this picker lives inside the word form. */}
      <div className="flex gap-2" role="search">
        <label htmlFor="image-query" className="sr-only">
          Từ khóa tìm ảnh (tiếng Anh)
        </label>
        <input
          id="image-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Từ khóa tiếng Anh, ví dụ: tree in rock"
          className="h-11 min-w-0 flex-1 rounded-[10px] border border-rule bg-surface px-3 text-base"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search(query);
            }
          }}
        />
        <button
          type="button"
          onClick={() => void search(query)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-rule bg-surface px-3 text-sm font-medium hover:bg-muted"
        >
          {results ? <RefreshCw className="size-4" aria-hidden /> : <Search className="size-4" aria-hidden />}
          {results ? "Tìm ảnh khác" : "Tìm ảnh"}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-[10px]" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : results && results.length === 0 ? (
        <p className="text-sm text-ink-soft">Không có ảnh phù hợp. Thử từ khóa cụ thể hơn.</p>
      ) : results ? (
        <ul className="grid grid-cols-4 gap-2" aria-label="Ảnh gợi ý">
          {results.slice(0, 8).map((r) => {
            const active = value.image_url === r.url;
            return (
              <li key={`${r.provider}-${r.id}`}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  aria-pressed={active}
                  aria-label={`Chọn ảnh của ${r.author} (${providerLabel(r.provider)})`}
                  className={cn(
                    "relative block aspect-square w-full overflow-hidden rounded-[10px] border-2",
                    active ? "border-ink-blue" : "border-transparent",
                  )}
                >
                  <Image src={r.thumb_url} alt={r.alt ?? ""} fill sizes="25vw" className="object-cover" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
