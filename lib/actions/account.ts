"use server";

import { z } from "zod";
import { requireMe } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "./result";

const deleteSchema = z.object({ confirm: z.string().trim().max(40) });

const BUCKETS = ["avatars", "word-images"] as const;

/** Removes every file under `<userId>/` in the user's storage buckets. */
async function removeUserFiles(userId: string) {
  const storage = createAdminClient().storage;
  for (const bucket of BUCKETS) {
    for (;;) {
      const { data, error } = await storage.from(bucket).list(userId, { limit: 1000 });
      if (error) throw error;
      if (!data?.length) break;
      const { error: rmError } = await storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
      if (rmError) throw rmError;
      if (data.length < 1000) break;
    }
  }
}

/**
 * Deletes the account for good. The auth user row cascades to the profile and
 * every table that references it (decks, words in them, groups the user owns,
 * progress, stats); words the user added to other people's decks stay, with
 * `created_by` set to null.
 */
export async function deleteAccount(input: { confirm: string }): Promise<ActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return fail("Dữ liệu không hợp lệ.");
  const me = await requireMe();
  if (parsed.data.confirm.replace(/^@/, "").toLowerCase() !== me.profile.username.toLowerCase()) {
    return fail("Tên người dùng không khớp.", { confirm: "Gõ đúng tên người dùng của bạn để xác nhận." });
  }

  try {
    await removeUserFiles(me.user.id);
  } catch (e) {
    console.error("[account] storage cleanup failed", e);
    return fail("Chưa xóa được ảnh của bạn, thử lại sau.");
  }
  const { error } = await createAdminClient().auth.admin.deleteUser(me.user.id);
  if (error) {
    console.error("[account] delete failed", error.message);
    return fail("Chưa xóa được tài khoản, thử lại sau.");
  }
  // The session belongs to a user that no longer exists: clear the cookies locally.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  return ok();
}
