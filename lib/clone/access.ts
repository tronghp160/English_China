import "server-only";
import { cache } from "react";
import { isAdminUser } from "@/lib/admin";
import { getUser, type SessionUser } from "@/lib/auth";
import { cloneConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Who may use "Tâm sự" (the "bản AI" companion): admins, and the accounts an admin switched it on for (a row in
 * `clone_access`, written only by `setCloneAccess` in lib/actions/clone-access.ts). Everybody else has no way in:
 * the page and the route answer 404, and no entry point is shown.
 *
 * The two reads run together, so asking costs one round trip. The grant is read with the user's own client (RLS shows
 * a person their own row only). An admin is in whatever the grant read does. For anybody else a failed read throws
 * instead of answering "no": callers decide what a failure means (the route says "try again", pages and menus stay
 * hidden), and nobody gets in because the check broke.
 */
export async function canUseClone(user: SessionUser): Promise<boolean> {
  const grant = hasCloneGrant(user.id).then(
    (granted) => ({ granted }),
    () => ({ failed: true as const }),
  );
  const [admin, result] = await Promise.all([isAdminUser(user), grant]);
  if (admin) return true;
  if ("failed" in result) throw new Error("clone_access read failed");
  return result.granted;
}

async function hasCloneGrant(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clone_access").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("clone_access read failed");
  return Boolean(data);
}

/**
 * For pages, layouts and menus of the signed-in visitor, once per request: the feature is switched on in the server
 * env (a profile is set) AND this account may use it. A failed check hides the feature.
 */
export const cloneAvailable = cache(async (): Promise<boolean> => {
  if (!cloneConfig()) return false;
  const user = await getUser();
  if (!user) return false;
  return canUseClone(user).catch(() => false);
});
