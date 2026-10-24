// Grants, revokes or lists the admins of /admin, with the service role from .env.local.
// Usage: pnpm admin:grant <email> · pnpm admin:revoke <email> · pnpm admin:list
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function userByEmail(email) {
  const needle = email.trim().toLowerCase();
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === needle);
    if (hit) return hit;
    if (data.users.length < 1000) break;
  }
  return null;
}

const [cmd, email] = process.argv.slice(2);
if (cmd === "list") {
  const { data, error } = await sb.from("app_admins").select("user_id, granted_at");
  if (error) throw error;
  for (const row of data) {
    const { data: u } = await sb.auth.admin.getUserById(row.user_id);
    console.log(`${u.user?.email ?? row.user_id}  (từ ${row.granted_at.slice(0, 10)})`);
  }
  if (env.ADMIN_EMAILS) console.log(`ADMIN_EMAILS: ${env.ADMIN_EMAILS}`);
  if (!data.length && !env.ADMIN_EMAILS) console.log("Chưa có quản trị viên nào.");
} else if ((cmd === "grant" || cmd === "revoke") && email) {
  const user = await userByEmail(email);
  if (!user) {
    console.error(`Không có tài khoản nào dùng email ${email}. Đăng ký Sổ Từ bằng email này trước.`);
    process.exit(1);
  }
  const { error } =
    cmd === "grant"
      ? await sb.from("app_admins").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true })
      : await sb.from("app_admins").delete().eq("user_id", user.id);
  if (error) throw error;
  console.log(cmd === "grant" ? `Đã cấp quyền quản trị cho ${email}. Tải lại trang để thấy mục "Quản trị".` : `Đã gỡ quyền quản trị của ${email}.`);
} else {
  console.log("Dùng: pnpm admin:grant <email> | pnpm admin:revoke <email> | pnpm admin:list");
  process.exit(1);
}
