import { NextResponse } from "next/server";
import { z } from "zod";
import { AiError, enrichBatch } from "@/lib/ai/enrich";
import { aiErrorResponse } from "@/lib/ai/http";
import { getUser } from "@/lib/auth";

export const maxDuration = 60;

const bodySchema = z.object({
  language: z.enum(["en", "zh"]),
  items: z
    .array(z.object({ term: z.string().trim().min(1).max(80), meaning_vi: z.string().trim().max(300).nullable().optional() }))
    .min(1)
    .max(10),
});

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  try {
    const outcomes = await enrichBatch(user.id, parsed.data.language, parsed.data.items);
    return NextResponse.json({ outcomes });
  } catch (e) {
    if (e instanceof AiError) return aiErrorResponse(e);
    console.error("[api/ai/enrich-batch]", e);
    return NextResponse.json({ error: "Không lấy được gợi ý lúc này.", code: "failed" }, { status: 500 });
  }
}
