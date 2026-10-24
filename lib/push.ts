import "server-only";
import webpush, { WebPushError } from "web-push";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = { title: string; body: string; url: string; tag: string };

/** Notification text for the daily reminder. Pure, so it can be unit-tested. */
export function reminderPayload(dueCount: number): PushPayload {
  return {
    title: "Đến giờ ôn từ rồi",
    body:
      dueCount === 1
        ? "Hôm nay còn 1 từ cần ôn. Chưa tới một phút."
        : `Hôm nay còn ${dueCount} từ cần ôn. Vài phút là xong.`,
    url: "/review",
    tag: "daily-reminder",
  };
}

export function vapidPublicKey() {
  const env = serverEnv();
  return env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? env.VAPID_PUBLIC_KEY : null;
}

let configured = false;
function configure() {
  const env = serverEnv();
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) throw new Error("VAPID keys are not set");
  if (!configured) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    configured = true;
  }
}

/**
 * Sends one payload to every device of the given users. Subscriptions the push
 * service reports as gone (404/410) are deleted. Returns how many were delivered.
 */
export async function sendPush(userIds: string[], payload: PushPayload | ((userId: string) => PushPayload)) {
  configure();
  if (!userIds.length) return { sent: 0, failed: 0 };
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, user_id, p256dh, auth")
    .in("user_id", userIds);
  let sent = 0;
  let failed = 0;
  const gone: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      const body = typeof payload === "function" ? payload(s.user_id) : payload;
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(body),
          { TTL: 6 * 3600, urgency: "normal", topic: body.tag },
        );
        sent++;
      } catch (e) {
        failed++;
        if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) gone.push(s.endpoint);
        else console.error("[push]", e instanceof WebPushError ? `${e.statusCode} ${e.body}` : e);
      }
    }),
  );
  if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);
  return { sent, failed };
}
