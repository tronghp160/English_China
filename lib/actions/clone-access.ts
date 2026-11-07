"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminUser } from "@/lib/admin";
import { getUser } from "@/lib/auth";
import { logAdminAction } from "@/lib/data/admin-audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "./result";

/**
 * Admin switch for "Tâm sự": a row in `clone_access` means the account may open /tam-su and use /api/clone; no row
 * means it may not. Actions are public endpoints, so the caller is checked again here (an admin), the input is
 * validated, and the write goes through the service-role client: no client role can write this table.
 *
 * This only decides who may use the feature. Stored conversations are read under /admin?tab=tamsu.
 */
const input = z.object({ userId: z.uuid(), enabled: z.boolean() });

export async function setCloneAccess(raw: { userId: string; enabled: boolean }): Promise<ActionResult> {
  const me = await getUser();
  if (!me || !(await isAdminUser(me))) return fail("Bạn không có quyền quản trị.");
  const parsed = input.safeParse(raw);
  if (!parsed.success) return fail("Dữ liệu không hợp lệ.");
  const { userId, enabled } = parsed.data;

  const sb = createAdminClient();
  const { data } = await sb.auth.admin.getUserById(userId);
  if (!data.user) return fail("Không tìm thấy tài khoản.");
  // Admins always have it; a row for them would mean nothing and would linger if the role is taken away later.
  if (await isAdminUser({ id: data.user.id, email: data.user.email ?? null })) {
    return fail("Quản trị viên luôn dùng được Tâm sự, không cần bật.");
  }

  if (enabled) {
    // Keeps the first grant (who and when) if it is switched on twice.
    const { error } = await sb
      .from("clone_access")
      .upsert({ user_id: userId, granted_by: me.id }, { onConflict: "user_id", ignoreDuplicates: true });
    if (error) return fail("Chưa bật được. Thử lại sau một chút nhé.");
  } else {
    const { error } = await sb.from("clone_access").delete().eq("user_id", userId);
    if (error) return fail("Chưa tắt được. Thử lại sau một chút nhé.");
  }

  await logAdminAction({
    admin: me,
    action: enabled ? "clone_on" : "clone_off",
    target: { userId, label: data.user.email ?? undefined },
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/users/${userId}`);
  return ok();
}
