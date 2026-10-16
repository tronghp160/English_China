import "server-only";
import { cache } from "react";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Groups the current user belongs to. */
export const getMyGroups = cache(async () => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("role, group:groups(id, name, description, owner_id, invite_code, created_at)")
    .eq("user_id", user.id);
  return (data ?? [])
    .filter((m) => m.group)
    .map((m) => ({ ...m.group!, role: m.role }));
});
