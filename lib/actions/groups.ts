"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { optionalText, text } from "@/lib/word-schema";
import { fail, ok, zodFieldErrors, type ActionResult } from "./result";

const idSchema = z.string().uuid();
const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{8}$/, "Mã mời gồm 8 ký tự");

const groupInputSchema = z.object({
  name: text(60).min(1, "Nhập tên nhóm"),
  description: optionalText(300),
});
export type GroupInput = z.input<typeof groupInputSchema>;

export async function createGroup(input: GroupInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = groupInputSchema.safeParse(input);
  if (!parsed.success) return fail("Kiểm tra lại thông tin.", zodFieldErrors(parsed.error.issues));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    // invite_code is set by the groups_before_insert trigger
    .insert({ name: parsed.data.name, description: parsed.data.description, owner_id: user.id, invite_code: "" })
    .select("id")
    .single();
  if (error?.message.includes("group_limit_reached")) return fail("Mỗi người tạo tối đa 10 nhóm.");
  if (error || !data) return fail("Không tạo được nhóm. Thử lại.");
  revalidatePath("/groups");
  return ok({ id: data.id });
}

export async function updateGroup(groupId: string, input: GroupInput): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(groupId).success) return fail("Nhóm không hợp lệ.");
  const parsed = groupInputSchema.safeParse(input);
  if (!parsed.success) return fail("Kiểm tra lại thông tin.", zodFieldErrors(parsed.error.issues));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .update({ name: parsed.data.name, description: parsed.data.description })
    .eq("id", groupId)
    .select("id");
  if (error || !data?.length) return fail("Không lưu được. Chỉ chủ nhóm mới sửa được.");
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  return ok();
}

export async function regenerateInviteCode(groupId: string): Promise<ActionResult<{ code: string }>> {
  await requireUser();
  if (!idSchema.safeParse(groupId).success) return fail("Nhóm không hợp lệ.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerate_invite_code", { p_group_id: groupId });
  if (error || !data) return fail("Không tạo được mã mới. Chỉ chủ nhóm mới đổi được.");
  revalidatePath(`/groups/${groupId}`);
  return ok({ code: data });
}

export async function joinGroup(code: string): Promise<ActionResult<{ groupId: string }>> {
  await requireUser();
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_group", { p_code: parsed.data });
  if (error?.message.includes("invalid_invite_code")) return fail("Mã mời không đúng hoặc đã được đổi.");
  if (error?.message.includes("group_full")) return fail("Nhóm đã đủ 100 thành viên.");
  if (error || !data) return fail("Không vào được nhóm. Thử lại.");
  await supabase.rpc("ensure_user_cards", {});
  revalidatePath("/groups");
  revalidatePath("/decks");
  return ok({ groupId: data });
}

/** Owner removes a member, or a member removes themself (leave). */
export async function removeMember(groupId: string, userId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!idSchema.safeParse(groupId).success || !idSchema.safeParse(userId).success) {
    return fail("Thông tin không hợp lệ.");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .select("user_id");
  if (error || !data?.length) {
    return fail(userId === user.id ? "Chủ nhóm không rời nhóm được, hãy xóa nhóm." : "Không xóa được thành viên.");
  }
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  revalidatePath("/decks");
  return ok();
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  await requireUser();
  if (!idSchema.safeParse(groupId).success) return fail("Nhóm không hợp lệ.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("groups").delete().eq("id", groupId).select("id");
  if (error || !data?.length) return fail("Không xóa được nhóm.");
  revalidatePath("/groups");
  revalidatePath("/decks");
  return ok();
}
