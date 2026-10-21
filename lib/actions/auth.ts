"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { displayNameSchema, emailSchema, passwordSchema } from "@/lib/validation";
import { fail, ok, zodFieldErrors, type ActionResult } from "./result";

const signUpSchema = z.object({
  display_name: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

/*
 * Accounts are created already confirmed (no confirmation email), like most sites.
 * The service-role call is not rate-limited by Supabase, so limit it per IP here.
 * In memory: per server instance, which is enough to slow a script down at this scale.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, { count: number; reset: number }>();

async function overLimit(bucket: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_PER_WINDOW;
}

/** Creates a confirmed email + password account. The browser signs in right after. */
export async function signUpWithPassword(
  input: z.input<typeof signUpSchema>,
): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fail("Kiểm tra lại thông tin.", zodFieldErrors(parsed.error.issues));
  if (await overLimit("signup"))
    return fail("Bạn tạo quá nhiều tài khoản. Đợi một lát rồi thử lại.");

  const { email, password, display_name } = parsed.data;
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: display_name },
  });
  if (error) {
    if (
      error.code === "email_exists" ||
      error.code === "user_already_exists" ||
      error.status === 422
    ) {
      return fail("Email này đã có tài khoản. Hãy đăng nhập, hoặc dùng “Quên mật khẩu”.", {
        email: "Email này đã có tài khoản.",
      });
    }
    if (error.code === "weak_password")
      return fail("Mật khẩu quá yếu hoặc quá phổ biến. Chọn mật khẩu khác.");
    console.error("[signup]", error.code, error.message);
    return fail("Không tạo được tài khoản. Thử lại sau.");
  }
  return ok();
}

/**
 * Accounts made while "Confirm email" was on may still be unconfirmed. Supabase
 * only answers email_not_confirmed after the password matched, so confirm the
 * account when that is what a sign-in with these credentials returns.
 */
export async function confirmPendingAccount(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1).max(72) })
    .safeParse(input);
  if (!parsed.success) return fail("Email hoặc mật khẩu không đúng.");
  if (await overLimit("confirm")) return fail("Bạn thử quá nhiều lần. Đợi một lát rồi thử lại.");

  const env = publicEnv();
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await anon.auth.signInWithPassword(parsed.data);
  if (!error) return ok(); // already confirmed
  if (error.code !== "email_not_confirmed") return fail("Email hoặc mật khẩu không đúng.");

  const admin = createAdminClient();
  for (let page = 1; page <= 20; page++) {
    const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (listError) break;
    const user = data.users.find((u) => u.email === parsed.data.email);
    if (user) {
      const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
      return updateError ? fail("Không kích hoạt được tài khoản. Thử lại sau.") : ok();
    }
    if (data.users.length < 1000) break;
  }
  return fail("Email hoặc mật khẩu không đúng.");
}
