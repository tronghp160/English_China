import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { reminderPayload, sendPush, vapidPublicKey } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Daily review reminder (Vercel Cron, see vercel.json). Vercel sends
 * "Authorization: Bearer $CRON_SECRET". Each user is reminded at most once per study day.
 */
export async function GET(request: Request) {
  const env = serverEnv();
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!vapidPublicKey()) return NextResponse.json({ error: "push not configured" }, { status: 503 });

  const admin = createAdminClient();
  const { data: targets, error } = await admin.rpc("reminder_targets");
  if (error) {
    console.error("[cron/reminders]", error.message);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
  const due = new Map((targets ?? []).map((t) => [t.user_id, t.due_count]));
  const { sent, failed } = await sendPush([...due.keys()], (userId) => reminderPayload(due.get(userId) ?? 0));
  if (due.size) await admin.rpc("mark_reminded", { p_user_ids: [...due.keys()] });
  return NextResponse.json({ users: due.size, sent, failed });
}
