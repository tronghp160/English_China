import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupBest } from "@/lib/ai/lookup";
import { getUser } from "@/lib/auth";
import { hitRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  language: z.enum(["en", "zh"]),
  term: z.string().trim().min(1).max(80),
});

/** Shared AI cache, else the free dictionary: one request, no AI quota. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Từ không hợp lệ." }, { status: 400 });
  if (!(await hitRateLimit(user.id, "dict", 300, 3600))) {
    return NextResponse.json({ error: "Bạn tra từ hơi nhiều. Đợi một lát rồi thử lại." }, { status: 429 });
  }
  return NextResponse.json(await lookupBest(parsed.data.language, parsed.data.term));
}
