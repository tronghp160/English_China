"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { reminderPayload, sendPush, vapidPublicKey } from "@/lib/push";
import { hitRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "./result";

/** PushSubscription.toJSON() shape. */
const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Saves this device for daily reminders. Upsert by endpoint, so a shared device moves to the current account. */
export async function savePushSubscription(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (!vapidPublicKey()) return fail("Máy chủ chưa bật thông báo nhắc ôn.");
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return fail("Trình duyệt trả về đăng ký không hợp lệ.");
  const { endpoint, keys } = parsed.data;
  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert({ endpoint, user_id: user.id, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: "endpoint" });
  if (error) return fail("Không lưu được. Thử lại.");
  return ok();
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!z.url().safeParse(endpoint).success) return fail("Đăng ký không hợp lệ.");
  await createAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return ok();
}

/** "Gửi thử": a sample reminder to every device of the current user. */
export async function sendTestReminder(): Promise<ActionResult<{ sent: number }>> {
  const user = await requireUser();
  if (!vapidPublicKey()) return fail("Máy chủ chưa bật thông báo nhắc ôn.");
  if (!(await hitRateLimit(user.id, "push-test", 5, 3600))) return fail("Bạn đã gửi thử nhiều lần. Đợi một lát nhé.");
  const { sent } = await sendPush([user.id], { ...reminderPayload(5), tag: "test-reminder" });
  if (!sent) return fail("Không gửi được. Hãy tắt rồi bật lại nhắc ôn trên máy này.");
  return ok({ sent });
}
