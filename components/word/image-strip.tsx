"use client";

import { Check, Plus } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { toImageValue, trackPick } from "@/lib/images/pick";
import { providerLabel } from "@/lib/images/types";
import { cn } from "@/lib/utils";
import type { ImageSource } from "@/lib/word-schema";
import { ImageCredit } from "./image-picker";
import { useImageSearch } from "./use-image-search";

export type ImageStripProps = {
  query: string | null;
  selectedUrl?: string | null;
  selectedSource?: ImageSource | null;
  onPick: (val: { image_url: string; image_source: ImageSource } | null) => void;
  onOpenFull?: () => void;
  index?: number;
  className?: string;
};

export function ImageStrip({
  query,
  selectedUrl,
  selectedSource,
  onPick,
  onOpenFull,
  index,
  className,
}: ImageStripProps) {
  const { results, loading, error, search } = useImageSearch();
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // IntersectionObserver: only search when strip is near or in viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Debounced search when query changes and strip is in view
  useEffect(() => {
    const q = query?.trim();
    if (!q || q.length < 2 || !inView) return;
    const timer = setTimeout(() => {
      void search(q, 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, inView, search]);

  const groupLabel = index !== undefined ? `Ảnh gợi ý cho thẻ ${index + 1}` : "Ảnh gợi ý";

  // When image is already selected and user hasn't asked to re-expand strip
  if (selectedUrl && !isExpanded) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 pt-1 text-xs",
          className,
        )}
      >
        <ImageCredit source={selectedSource} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="font-medium text-primary hover:underline"
          >
            Chọn ảnh khác
          </button>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="text-fg-muted hover:text-danger"
          >
            Bỏ ảnh
          </button>
        </div>
      </div>
    );
  }

  const displayResults = (results ?? []).slice(0, 6);

  if (loading === "new") {
    return (
      <div
        ref={containerRef}
        className={cn("flex items-center gap-2 overflow-x-auto py-1", className)}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="size-16 shrink-0 rounded-[10px]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div ref={containerRef} className={cn("pt-1", className)}>
        <p className="text-xs text-danger-fg">{error}</p>
      </div>
    );
  }

  if (!loading && (!results || results.length === 0) && !onOpenFull) {
    return <div ref={containerRef} />;
  }

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={groupLabel}
      className={cn(
        "flex items-center gap-2 overflow-x-auto py-1 snap-x scrollbar-none",
        className,
      )}
    >
      {displayResults.map((r) => {
        const isSelected = selectedUrl === r.url;
        return (
          <button
            key={`${r.provider}-${r.id}`}
            type="button"
            aria-pressed={isSelected}
            aria-label={`Chọn ảnh của ${r.author} (${providerLabel(r.provider)})`}
            onClick={() => {
              if (isSelected) {
                onPick(null);
              } else {
                onPick(toImageValue(r));
                void trackPick(r);
                setIsExpanded(false);
              }
            }}
            className={cn(
              "relative size-16 shrink-0 snap-start overflow-hidden rounded-[10px] border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isSelected
                ? "border-primary ring-1 ring-primary"
                : "border-transparent hover:opacity-90",
            )}
          >
            <Image
              src={r.thumb_url}
              alt={r.alt ?? ""}
              fill
              sizes="64px"
              className="object-cover"
            />
            {isSelected && (
              <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-primary text-on-primary shadow">
                <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
              </span>
            )}
          </button>
        );
      })}

      {onOpenFull && (
        <button
          type="button"
          onClick={onOpenFull}
          className="flex size-16 shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-[10px] border-2 border-dashed border-border-strong text-fg-muted hover:border-primary hover:text-primary transition-colors text-xs font-medium"
          aria-label="Thêm ảnh khác"
        >
          <Plus className="size-4" aria-hidden />
          <span className="text-[0.6875rem]">Thêm ảnh</span>
        </button>
      )}
    </div>
  );
}
