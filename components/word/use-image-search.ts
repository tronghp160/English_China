"use client";

import { useCallback, useRef, useState } from "react";
import type { ImageResult } from "@/lib/images/types";

// Module-level cache so cards, strip, and details sheet share fetched results without duplicate API calls
const searchCache = new Map<string, { results: ImageResult[]; hasMore: boolean }>();

export function useImageSearch() {
  const [results, setResults] = useState<ImageResult[] | null>(null);
  const [loading, setLoading] = useState<"new" | "more" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const latest = useRef("");

  const search = useCallback(async (q: string, page = 1) => {
    const term = q.trim();
    if (!term) {
      setResults(null);
      setLoading(null);
      setError(null);
      setHasMore(false);
      return;
    }
    const key = `${term.toLowerCase()}|${page}`;
    latest.current = key;
    setError(null);

    const hit = searchCache.get(key);
    if (hit) {
      setResults((prev) => {
        if (page === 1 || !prev) return hit.results;
        const ids = new Set(prev.map((r) => `${r.provider}-${r.id}`));
        return [...prev, ...hit.results.filter((r) => !ids.has(`${r.provider}-${r.id}`))];
      });
      setHasMore(hit.hasMore);
      setLoading(null);
      return;
    }

    setLoading(page > 1 ? "more" : "new");
    try {
      const res = await fetch(`/api/images/search?q=${encodeURIComponent(term)}&page=${page}`);
      const body = (await res.json()) as { results?: ImageResult[]; hasMore?: boolean; error?: string };
      if (res.status === 429) {
        throw new Error("Tạm hết lượt tìm ảnh, thử lại sau ít phút.");
      }
      if (!res.ok) {
        throw new Error(body.error || "Không tìm được ảnh.");
      }
      const data = { results: body.results ?? [], hasMore: Boolean(body.hasMore) };
      searchCache.set(key, data);
      if (latest.current === key) {
        setResults((prev) => {
          if (page === 1 || !prev) return data.results;
          const ids = new Set(prev.map((r) => `${r.provider}-${r.id}`));
          return [...prev, ...data.results.filter((r) => !ids.has(`${r.provider}-${r.id}`))];
        });
        setHasMore(data.hasMore);
        setLoading(null);
      }
    } catch (e) {
      if (latest.current === key) {
        setError((e as Error).message);
        if (page === 1) setResults([]);
        setLoading(null);
      }
    }
  }, []);

  return { results, loading, error, hasMore, search };
}
