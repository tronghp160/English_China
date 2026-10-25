import { NextResponse } from "next/server";
import { z } from "zod";
import { AiError, enrichTerm } from "@/lib/ai/enrich";
import { aiErrorResponse } from "@/lib/ai/http";
import { getUser } from "@/lib/auth";

export const maxDuration = 60;

const bodySchema = z.object({
  language: z.enum(["en", "zh"]),
  term: z.string().trim().min(1).max(80),
  context: z.string().trim().max(300).optional().nullable(),
});

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Từ không hợp lệ." }, { status: 400 });

  try {
    return NextResponse.json(await enrichTerm({ userId: user.id, ...parsed.data }));
  } catch (e) {
    if (e instanceof AiError) return aiErrorResponse(e);
    console.error("[api/ai/enrich]", e);
    return NextResponse.json({ error: "Không lấy được gợi ý lúc này. Thử lại hoặc tự nhập.", code: "failed" }, { status: 500 });
  }
}
