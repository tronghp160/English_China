import "server-only";
import type { ImageResult } from "./types";

type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  urls: { small: string; regular: string };
  links: { html: string; download_location: string };
  user: { name: string; links: { html: string } };
};

const WEEK = 60 * 60 * 24 * 7;
const UTM = "utm_source=so_tu&utm_medium=referral";

function withUtm(url: string) {
  return `${url}${url.includes("?") ? "&" : "?"}${UTM}`;
}

export async function searchUnsplash(query: string, accessKey: string, page = 1, perPage = 16): Promise<ImageResult[]> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&content_filter=high`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" },
    next: { revalidate: WEEK, tags: ["unsplash"] },
  });
  if (!res.ok) throw new Error(`unsplash ${res.status}`);
  const body = (await res.json()) as { results?: UnsplashPhoto[] };
  return (body.results ?? []).map((p) => ({
    id: p.id,
    provider: "unsplash",
    thumb_url: p.urls.small,
    url: p.urls.regular,
    author: p.user.name,
    author_url: withUtm(p.user.links.html),
    page_url: withUtm(p.links.html),
    download_location: p.links.download_location,
    alt: p.alt_description ?? undefined,
  }));
}

/** Unsplash API guideline: trigger a download event when a photo is used. */
export async function trackUnsplashDownload(downloadLocation: string, accessKey: string) {
  const u = new URL(downloadLocation);
  if (u.hostname !== "api.unsplash.com") throw new Error("invalid download_location");
  await fetch(u, { headers: { Authorization: `Client-ID ${accessKey}` }, cache: "no-store" });
}
