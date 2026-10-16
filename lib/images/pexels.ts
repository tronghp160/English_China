import "server-only";
import type { ImageResult } from "./types";

type PexelsPhoto = {
  id: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt: string | null;
  src: { medium: string; large: string; small: string };
};

const WEEK = 60 * 60 * 24 * 7;

export async function searchPexels(query: string, apiKey: string): Promise<ImageResult[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8&orientation=square`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    // Cache identical queries for 7 days: the free API is rate limited per hour.
    next: { revalidate: WEEK, tags: ["pexels"] },
  });
  if (!res.ok) throw new Error(`pexels ${res.status}`);
  const body = (await res.json()) as { photos?: PexelsPhoto[] };
  return (body.photos ?? []).map((p) => ({
    id: String(p.id),
    provider: "pexels",
    thumb_url: p.src.medium,
    url: p.src.large,
    author: p.photographer,
    author_url: p.photographer_url,
    page_url: p.url,
    alt: p.alt ?? undefined,
  }));
}
