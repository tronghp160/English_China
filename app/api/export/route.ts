import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { accountWordsCsv, buildAccountExport } from "@/lib/export";
import { hitRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const Query = z.object({ format: z.enum(["json", "csv"]).default("json") });

/** "Xuất toàn bộ dữ liệu" (PLAN §15): JSON with everything, or CSV of all own words. */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  const parsed = Query.safeParse({ format: request.nextUrl.searchParams.get("format") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "Định dạng không hợp lệ." }, { status: 400 });
  if (!(await hitRateLimit(user.id, "export", 10, 3600))) {
    return NextResponse.json({ error: "Bạn xuất quá nhiều lần, thử lại sau một giờ." }, { status: 429 });
  }

  const supabase = await createClient();
  const data = await buildAccountExport(supabase, user.id);
  const stamp = data.exported_at.slice(0, 10);
  const name = `so-tu-${data.profile?.username ?? "du-lieu"}-${stamp}`;

  if (parsed.data.format === "csv") {
    return new NextResponse(accountWordsCsv(data), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${name}.csv"`,
        "cache-control": "no-store",
      },
    });
  }
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${name}.json"`,
      "cache-control": "no-store",
    },
  });
}
