import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

export type AuditLogRow = Tables<"admin_audit_log">;

export const AUDIT_LABELS: Record<string, string> = {
  ban: "Khóa tài khoản",
  unban: "Mở khóa",
  delete_user: "Xóa tài khoản",
  grant_admin: "Cấp quyền quản trị",
  revoke_admin: "Thu hồi quyền quản trị",
  hide_deck: "Ẩn bộ từ",
  delete_deck: "Xóa bộ từ",
  delete_group: "Xóa nhóm",
  delete_word: "Xóa từ",
  view_login_history: "Xem lịch sử đăng nhập",
  view_chat: "Xem trò chuyện gia sư",
  export_user: "Xuất dữ liệu người dùng",
  save_note: "Lưu ghi chú",
};

export const AUDIT_PER_PAGE = 50;

export async function logAdminAction({
  admin,
  action,
  target,
  meta = {},
  dedupeMinutes,
}: {
  admin: { id: string; email?: string | null };
  action: string;
  target?: { userId?: string; label?: string };
  meta?: Record<string, unknown>;
  dedupeMinutes?: number;
}): Promise<void> {
  try {
    const sb = createAdminClient();

    if (dedupeMinutes && dedupeMinutes > 0 && target?.userId) {
      const since = new Date(Date.now() - dedupeMinutes * 60_000).toISOString();
      const { data: existing } = await sb
        .from("admin_audit_log")
        .select("id")
        .eq("admin_id", admin.id)
        .eq("action", action)
        .eq("target_user_id", target.userId)
        .gte("created_at", since)
        .limit(1);

      if (existing && existing.length > 0) {
        return; // Skip duplicate action within window
      }
    }

    await sb.from("admin_audit_log").insert({
      admin_id: admin.id,
      admin_email: admin.email?.slice(0, 254) ?? null,
      action: action.slice(0, 60),
      target_user_id: target?.userId ?? null,
      target_label: target?.label?.slice(0, 200) ?? null,
      meta: (meta ?? {}) as unknown as Record<string, never>,
    });
  } catch (e) {
    // Audit logging must NEVER break the caller application
    console.error("[admin_audit]", (e as Error).message);
  }
}

export async function listAuditLog({
  action,
  page = 1,
  limit = AUDIT_PER_PAGE,
}: {
  action?: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: AuditLogRow[];
  total: number;
  totalPages: number;
}> {
  const sb = createAdminClient();
  let query = sb.from("admin_audit_log").select("*", { count: "exact" });

  if (action && action !== "all") {
    query = query.eq("action", action);
  }

  const safePage = Math.max(1, page);
  const from = (safePage - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[listAuditLog]", error.message);
    return { items: [], total: 0, totalPages: 1 };
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items: data ?? [],
    total,
    totalPages,
  };
}

export async function getUserNote(userId: string): Promise<string | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("admin_user_notes")
    .select("note")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getUserNote]", error.message);
    return null;
  }
  return data?.note ?? null;
}
