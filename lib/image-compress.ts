"use client";

/**
 * Resize an image in the browser and encode it as WebP.
 * Lowers quality step by step until the file fits under maxBytes.
 */
export async function compressImage(
  file: File | Blob,
  { maxSize = 800, maxBytes = 300 * 1024, square = false }: { maxSize?: number; maxBytes?: number; square?: boolean } = {},
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (square) {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2;
    sy = (sh - side) / 2;
    sw = sh = side;
  }
  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h);
  bitmap.close();

  for (const quality of [0.85, 0.75, 0.65, 0.5, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob) break;
    if (blob.size <= maxBytes || quality === 0.4) {
      if (blob.type === "image/webp") return blob;
      break; // browser without WebP encoding: fall through to JPEG
    }
  }
  const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.7));
  if (!jpeg) throw new Error("encode_failed");
  return jpeg;
}

export function extensionFor(blob: Blob) {
  return blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
}
