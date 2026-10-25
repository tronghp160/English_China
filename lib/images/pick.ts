import type { ImageResult } from "./types";
import type { ImageSource } from "@/lib/word-schema";

export type ImagePickedValue = {
  image_url: string;
  image_source: ImageSource;
};

/**
 * Converts an ImageResult to the image_url and image_source fields stored in WordInput / DB.
 */
export function toImageValue(r: ImageResult): ImagePickedValue {
  return {
    image_url: r.url,
    image_source: {
      provider: r.provider,
      author: r.author,
      author_url: r.author_url,
      page_url: r.page_url,
    },
  };
}

/**
 * Fires the required download_location tracking ping for Unsplash API terms.
 */
export async function trackPick(r: ImageResult): Promise<void> {
  if (!r.download_location) return;
  try {
    await fetch("/api/images/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ download_location: r.download_location }),
    });
  } catch {
    // Non-critical tracking call
  }
}
