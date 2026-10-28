"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { removeUserFiles } from "@/lib/account-files";
import { envAdminEmails, isAdminUser } from "@/lib/admin";
import { getUser } from "@/lib/auth";
import { logAdminAction } from "@/lib/data/admin-audit";
import { findUserByEmail } from "@/lib/data/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "./result";

/**
 * What an admin can do in /admin. Every action checks the session again (the page check is not enough: actions
 * are public endpoints), validates its input and never touches the caller's own account or another admin's.
 */

const id = z.uuid();
const BAN_FOREVER = "876000h"; // 100 years: Supabase has no "forever"

async function guard() {
  const user = await getUser();
  return user && (await isAdminUser(user)) ? user : null;
}

/** The target must exist, must not be the caller and must not be an admin (revoke the role first). */
async function ordinaryTarget(callerId: string, userId: string): Promise<string | null> {
  if (userId === callerId) return "Không thể làm việc này với chính tài khoản của bạn.";
  const { data } = await createAdminClient().auth.admin.getUserById(userId);
  if (!data.user) return "Không tìm thấy tài khoản.";
  if (await isAdminUser({ id: data.user.id, email: data.user.email ?? null })) return "Tài khoản này là quản trị viên. Gỡ quyền trước đã.";
  return null;
}

export async function setUserBanned(input: { userId: string; banned: boolean }): Promise<ActionResult> {
  const me = await guard();
  if (!me) return fail("Bạn không có quyền quản trị.");
  const parsed = z.object({ userId: id, banned: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail("Dữ liệu không hợp lệ.");
  const why = await ordinaryTarget(me.id, parsed.data.userId);
  if (why) return fail(why);
  const { error } = await createAdminClient().auth.admin.updateUserById(parsed.data.userId, {
    ban_duration: parsed.data.banned ? BAN_FOREVER : "none",
  });
  if (error) return fail("Chưa đổi được trạng thái tài khoản.");
  await logAdminAction({
    admin: me,
    action: parsed.data.banned ? "ban" : "unban",
    target: { userId: parsed.data.userId },
  });
  revalidatePath("/admin");
  return ok();
}

export async function deleteUserAccount(input: { userId: string }): Promise<ActionResult> {
  const me = await guard();
  if (!me) return fail("Bạn không có quyền quản trị.");
  const parsed = z.object({ userId: id }).safeParse(input);
  if (!parsed.success) return fail("Dữ liệu không hợp lệ.");
  const why = await ordinaryTarget(me.id, parsed.data.userId);
  if (why) return fail(why);
  const { data: targetUser } = await createAdminClient().auth.admin.getUserById(parsed.data.userId);
  const targetEmail = targetUser?.user?.email ?? undefined;
  try {
    await removeUserFiles(parsed.data.userId);
  } catch (e) {
    console.error("[admin] storage cleanup failed", e);
    return fail("Chưa xóa được ảnh của tài khoản này, thử lại sau.");
  }
  const { error } = await createAdminClient().auth.admin.deleteUser(parsed.data.userId);
  if (error) return fail("Chưa xóa được tài khoản.");
  await logAdminAction({
    admin: me,
    action: "delete_user",
    target: { userId: parsed.data.userId, label: targetEmail },
  });
  revalidatePath("/admin");
  return ok();
}

/** Takes a deck off Khám phá: it becomes a private deck of its owner (nothing is deleted). */
export async function hidePublicDeck(input: { deckId: string }): Promise<ActionResult> {
  const me = await guard();
  if (!me) return fail("Bạn không có quyền quản trị.");
  const parsed = z.object({ deckId: id }).safeParse(input);
  if (!parsed.success) return fail("Dữ liệu không hợp lệ.");
  const { data, error } = await createAdminClient()
    .from("decks")
    .update({ visibility: "private" })
    .eq("id", parsed.data.deckId)
    .eq("visibility", "public")
    .select("id");
  if (error || !data?.length) return fail("Chưa ẩn được bộ từ.");
  await logAdminAction({
    admin: me,
    action: "hide_deck",
    target: { label: `deck:${parsed.data.deckId}` },
  });
  revalidatePath("/admin");
  revalidatePath("/explore");
  return ok();
}

export async function deleteDeckAsAdmin(input: { deckId: string }): Promise<ActionResult> {
  const me = await guard();
  if (!me) return fail("Bạn không có quyền quản trị.");
  const parsed = z.object({ deckId: id }).safeParse(input);
  if (!parsed.success) return fail("Dữ liệu không hợp lệ.");
  const { data, error } = await createAdminClient().from("decks").delete().eq("id", parsed.data.deckId).select("id");
  if (error || !data?.length) return fail("Chưa xóa được bộ từ.");
  await logAdminAction({
    admin: me,
    action: "delete_deck",
    target: { label: `deck:${parsed.data.deckId}` },
  });
  revalidatePath("/admin");
  revalidatePath("/explore");
  return ok();
}

/** Deleting a group turns its group decks back into private decks of their owners (database trigger, migration 000007). */
export async function deleteGroupAsAdmin(input: { groupId: string }): Promise<ActionResult> {
  const me = await guard();
  if (!me) return fail("Bạn không có quyền quản trị.");
  const parsed = z.object({ groupId: id }).safeParse(input);
  if (!parsed.success) return fail("Dữ liệu không hợp lệ.");
  const { data, error } = await createAdminClient().from("groups").delete().eq("id", parsed.data.groupId).select("id");
  if (error || !data?.length) return fail("Chưa xóa được nhóm.");
  await logAdminAction({
    admin: me,
    action: "delete_group",
    target: { label: `group:${parsed.data.groupId}` },
  });
  revalidatePath("/admin");
  return ok();
}

export async function grantAdmin(input: { email: string }): Promise<ActionResult> {
  const me = await guard();
  if (!me) return fail("Bạn không có quyền quản trị.");
  const parsed = z.object({ email: z.email("Email không hợp lệ.").max(200) }).safeParse(input);
  if (!parsed.success) return fail("Email không hợp lệ.", { email: "Nhập đúng email của tài khoản." });
  const user = await findUserByEmail(parsed.data.email);
  if (!user) return fail("Chưa có tài khoản nào dùng email này.", { email: "Người đó cần đăng ký Sổ Từ trước." });
  const { error } = await createAdminClient()
    .from("app_admins")
    .upsert({ user_id: user.id, granted_by: me.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) return fail("Chưa cấp được quyền.");
  await logAdminAction({
    admin: me,
    action: "grant_admin",
    target: { userId: user.id, label: parsed.data.email },
  });
  revalidatePath("/admin");
  return ok();
}

export async function revokeAdmin(input: { userId: string }): Promise<ActionResult> {
  const me = await guard();
  if (!me) return fail("Bạn không có quyền quản trị.");
  const parsed = z.object({ userId: id }).safeParse(input);
  if (!parsed.success) return fail("Dữ liệu không hợp lệ.");
  if (parsed.data.userId === me.id) return fail("Không thể tự gỡ quyền của mình.");
  const { data } = await createAdminClient().auth.admin.getUserById(parsed.data.userId);
  if (data.user?.email && envAdminEmails().includes(data.user.email.toLowerCase())) {
    return fail("Người này có trong ADMIN_EMAILS: gỡ ở biến môi trường.");
  }
  const { error } = await createAdminClient().from("app_admins").delete().eq("user_id", parsed.data.userId);
  if (error) return fail("Chưa gỡ được quyền.");
  await logAdminAction({
    admin: me,
    action: "revoke_admin",
    target: { userId: parsed.data.userId, label: data.user?.email ?? undefined },
  });
  revalidatePath("/admin");
  return ok();
}

export async function deleteWordAsAdmin(input: { wordId: string }): Promise<ActionResult> {
  const me = await guard();
  if (!me) return fail("Bạn không có quyền quản trị.");
  const parsed = z.object({ wordId: id }).safeParse(input);
  if (!parsed.success) return fail("Dữ liệu không hợp lệ.");

  const sb = createAdminClient();
  const { data, error } = await sb
    .from("words")
    .delete()
    .eq("id", parsed.data.wordId)
    .select("id, image_source");

  if (error || !data?.length) return fail("Chưa xóa được từ.");

  const imgSource = data[0].image_source as { provider?: string; storage_path?: string } | null;
  if (imgSource?.provider === "upload" && imgSource.storage_path) {
    try {
      await sb.storage.from("word-images").remove([imgSource.storage_path]);
    } catch (e) {
      console.error("[admin] image storage cleanup failed", e);
    }
  }

  await logAdminAction({
    admin: me,
    action: "delete_word",
    target: { label: `word:${parsed.data.wordId}` },
  });

  revalidatePath("/admin");
  return ok();
}

export async function saveUserNote(input: { userId: string; note: string }): Promise<ActionResult> {
  const me = await guard();
  if (!me) return fail("Bạn không có quyền quản trị.");
  const parsed = z.object({ userId: id, note: z.string().max(2000) }).safeParse(input);
  if (!parsed.success) return fail("Ghi chú không hợp lệ (tối đa 2000 ký tự).");

  const sb = createAdminClient();
  const trimmed = parsed.data.note.trim();
  if (trimmed.length === 0) {
    await sb.from("admin_user_notes").delete().eq("user_id", parsed.data.userId);
  } else {
    await sb.from("admin_user_notes").upsert({
      user_id: parsed.data.userId,
      note: trimmed,
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    });
  }

  await logAdminAction({
    admin: me,
    action: "save_note",
    target: { userId: parsed.data.userId },
    meta: { length: trimmed.length },
  });

  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return ok();
}
