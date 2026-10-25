import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { AiError, enrichBatch } from "@/lib/ai/enrich";
import { aiErrorResponse } from "@/lib/ai/http";
import { coldTerms, firstAdminId } from "@/lib/ai/warm";
import { getUser } from "@/lib/auth";
import { serverEnv } from "@/lib/env";

export const maxDuration = 60;

const bodySchema = z.object({
  language: z.enum(["en", "zh"]),
  limit: z.number().int().min(1).max(10).optional(),
});

/**
 * Fills the shared AI cache (dictionary_cache) with words people saved, one batch
 * of up to 10 per call, so later lookups get the AI answer for free. Admins only
 * (quota counts for that admin), or Bearer CRON_SECRET.
 */
export async function POST(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  const viaCron = Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
  let userId: string | null = null;
  if (viaCron) userId = await firstAdminId();
  else {
    const user = await getUser();
    if (user && (await isAdminUser(user))) userId = user.id;
    else return new NextResponse(null, { status: 404 });
  }
  if (!userId) return NextResponse.json({ error: "Chưa có quản trị viên nào để tính lượt AI." }, { status: 409 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  const { language, limit = 10 } = parsed.data;

  try {
    const cold = await coldTerms(language);
    const batch = cold.slice(0, limit);
    if (!batch.length) return NextResponse.json({ warmed: 0, remaining: 0 });
    const outcomes = await enrichBatch(
      userId,
      language,
      batch.map((term) => ({ term })),
    );
    const warmed = outcomes.filter((o) => o.ok && !o.cached).length;
    const failed = outcomes.filter((o) => !o.ok).length;
    return NextResponse.json({ warmed, failed, remaining: cold.length - batch.length });
  } catch (e) {
    if (e instanceof AiError) return aiErrorResponse(e);
    console.error("[api/admin/warm-cache]", e);
    return NextResponse.json({ error: "Không làm nóng được lúc này.", code: "failed" }, { status: 500 });
  }
}
