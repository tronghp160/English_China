// Seeds realistic presence, login events, and pet data for demo accounts:
// demo@example.com (online), minh@example.com (away), lan@example.com (offline).
// Safe to re-run: replaces only these 3 users' presence & login events.
// Usage: pnpm admin:seed-presence

import fs from "node:fs";
import crypto from "node:crypto";
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

async function findUser(email) {
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

const now = new Date();
const todayDateStr = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(now);

const demo = await findUser("demo@example.com");
const minh = await findUser("minh@example.com");
const lan = await findUser("lan@example.com");

if (!demo || !minh || !lan) {
  console.error("Vui lòng chạy `pnpm db:seed` trước để tạo các tài khoản demo.");
  process.exit(1);
}

const userIds = [demo.id, minh.id, lan.id];

// 1. Clean previous presence and login_events for safe re-run
await sb.from("user_presence").delete().in("user_id", userIds);
await sb.from("login_events").delete().in("user_id", userIds);

// 2. Insert user_presence
await sb.from("user_presence").insert([
  {
    user_id: demo.id,
    last_seen_at: now.toISOString(),
    path: "/review",
    session_id: crypto.randomUUID(),
    ip: "118.69.182.45",
    country: "VN",
    region: "SG",
    city: "Hồ Chí Minh",
    latitude: 10.8231,
    longitude: 106.6297,
    timezone: "Asia/Ho_Chi_Minh",
    device_type: "desktop",
    device_model: "PC (NVIDIA GeForce RTX 4070)",
    browser: "Chrome",
    os: "Windows",
    user_agent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
  {
    user_id: minh.id,
    last_seen_at: new Date(now.getTime() - 8 * 60_000).toISOString(),
    path: "/chat",
    session_id: crypto.randomUUID(),
    ip: "113.190.234.12",
    country: "VN",
    region: "HN",
    city: "Hà Nội",
    latitude: 21.0285,
    longitude: 105.8542,
    timezone: "Asia/Ho_Chi_Minh",
    device_type: "mobile",
    device_model: "iPhone 16 Pro Max",
    browser: "Safari",
    os: "iOS",
    user_agent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  },
  {
    user_id: lan.id,
    last_seen_at: new Date(now.getTime() - 3 * 86_400_000).toISOString(),
    path: "/decks",
    session_id: crypto.randomUUID(),
    ip: "14.232.180.99",
    country: "VN",
    region: "DN",
    city: "Đà Nẵng",
    latitude: 16.0544,
    longitude: 108.2022,
    timezone: "Asia/Ho_Chi_Minh",
    device_type: "mobile",
    device_model: "Samsung Galaxy S21 Ultra",
    browser: "Zalo",
    os: "Android",
    user_agent:
      "Mozilla/5.0 (Linux; U; Android 13; vi-vn; SM-G998B Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36 Zalo/23.05.01",
  },
]);

// 3. Insert login_events
await sb.from("login_events").insert([
  // Demo logins
  {
    user_id: demo.id,
    session_id: crypto.randomUUID(),
    ip: "103.252.118.2",
    country: "SG",
    region: "01",
    city: "Singapore",
    latitude: 1.2897,
    longitude: 103.8501,
    timezone: "Asia/Singapore",
    device_type: "desktop",
    device_model: "PC (NVIDIA GeForce RTX 4070)",
    browser: "Chrome",
    os: "Windows",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    created_at: new Date(now.getTime() - 18 * 86_400_000).toISOString(),
  },
  {
    user_id: demo.id,
    session_id: crypto.randomUUID(),
    ip: "113.190.10.22",
    country: "VN",
    region: "HN",
    city: "Hà Nội",
    latitude: 21.0285,
    longitude: 105.8542,
    timezone: "Asia/Ho_Chi_Minh",
    device_type: "mobile",
    device_model: "iPhone 15 Pro",
    browser: "Safari",
    os: "iOS",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    created_at: new Date(now.getTime() - 9 * 86_400_000).toISOString(),
  },
  {
    user_id: demo.id,
    session_id: crypto.randomUUID(),
    ip: "118.69.182.45",
    country: "VN",
    region: "SG",
    city: "Hồ Chí Minh",
    latitude: 10.8231,
    longitude: 106.6297,
    timezone: "Asia/Ho_Chi_Minh",
    device_type: "desktop",
    device_model: "PC (NVIDIA GeForce RTX 4070)",
    browser: "Chrome",
    os: "Windows",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    created_at: new Date(now.getTime() - 4 * 86_400_000).toISOString(),
  },
  {
    user_id: demo.id,
    session_id: crypto.randomUUID(),
    ip: "118.69.182.45",
    country: "VN",
    region: "SG",
    city: "Hồ Chí Minh",
    latitude: 10.8231,
    longitude: 106.6297,
    timezone: "Asia/Ho_Chi_Minh",
    device_type: "desktop",
    device_model: "PC (NVIDIA GeForce RTX 4070)",
    browser: "Chrome",
    os: "Windows",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    created_at: new Date(now.getTime() - 30 * 60_000).toISOString(),
  },

  // Minh logins
  {
    user_id: minh.id,
    session_id: crypto.randomUUID(),
    ip: "14.232.100.5",
    country: "VN",
    region: "DN",
    city: "Đà Nẵng",
    latitude: 16.0544,
    longitude: 108.2022,
    timezone: "Asia/Ho_Chi_Minh",
    device_type: "desktop",
    device_model: "PC (Intel UHD Graphics)",
    browser: "Firefox",
    os: "Windows",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0)",
    created_at: new Date(now.getTime() - 14 * 86_400_000).toISOString(),
  },
  {
    user_id: minh.id,
    session_id: crypto.randomUUID(),
    ip: "113.190.234.12",
    country: "VN",
    region: "HN",
    city: "Hà Nội",
    latitude: 21.0285,
    longitude: 105.8542,
    timezone: "Asia/Ho_Chi_Minh",
    device_type: "mobile",
    device_model: "iPhone 16 Pro Max",
    browser: "Safari",
    os: "iOS",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    created_at: new Date(now.getTime() - 6 * 86_400_000).toISOString(),
  },
  {
    user_id: minh.id,
    session_id: crypto.randomUUID(),
    ip: "113.190.234.12",
    country: "VN",
    region: "HN",
    city: "Hà Nội",
    latitude: 21.0285,
    longitude: 105.8542,
    timezone: "Asia/Ho_Chi_Minh",
    device_type: "mobile",
    device_model: "iPhone 16 Pro Max",
    browser: "Safari",
    os: "iOS",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    created_at: new Date(now.getTime() - 8 * 60_000).toISOString(),
  },

  // Lan logins
  {
    user_id: lan.id,
    session_id: crypto.randomUUID(),
    ip: "118.69.50.2",
    country: "VN",
    region: "SG",
    city: "Hồ Chí Minh",
    latitude: 10.8231,
    longitude: 106.6297,
    timezone: "Asia/Ho_Chi_Minh",
    device_type: "desktop",
    device_model: "PC (AMD Radeon RX 6700 XT)",
    browser: "Edge",
    os: "Windows",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/119.0",
    created_at: new Date(now.getTime() - 11 * 86_400_000).toISOString(),
  },
  {
    user_id: lan.id,
    session_id: crypto.randomUUID(),
    ip: "14.232.180.99",
    country: "VN",
    region: "DN",
    city: "Đà Nẵng",
    latitude: 16.0544,
    longitude: 108.2022,
    timezone: "Asia/Ho_Chi_Minh",
    device_type: "mobile",
    device_model: "Samsung Galaxy S21 Ultra",
    browser: "Zalo",
    os: "Android",
    user_agent: "Mozilla/5.0 (Linux; Android 13)",
    created_at: new Date(now.getTime() - 3 * 86_400_000).toISOString(),
  },
]);

// 4. Update Minh's pet preferences & XP
const { data: minhSettings } = await sb
  .from("user_settings")
  .select("prefs")
  .eq("user_id", minh.id)
  .maybeSingle();

const mergedPrefs = {
  ...(typeof minhSettings?.prefs === "object" && minhSettings.prefs !== null
    ? minhSettings.prefs
    : {}),
  bin_outfit: "cap",
  bin_treats_fed: 2,
  bin_last_fed: todayDateStr,
};

await sb
  .from("user_settings")
  .update({ prefs: mergedPrefs })
  .eq("user_id", minh.id);

// Ensure Minh has enough XP (>= 500) for cap outfit
const { data: existingMinhStats } = await sb
  .from("daily_stats")
  .select("xp")
  .eq("user_id", minh.id);

const currentXp = (existingMinhStats ?? []).reduce((acc, r) => acc + (r.xp ?? 0), 0);
if (currentXp < 550) {
  await sb.from("daily_stats").insert({
    user_id: minh.id,
    day: todayDateStr,
    reviews: 20,
    correct: 18,
    new_learned: 10,
    xp: 550 - currentXp,
  });
}

console.log("✓ Đã nạp dữ liệu hiện diện, đăng nhập và thú cưng cho demo, minh, lan.");
