import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { searchPexels } from "@/lib/images/pexels";
import type { ImageResult } from "@/lib/images/types";
import { searchUnsplash } from "@/lib/images/unsplash";
import { hitRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (!q) return NextResponse.json({ results: [] });

  const env = serverEnv();
  if (!env.PEXELS_API_KEY && !env.UNSPLASH_ACCESS_KEY) {
    return NextResponse.json({ error: "Tìm ảnh chưa được bật (thiếu PEXELS_API_KEY / UNSPLASH_ACCESS_KEY)." }, { status: 503 });
  }
  if (!(await hitRateLimit(user.id, "image-search", 60, 3600))) {
    return NextResponse.json({ error: "Bạn tìm ảnh hơi nhiều. Đợi một lát rồi thử lại." }, { status: 429 });
  }

  let results: ImageResult[] = [];
  if (env.PEXELS_API_KEY) {
    try {
      results = await searchPexels(q, env.PEXELS_API_KEY);
    } catch (e) {
      console.error("[images] pexels", e);
    }
  }
  if (results.length < 8 && env.UNSPLASH_ACCESS_KEY) {
    try {
      const more = await searchUnsplash(q, env.UNSPLASH_ACCESS_KEY);
      results = [...results, ...more].slice(0, 8);
    } catch (e) {
      console.error("[images] unsplash", e);
    }
  }
  return NextResponse.json({ results });
}
