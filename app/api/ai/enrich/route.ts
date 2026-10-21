import { NextResponse } from "next/server";
import { z } from "zod";
import { AiError, enrichTerm, remainingQuota } from "@/lib/ai/enrich";
import { getUser } from "@/lib/auth";

export const maxDuration = 60;

const bodySchema = z.object({
  language: z.enum(["en", "zh"]),
  term: z.string().trim().min(1).max(80),
  context: z.string().trim().max(300).optional().nullable(),
});

const STATUS: Record<AiError["code"], number> = {
  not_configured: 503,
  quota_user: 429,
  quota_global: 429,
  failed: 502,
  invalid: 400,
};

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Từ không hợp lệ." }, { status: 400 });

  try {
    const { result, cached } = await enrichTerm({ userId: user.id, ...parsed.data });
    return NextResponse.json({ result, cached, remaining: await remainingQuota(user.id) });
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ error: e.message, code: e.code }, { status: STATUS[e.code] });
    console.error("[api/ai/enrich]", e);
    return NextResponse.json({ error: "Không lấy được gợi ý lúc này. Thử lại hoặc tự nhập." }, { status: 500 });
  }
}
