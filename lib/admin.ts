import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getUser, type SessionUser } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/** Emails in ADMIN_EMAILS (comma separated): admins that cannot be removed from the app, only from the env. */
export function envAdminEmails(): string[] {
  return (serverEnv().ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** An admin is listed in ADMIN_EMAILS or has a row in app_admins (granted in /admin or with `pnpm admin:grant`). */
export async function isAdminUser(user: SessionUser): Promise<boolean> {
  if (user.email && envAdminEmails().includes(user.email.toLowerCase())) return true;
  const { data } = await createAdminClient().from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return Boolean(data);
}

export const isAdmin = cache(async (): Promise<boolean> => {
  const user = await getUser();
  return user ? isAdminUser(user) : false;
});

/** For /admin pages and admin actions: anyone else gets a plain 404, so the page does not advertise itself. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getUser();
  if (!user || !(await isAdminUser(user))) notFound();
  return user;
}
