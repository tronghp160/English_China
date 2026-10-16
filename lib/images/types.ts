export type ImageResult = {
  id: string;
  provider: "pexels" | "unsplash";
  thumb_url: string;
  url: string; // medium size, stored in words.image_url
  author: string;
  author_url: string;
  page_url: string;
  download_location?: string; // Unsplash: must be pinged when the user picks the photo
  alt?: string;
};

export function providerLabel(p: "pexels" | "unsplash" | "upload") {
  return p === "pexels" ? "Pexels" : p === "unsplash" ? "Unsplash" : "Tự tải lên";
}
