import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { trackUnsplashDownload } from "@/lib/images/unsplash";

const bodySchema = z.object({ download_location: z.string().url().max(500) });

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  const key = serverEnv().UNSPLASH_ACCESS_KEY;
  if (!parsed.success || !key) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await trackUnsplashDownload(parsed.data.download_location, key);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
