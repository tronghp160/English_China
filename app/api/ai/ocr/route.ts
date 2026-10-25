import { NextResponse } from "next/server";
import { AiError, checkQuota, recordUsage, requireAnthropicKeyOrThrow } from "@/lib/ai/enrich";
import { readNotebookPhoto } from "@/lib/ai/ocr";
import { getUser } from "@/lib/auth";

export const maxDuration = 60;

const ALLOWED = new Set(["image/webp", "image/jpeg", "image/png"]);

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  const language = form?.get("language");
  if (!(file instanceof Blob) || (language !== "en" && language !== "zh")) {
    return NextResponse.json({ error: "Thiếu ảnh." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type) || file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Ảnh phải là JPG/PNG/WebP, tối đa 4 MB." }, { status: 400 });
  }
  try {
    requireAnthropicKeyOrThrow();
    await checkQuota(user.id, 3); // a vision call costs more than a single lookup
    const lines = await readNotebookPhoto(new Uint8Array(await file.arrayBuffer()), file.type, language);
    recordUsage(user.id, 3);
    return NextResponse.json({ lines });
  } catch (e) {
    if (e instanceof AiError) {
      const status = e.code.startsWith("quota") ? 429 : e.code === "not_configured" ? 503 : 502;
      return NextResponse.json({ error: e.message }, { status });
    }
    return NextResponse.json({ error: "Không đọc được ảnh." }, { status: 500 });
  }
}
