import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type SessionUser = { id: string; email: string | null };

/** Verified user from the session JWT (no network round-trip with asymmetric keys). */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: (claims.email as string | undefined) ?? null };
});

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export type Me = {
  user: SessionUser;
  profile: Tables<"profiles">;
  settings: Tables<"user_settings">;
};

/**
 * Profile + private settings of a user whose session is already verified (one round, both reads together).
 * Null when either row is missing (the account was deleted). Routes that have the user from `getUser()` call
 * this directly so they can start their other queries at the same time instead of after it.
 */
export async function loadMe(user: SessionUser): Promise<Me | null> {
  const supabase = await createClient();
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
  ]);
  if (!profile || !settings) return null;
  return { user, profile, settings };
}

/** Current user's profile + private settings (cached per request). */
export const getMe = cache(async (): Promise<Me | null> => {
  const user = await getUser();
  return user ? loadMe(user) : null;
});

export async function requireMe(): Promise<Me> {
  const me = await getMe();
  // A valid JWT without a profile means the account was deleted (e.g. on another device):
  // clear that session, or "/" → /today → /login → /today would loop.
  if (!me) redirect((await getUser()) ? "/auth/signout" : "/login");
  return me;
}
