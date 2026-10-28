import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { getUser } from "@/lib/auth";
import { logAdminAction } from "@/lib/data/admin-audit";
import { buildAccountExport } from "@/lib/export";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user || !(await isAdminUser(user))) {
    return new NextResponse(null, { status: 404 });
  }

  const { id } = await params;
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return new NextResponse(null, { status: 404 });
  }

  const targetUserId = parsed.data;
  const sb = createAdminClient();
  const data = await buildAccountExport(sb, targetUserId);

  const username = data.profile?.username || targetUserId.slice(0, 8);
  const day = new Date().toISOString().slice(0, 10);
  const filename = `so-tu-${username}-${day}.json`;

  await logAdminAction({
    admin: user,
    action: "export_user",
    target: { userId: targetUserId, label: username },
  });

  return NextResponse.json(data, {
    headers: {
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
