# PLAN — Nâng cấp trang quản trị "Sổ Từ": theo dõi người dùng

> Lưu file này vào repo tại `docs/PLAN-admin-monitoring.md`, rồi gửi cho Antigravity (Gemini 3.8 Flash).
> Repo: `tronghp160/English_China` (app "Sổ Từ": Next.js 16 + Supabase, deploy Vercel).
> Làm tuần tự từng Phase. Mỗi Phase xong: chạy lệnh kiểm tra, commit, rồi mới sang Phase sau.

---

## 0. Đọc trước khi làm (BẮT BUỘC)

### 0.1 Vai trò và phạm vi
Bạn là kỹ sư full-stack. Nhiệm vụ: nâng cấp **trang quản trị `/admin`** để chủ app theo dõi người dùng:
1. Người dùng có đang hoạt động (online) không.
2. Họ đăng nhập ở đâu (IP, thành phố, quốc gia, thiết bị) + lịch sử đăng nhập.
3. Thú cưng của họ (chú cún **Bin**): cấp mấy, đang mặc trang phục gì, tủ đồ, xương, tâm trạng, nhiệm vụ.
4. Các phần quản lý/theo dõi bổ sung (dashboard, cần chú ý, nhật ký quản trị, ghi chú).

**Chỉ làm trang quản trị.** Ngoài `/admin`, chỉ được sửa đúng các file sau (hạ tầng tối thiểu để có dữ liệu):
- `app/(app)/layout.tsx` và `app/(study)/layout.tsx`: thêm 1 dòng `<PresenceBeacon />`.
- `app/api/presence/route.ts` (file mới).
- `components/presence/presence-beacon.tsx` (file mới).
- `lib/export.ts`: thêm `login_history` vào file xuất dữ liệu cá nhân.
- `app/(public)/quyen-rieng-tu/page.tsx`: sửa chính sách quyền riêng tư (hiện đang ghi "Không thu thập IP", sẽ thành sai nếu không sửa).
- `lib/supabase/database.types.ts` (sinh tự động), `CLAUDE.md`, `docs/DEPLOY.md`, `scripts/*`, `tests/*`, `supabase/migrations/*`.

KHÔNG sửa: luồng học, SRS/FSRS, mascot, giao diện người dùng, đăng nhập/đăng ký, server action hiện có (trừ thêm 1 dòng ghi nhật ký trong `lib/actions/admin.ts`).

### 0.2 Quy tắc dự án (từ CLAUDE.md, đã đọc sẵn)
- Chữ trên giao diện: **tiếng Việt**. Code, tên biến, comment: **tiếng Anh**.
- Next.js 16 KHÁC bản cũ. `AGENTS.md` yêu cầu đọc `node_modules/next/dist/docs/` trước khi viết route handler/page. Nhớ: `params`/`searchParams` là Promise; dùng `PageProps<"/admin">` / `LayoutProps<"/">` như file hiện có; `headers()` là async; middleware nay là `proxy.ts`.
- Tailwind v4 + token màu (`bg-surface`, `text-fg-muted`, `bg-success`, `text-success-fg`, `bg-c-sun`...). **Cấm hex thô**, cấm emoji trong UI, cấm animation lặp (chấm online KHÔNG được nhấp nháy/pulse).
- Màu theo tone: dùng `Tone` + `TONE_CLASSES` từ `lib/tone.ts`, không ghép tên class lúc chạy.
- Nút/link phải cao ≥ 40px (dùng `Button`, `size="sm"` đã đạt). Icon-only button cần `aria-label`.
- Bảng rộng phải bọc `overflow-x-auto` (trang không được cuộn ngang ở 390px).
- Mọi server action / route: kiểm tra phiên + **zod** cho input. Admin action gọi `guard()` như `lib/actions/admin.ts`.
- `service_role` chỉ dùng trong module có `import "server-only"` (xem `lib/supabase/admin.ts`).
- Code mới đặt trong file mới nếu được; không phình `lib/data/admin.ts` (842 dòng) và `app/(app)/admin/page.tsx`.
- Dùng lại: `Badge`, `Button`, `Input`, `IconTile`, `SegmentedNav`, `UserAvatar`, `AdminAction`, `formatAgo` (`lib/format.ts`), `requireAdmin`.

### 0.3 Chu trình mỗi Phase
```bash
pnpm exec eslint app components lib tests scripts   # lint
pnpm typecheck
pnpm test                                           # vitest (unit + db bằng PGlite)
git add -A && git commit -m "feat(admin): <mô tả Phase>"
```
Không sang Phase sau khi còn lỗi lint/typecheck/test.

### 0.4 Điều KHÔNG được làm
- Không hiển thị/ghi/đoán mật khẩu (mật khẩu được băm bởi Supabase, không ai xem được).
- Không xin GPS của người dùng, không đụng `Permissions-Policy` (`geolocation=()` giữ nguyên).
- Không thêm thư viện mới (user-agent, geo-IP, map...). Dùng `Intl`, header của Vercel, link bản đồ ngoài.
- Không để client (anon/authenticated) đọc `user_presence`, `admin_audit_log`, `admin_user_notes`.
- Không tạo nút sửa thú cưng: admin chỉ **xem** Bin.
- Không dùng `auth.sessions` trong migration (shim PGlite của repo không có bảng này, test sẽ hỏng).

---

## 1. Bản đồ repo (đã đọc, dùng để định hướng)

| Mục | File / nơi |
|---|---|
| Admin hiện có | `app/(app)/admin/page.tsx` (6 tab: Tổng quan, Người dùng, Từ vựng, Bộ từ công khai, Nhóm, Quản trị viên), `app/(app)/admin/users/[id]/page.tsx` (6 tab: Tổng quan, Từ vựng, Bộ từ, Ôn tập, Gia sư, Tài khoản), `app/(app)/admin/decks/[id]/page.tsx` |
| Đọc dữ liệu admin | `lib/data/admin.ts` (service role; `allAuthUsers()` chưa export) |
| Hành động admin | `lib/actions/admin.ts` (`guard()`, `ordinaryTarget()`, `fail/ok`) |
| Quyền admin | `lib/admin.ts` (`requireAdmin`, `isAdminUser`, `ADMIN_EMAILS`, bảng `app_admins`) |
| Component admin | `components/admin/{admin-actions,admin-chat-viewer,admin-word-table,warm-cache}.tsx` |
| Thú cưng Bin | Logic thuần: `lib/progress.ts` (`levelFromXp`, `OUTFITS`, `unlockedOutfits`, `outfitCondition`, `TRICKS`, `bonesAvailable`, `binMoodScore`, `binMoodFor`, `BIN_MOOD_LABEL`, `isNight`, `dailyQuests`, `claimedOn`). Dữ liệu: `daily_stats` (xp, correct, reviews, new_learned) + `user_settings.prefs` (`bin_outfit`, `bin_treats_fed`, `bin_last_fed`, `quests_total`, `quests_claimed`, `mascot`, `mascot_name`). Hình: `components/mascot/pup.tsx` (`<Pup mood outfit size animated>`), `components/mascot/outfits.tsx` (`OutfitIcon`, server-safe) |
| Prefs | `lib/validation.ts` (`readPrefs`) |
| Streak/ngày học | `lib/srs/streak.ts` (`studyDay`, `computeStreak`, `longestStreak`, `addDays`) |
| Đăng nhập | Chạy ở trình duyệt: `components/auth/login-form.tsx` gọi `supabase.auth.signInWithPassword`. Server **không** thấy lúc đăng nhập |
| Phiên/guard | `proxy.ts` → `lib/supabase/proxy.ts`; `lib/auth.ts` (`getUser`) |
| DB | `supabase/migrations/` (mới nhất `20261025000011_admins.sql`). Áp dụng: `pnpm db:push`. Sinh type: `pnpm db:types:local` (PGlite + `tests/db/supabase-shim.sql`) |
| Test | `tests/unit/*.test.ts(x)`, `tests/db/*.test.ts` (PGlite, `as(db,"service",…)`), `tests/e2e/*.spec.ts` (Playwright, helper `signUp`, `admin()`), `tests/e2e/admin.spec.ts` (phải vẫn xanh) |
| Layout app | `app/(app)/layout.tsx` (có `MeProvider`), `app/(study)/layout.tsx` (full-screen học, cũng có `MeProvider`) |
| Service worker | `public/sw.js` bỏ qua mọi request không phải GET, nên POST `/api/presence` không bị cache |

---

## 2. Quyết định thiết kế và giới hạn (nói thẳng với chủ app)

1. **Online** = có heartbeat gần đây. Trình duyệt gửi 1 lần/45 giây khi tab đang hiện. Trạng thái: `online` (≤ 2 phút), `away` "Vừa rời đi" (2–15 phút), `offline` (>15 phút), `never` (chưa có dữ liệu).
2. **Vị trí đăng nhập = ước tính theo IP, KHÔNG phải địa chỉ nhà.** Lấy từ header Vercel `x-vercel-ip-*` (thành phố, vùng, quốc gia, vĩ/kinh độ). Thường đúng tới cấp thành phố/quận; 4G/5G, VPN, cơ quan có thể lệch hàng chục km hoặc ra nơi khác. IP không cho ra số nhà/đường. GPS chính xác cần người dùng đồng ý trong trình duyệt và sửa giao diện người dùng, nên **ngoài phạm vi** plan này (xem mục 12).
3. Header geo **chỉ có khi chạy trên Vercel**. Chạy local (`pnpm dev`) không có thành phố; dùng script seed (Phase 12) hoặc E2E (gửi header giả) để xem giao diện.
4. **Đăng nhập** được phát hiện từ claim `session_id` trong JWT: mỗi `signInWithPassword` tạo session mới → khi heartbeat gặp `session_id` mới thì ghi 1 dòng `login_events`. Không cần sửa form đăng nhập. Phiên đã mở từ trước khi bật tính năng sẽ được ghi lần đầu khi người đó mở app lại (UI phải ghi chú điều này).
5. **Thú cưng** = Bin. Tính lại phía server bằng đúng hàm thuần trong `lib/progress.ts` từ `daily_stats` + `prefs` (admin không dùng `getProgress()` vì nó đọc theo user đang đăng nhập).
6. **Quyền riêng tư** (bắt buộc làm): chính sách hiện ghi "Không thu thập IP" → phải cập nhật (Phase 11). IP/vị trí chỉ admin xem, lưu tối đa 90 ngày và tối đa 200 dòng/người; người dùng tải được lịch sử đăng nhập của chính mình; admin xem dữ liệu nhạy cảm sẽ được ghi nhật ký. (Nghị định 13/2023 yêu cầu thông báo mục đích xử lý; đây không phải tư vấn pháp lý.)
7. Bảng mới đều **chỉ service role** (RLS bật, không policy cho client), trừ `login_events` có policy đọc dòng của chính mình.
8. Làm mới "thời gian thực" bằng `router.refresh()` mỗi 30 giây (component `AutoRefresh`), không dùng Supabase Realtime.

---

## 3. Danh sách tính năng

| # | Tính năng | Ưu tiên | Phase |
|---|---|---|---|
| A | Trạng thái online/vừa rời/offline + "lần cuối online" ở danh sách và chi tiết | P0 | 3–7 |
| B | Tab mới **Đang online** (ai đang ở trang nào, thiết bị, nơi) tự làm mới | P0 | 6 |
| C | Vị trí hiện tại + **lịch sử đăng nhập** (IP, thành phố, quốc gia, thiết bị, "nơi mới/thiết bị mới", link bản đồ) | P0 | 7 |
| D | Tab **Thú cưng** ở chi tiết người dùng (cấp, XP, trang phục đang mặc, tủ đồ + điều kiện mở khóa, xương, tâm trạng, nhiệm vụ, chiêu trò) và chip cấp/trang phục ở danh sách | P0 | 4, 7 |
| E | Danh sách người dùng: lọc theo trạng thái, sắp xếp (online lần cuối, cấp, ngày học) | P1 | 6 |
| F | Dashboard Tổng quan: đang online, DAU/WAU/MAU, biểu đồ 14 ngày, top thành phố, phân bố cấp, top XP | P1 | 8 |
| G | Tab **Cần chú ý**: nguy cơ bỏ học, đăng ký chưa học, đăng nhập nhiều quốc gia/24h, dùng AI sát hạn mức | P1 | 9 |
| H | **Nhật ký quản trị** (ai khóa/xóa/xem chat/xem lịch sử đăng nhập...) | P1 | 10 |
| I | **Ghi chú riêng** của admin cho từng người dùng | P2 | 10 |
| J | Cập nhật chính sách quyền riêng tư + xuất dữ liệu cá nhân gồm lịch sử đăng nhập | P0 | 11 |

---

## Phase 0 — Chuẩn bị

1. `git checkout -b admin-monitoring`.
2. `pnpm install`; có `.env.local` (copy từ `.env.example`, điền Supabase URL/anon/service key và `SUPABASE_DB_URL`).
3. Đọc `node_modules/next/dist/docs/` các mục: route handlers, `proxy`, `headers()`, `PageProps`.
4. Chạy baseline: `pnpm typecheck && pnpm test`. Ghi lại nếu có test đỏ sẵn (không phải do bạn).
5. Mở `app/(app)/admin/page.tsx` và `app/(app)/admin/users/[id]/page.tsx` để nắm phong cách (hàm `Stat`, `Figure`, `Section`, `dateTime`, `SegmentedNav`).

---

## Phase 1 — Migration DB

### 1.1 Tạo `supabase/migrations/20261028000012_presence.sql`
```sql
-- Presence and login history for /admin: who is online and where they signed in from.
-- Written only by the server (service role) after it verified the session.
-- Location is the hosting platform's IP geolocation (approximate, city level), never GPS.

create table public.user_presence (
  user_id uuid primary key references public.profiles on delete cascade,
  last_seen_at timestamptz not null default now(),
  session_id uuid,
  path text check (char_length(path) <= 200),
  ip text check (char_length(ip) <= 64),
  country text check (char_length(country) <= 8),
  region text check (char_length(region) <= 80),
  city text check (char_length(city) <= 120),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  timezone text check (char_length(timezone) <= 64),
  device_type text check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  browser text check (char_length(browser) <= 40),
  os text check (char_length(os) <= 40),
  user_agent text check (char_length(user_agent) <= 400)
);
create index on public.user_presence (last_seen_at desc);

create table public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  session_id uuid,
  ip text check (char_length(ip) <= 64),
  country text check (char_length(country) <= 8),
  region text check (char_length(region) <= 80),
  city text check (char_length(city) <= 120),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  timezone text check (char_length(timezone) <= 64),
  device_type text check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  browser text check (char_length(browser) <= 40),
  os text check (char_length(os) <= 40),
  user_agent text check (char_length(user_agent) <= 400),
  created_at timestamptz not null default now()
);
create unique index login_events_user_session on public.login_events (user_id, session_id) where session_id is not null;
create index on public.login_events (user_id, created_at desc);
create index on public.login_events (created_at desc);

alter table public.user_presence enable row level security;
alter table public.login_events enable row level security;
revoke all on public.user_presence from anon, authenticated;
revoke all on public.login_events from anon, authenticated;

-- A person may read (and so export) their own sign-in history; nobody else's.
grant select on public.login_events to authenticated;
create policy "login_events: owner read" on public.login_events
  for select to authenticated using (user_id = auth.uid());

-- One call per heartbeat: records a login when the session is new, then refreshes presence
-- (skipped when nothing changed in the last 20 seconds). Returns true when a login was recorded.
create or replace function public.record_presence(
  p_user_id uuid,
  p_path text default null,
  p_session_id uuid default null,
  p_ip text default null,
  p_country text default null,
  p_region text default null,
  p_city text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_timezone text default null,
  p_device_type text default null,
  p_browser text default null,
  p_os text default null,
  p_user_agent text default null
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  is_new_login boolean := false;
begin
  if p_session_id is not null then
    insert into public.login_events
      (user_id, session_id, ip, country, region, city, latitude, longitude, timezone, device_type, browser, os, user_agent)
    values
      (p_user_id, p_session_id, p_ip, p_country, p_region, p_city, p_latitude, p_longitude, p_timezone, p_device_type, p_browser, p_os, p_user_agent)
    on conflict (user_id, session_id) where session_id is not null do nothing;
    is_new_login := found;
    if is_new_login then
      -- retention: 90 days and at most 200 rows per person
      delete from public.login_events where user_id = p_user_id and created_at < now() - interval '90 days';
      delete from public.login_events where id in (
        select id from public.login_events where user_id = p_user_id order by created_at desc offset 200
      );
    end if;
  end if;

  insert into public.user_presence as up
    (user_id, last_seen_at, session_id, path, ip, country, region, city, latitude, longitude, timezone, device_type, browser, os, user_agent)
  values
    (p_user_id, now(), p_session_id, p_path, p_ip, p_country, p_region, p_city, p_latitude, p_longitude, p_timezone, p_device_type, p_browser, p_os, p_user_agent)
  on conflict (user_id) do update set
    last_seen_at = excluded.last_seen_at, session_id = excluded.session_id, path = excluded.path,
    ip = excluded.ip, country = excluded.country, region = excluded.region, city = excluded.city,
    latitude = excluded.latitude, longitude = excluded.longitude, timezone = excluded.timezone,
    device_type = excluded.device_type, browser = excluded.browser, os = excluded.os, user_agent = excluded.user_agent
  where up.last_seen_at < now() - interval '20 seconds'
     or up.session_id is distinct from excluded.session_id
     or up.path is distinct from excluded.path;

  return is_new_login;
end;
$$;

revoke execute on function public.record_presence(uuid, text, uuid, text, text, text, text, double precision, double precision, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_presence(uuid, text, uuid, text, text, text, text, double precision, double precision, text, text, text, text, text)
  to service_role;

-- Per-person totals for the admin list (level, last study day) without paging through daily_stats.
create or replace function public.admin_user_rollup()
returns table (user_id uuid, total_xp bigint, total_reviews bigint, total_correct bigint, active_days int, last_active_day date)
language sql stable security definer set search_path = ''
as $$
  select s.user_id,
         coalesce(sum(s.xp), 0)::bigint,
         coalesce(sum(s.reviews), 0)::bigint,
         coalesce(sum(s.correct), 0)::bigint,
         (count(*) filter (where s.reviews > 0))::int,
         max(s.day) filter (where s.reviews > 0)
  from public.daily_stats s
  group by s.user_id;
$$;
revoke execute on function public.admin_user_rollup() from public, anon, authenticated;
grant execute on function public.admin_user_rollup() to service_role;
```
Lưu ý: tham số có `default null` để file type sinh ra là `?:`. Khi gọi từ TS, **bỏ key** (hoặc truyền `value ?? undefined`), không truyền `null`.

### 1.2 Áp dụng và sinh type
```bash
pnpm db:types:local     # cập nhật lib/supabase/database.types.ts; kiểm tra có user_presence, login_events, record_presence, admin_user_rollup
pnpm db:push --dry-run  # xem trước; sau đó: pnpm db:push
```
Nếu `db:types:local` báo lỗi migration: sửa SQL, đừng sửa shim.

### 1.3 Test DB: `tests/db/presence.test.ts`
Theo mẫu `tests/db/push.test.ts` (`createDb`, `createUser`, `as(db, "service", …)`). Các ca:
1. `record_presence` với `p_session_id` mới → trả `true`, có 1 dòng `login_events`, 1 dòng `user_presence`.
2. Gọi lại cùng session → trả `false`, `login_events` vẫn 1 dòng.
3. Session khác → `true`, 2 dòng.
4. Gọi 2 lần liên tiếp cùng path trong <20s → `last_seen_at` không đổi (throttle); đổi `p_path` → được cập nhật.
5. `anon` và `authenticated` gọi `record_presence` hoặc `admin_user_rollup` → throw (không có quyền); `authenticated` `select` từ `user_presence` → throw.
6. RLS: alice `select` từ `login_events` chỉ thấy dòng của alice; bob thấy 0 dòng của alice; anon throw.
7. Retention: chèn tay 205 dòng cũ cho 1 user rồi gọi với session mới → còn ≤ 200 dòng.
8. `admin_user_rollup()` (role service) cộng đúng xp/reviews từ `daily_stats` chèn tay.
9. Xóa profile (xóa `auth.users`) → cascade xóa presence và login_events.

Commit: `feat(admin): presence + login_events tables and record_presence`.

---

## Phase 2 — Thư viện thuần (không I/O, dễ test)

### 2.1 `lib/presence.ts` (KHÔNG import `server-only`: dùng được cả client và test)
Nội dung bắt buộc:
```ts
export const HEARTBEAT_MS = 45_000;
export const ONLINE_WINDOW_MS = 2 * 60_000;
export const AWAY_WINDOW_MS = 15 * 60_000;

export type PresenceStatus = "online" | "away" | "offline" | "never";
export const STATUS_LABEL: Record<PresenceStatus, string> = {
  online: "Đang online", away: "Vừa rời đi", offline: "Offline", never: "Chưa ghi nhận",
};

/** lastSeenAt null/invalid → "never". diff <= 2 min → online, <= 15 min → away, else offline. Future dates count as online. */
export function presenceStatus(lastSeenAt: string | null | undefined, now = Date.now()): PresenceStatus;

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";
export const DEVICE_LABEL: Record<DeviceType, string> = {
  mobile: "Điện thoại", tablet: "Máy tính bảng", desktop: "Máy tính", unknown: "Không rõ thiết bị",
};
export function parseUserAgent(ua: string | null | undefined): { deviceType: DeviceType; browser: string; os: string };

export type RequestMeta = {
  ip: string | null; country: string | null; region: string | null; city: string | null;
  latitude: number | null; longitude: number | null; timezone: string | null;
};
/** Reads x-forwarded-for (first item) or x-real-ip, and Vercel's x-vercel-ip-* headers. City is percent-encoded by Vercel: decodeURIComponent inside try/catch. Lat/lng must be finite and in range, else null. Strip a leading "::ffff:" from IPv4-mapped IPv6. Empty string → null. */
export function readRequestMeta(h: { get(name: string): string | null }): RequestMeta;

export function isLocalIp(ip: string | null): boolean;          // null, "::1", "127.0.0.1", "local", 10.x, 192.168.x
export function countryName(code: string | null): string | null; // Intl.DisplayNames(["vi"], {type:"region"}), fallback to code
/** "Đà Nẵng, DN, Việt Nam" — non-empty parts joined by ", "; none → "Không rõ vị trí". */
export function placeLabel(p: { city: string | null; region: string | null; country: string | null }): string;
export function mapLinks(lat: number | null, lng: number | null): { google: string; osm: string } | null;
// google: https://www.google.com/maps/search/?api=1&query=LAT,LNG
// osm:    https://www.openstreetmap.org/?mlat=LAT&mlon=LNG#map=11/LAT/LNG

/** Friendly Vietnamese label for a page path; never returns the raw path. */
export function describePath(path: string | null): string;
```
`describePath` ánh xạ: `/review` → "Đang ôn tập"; `/practice/...` → "Đang luyện tập"; `/practice` → "Chọn chế độ luyện"; `/chat...` → "Đang hỏi gia sư"; `/decks/.../add` hoặc `/words/.../edit` → "Đang thêm/sửa từ"; `/decks...` → "Đang xem bộ từ"; `/words...` → "Đang xem từ vựng"; `/today` → "Trang Hôm nay"; `/stats` → "Đang xem thống kê"; `/explore` → "Đang khám phá"; `/groups...` → "Đang xem nhóm"; `/hard-words` → "Từ hay quên"; `/settings` → "Đang ở Cài đặt"; `/admin...` → "Đang ở trang quản trị"; còn lại → "Đang dùng ứng dụng"; null → "Không rõ".

Quy tắc `parseUserAgent` (kiểm tra theo thứ tự, không dùng thư viện):
- Browser: `Zalo` → "Zalo"; `FBAN|FBAV|FB_IAB` → "Facebook"; `Instagram` → "Instagram"; `coc_coc_browser` → "Cốc Cốc"; `Edg/|EdgA/|EdgiOS/` → "Edge"; `OPR/` → "Opera"; `SamsungBrowser` → "Samsung Internet"; `Firefox/|FxiOS/` → "Firefox"; `Chrome/|CriOS/` → "Chrome"; `Safari/` → "Safari"; còn lại "Không rõ".
- OS: `iPhone|iPad|iPod` → "iOS"; `Android` → "Android"; `Windows NT` → "Windows"; `Macintosh|Mac OS X` → "macOS"; `CrOS` → "ChromeOS"; `Linux` → "Linux"; còn lại "Không rõ". (Kiểm tra iOS TRƯỚC macOS vì UA iPhone chứa "Mac OS X".)
- Device: `iPad` hoặc (`Android` mà không có `Mobile`) → tablet; `iPhone|iPod|Android.*Mobile|Mobile` → mobile; có OS desktop → desktop; còn lại unknown. ua rỗng → `unknown`.

### 2.2 `lib/admin-pet.ts` (thuần, import từ `lib/progress.ts`, `lib/validation.ts`, `lib/srs/streak.ts`)
```ts
export type PetSummary = {
  name: string; mascotOn: boolean;
  level: LevelInfo; totalXp: number; totalCorrect: number;
  bones: number; treatsFed: number; fedToday: boolean; lastFed: string | null;
  outfit: OutfitId; outfitName: string; unlocked: OutfitId[];
  nextOutfit: { id: OutfitId; name: string; condition: string; remaining: string } | null;
  tricks: { id: TrickId; name: string; unlocked: boolean; level: number }[];
  questsClaimedTotal: number;
  mood: PupMood; moodLabel: string; moodScore: number;
  streak: number; longestStreak: number; reviewedToday: boolean;
  today: { day: string; reviews: number; correct: number; newLearned: number };
  quests: { id: QuestId; title: string; progress: number; target: number; done: boolean; claimed: boolean }[];
};
export function buildPetSummary(input: {
  rows: { day: string; reviews: number; correct: number; new_learned: number; xp: number }[];
  prefsRaw: unknown; timezone: string; now?: Date;
}): PetSummary;
```
Cách tính (giống `lib/data/progress.ts`, nhưng không có `dueLeft`):
- `today = studyDay(now, timezone)`; `active = rows.filter(r => r.reviews > 0).map(r => r.day)`; `streak = computeStreak(active, today).current`; `longest = Math.max(longestStreak(active), streak)`.
- `totalXp`, `totalCorrect` = tổng; `level = levelFromXp(totalXp)`; `prefs = readPrefs(prefsRaw)`.
- `unlocked = unlockedOutfits({ longestStreak: longest, level: level.level })`; `outfit = unlocked.includes(prefs.bin_outfit) ? prefs.bin_outfit : "none"`.
- `bones = bonesAvailable({ totalCorrect, questsClaimedTotal: prefs.quests_total, treatsFed: prefs.bin_treats_fed })`; `fedToday = prefs.bin_last_fed === today`.
- Quest: gọi `dailyQuests({ reviews, correct, new_learned, dueLeft: 0 })` rồi **chỉ giữ** `correct20` và `new5` (quest `due` cần số thẻ đến hạn, admin không có). `claimed` từ `claimedOn(prefs.quests_claimed, today)`.
- Mood: `score = binMoodScore({ reviewedToday, streak, fedToday, questsDone })` với `questsDone` = số quest `done` trong 2 quest giữ lại (ghi chú: ít hơn app thật tối đa 1 điểm); `night = isNight(giờ hiện tại theo timezone)`; `mood = binMoodFor(score, night)`; `moodLabel = BIN_MOOD_LABEL[mood] ?? "Ổn"`. Giờ theo timezone: `Number(new Intl.DateTimeFormat("en-GB",{hour:"2-digit",hourCycle:"h23",timeZone}).format(now))`.
- `nextOutfit`: trang phục khóa gần nhất; `condition = outfitCondition(o)`; `remaining` = "còn N cấp" (kind level: `unlock.value - level.level`) hoặc "còn N ngày chuỗi" (kind streak: `unlock.value - longest`).
- `name = prefs.mascot_name`, `mascotOn = prefs.mascot`.

### 2.3 Test: `tests/unit/presence.test.ts`, `tests/unit/admin-pet.test.ts`
- `presenceStatus`: 30s→online, 5 phút→away, 20 phút→offline, null→never, chuỗi rác→never.
- `parseUserAgent` với 6 UA thật: Chrome/Windows 10, Safari/iPhone, Chrome/Android mobile, Safari/iPad, Zalo in-app Android (`... Zalo ...`), Edge/macOS. Kiểm `{deviceType,browser,os}` đúng, và `null` → unknown.
- `readRequestMeta`: header `x-vercel-ip-city: %C4%90%C3%A0%20N%E1%BA%B5ng` → "Đà Nẵng"; `x-forwarded-for: "1.2.3.4, 5.6.7.8"` → "1.2.3.4"; `::ffff:1.2.3.4` → `1.2.3.4`; lat "abc" → null; lat "95" → null; city `%E0%A4%A` (hỏng) không throw.
- `placeLabel`, `mapLinks(null,null)` → null, `describePath` các nhánh, `isLocalIp`.
- `buildPetSummary`: 300 XP → level 4; prefs `bin_outfit:"crown"` nhưng chưa mở → `"none"`; level ≥5 + `"cap"` → `"cap"`; `totalCorrect 35 + quests_total 2 + bin_treats_fed 1` → bones 6; chuỗi dài nhất 7 → `glasses` mở; `nextOutfit` đúng.

Commit: `feat(admin): presence and pet helpers`.

---

## Phase 3 — Thu thập dữ liệu (heartbeat)

### 3.1 `app/api/presence/route.ts`
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseUserAgent, readRequestMeta } from "@/lib/presence";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({ path: z.string().max(200).startsWith("/") });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const lastBeat = new Map<string, number>(); // per server instance: drop bursts under 5s without touching the database

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  if (!userId) return new NextResponse(null, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const now = Date.now();
  if (now - (lastBeat.get(userId) ?? 0) < 5_000) return new NextResponse(null, { status: 204 });
  lastBeat.set(userId, now);
  if (lastBeat.size > 5_000) lastBeat.clear();

  const meta = readRequestMeta(request.headers);
  const device = parseUserAgent(request.headers.get("user-agent"));
  const rawSession = claims?.session_id;
  const { error } = await createAdminClient().rpc("record_presence", {
    p_user_id: userId,
    p_path: parsed.data.path.split("?")[0].split("#")[0],
    p_session_id: typeof rawSession === "string" && UUID.test(rawSession) ? rawSession : undefined,
    p_ip: meta.ip ?? undefined,
    p_country: meta.country ?? undefined,
    p_region: meta.region ?? undefined,
    p_city: meta.city ?? undefined,
    p_latitude: meta.latitude ?? undefined,
    p_longitude: meta.longitude ?? undefined,
    p_timezone: meta.timezone ?? undefined,
    p_device_type: device.deviceType,
    p_browser: device.browser,
    p_os: device.os,
    p_user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? undefined,
  });
  // Never break the app because of tracking (e.g. the account was just deleted: foreign key error).
  if (error) console.error("[presence]", error.message);
  return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
}
```
Quy tắc an ninh: userId lấy từ phiên, **không bao giờ** từ body; IP/vị trí chỉ từ header; body chỉ có `path`.
Việc cần kiểm trong dev: in thử `claims` một lần để chắc có `session_id` (nếu không có, ghi chú lại và dùng phương án dự phòng: coi là đăng nhập mới khi `last_seen_at` cũ hơn 30 phút; chỉ làm nếu thật sự thiếu claim).

### 3.2 `components/presence/presence-beacon.tsx`
```tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { HEARTBEAT_MS } from "@/lib/presence";

function beat(path: string) {
  if (document.visibilityState !== "visible" || !navigator.onLine) return;
  void fetch("/api/presence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path }),
    keepalive: true,
    cache: "no-store",
  }).catch(() => undefined);
}

/** Tells the server this person is here (every 45 s while the tab is visible). Renders nothing. */
export function PresenceBeacon() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
    beat(pathname);
  }, [pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => beat(pathRef.current), HEARTBEAT_MS);
    const onVisible = () => beat(pathRef.current);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
```
### 3.3 Gắn vào layout
Trong `app/(app)/layout.tsx` và `app/(study)/layout.tsx`, thêm `import { PresenceBeacon } from "@/components/presence/presence-beacon";` và đặt `<PresenceBeacon />` ngay bên trong `<MeProvider ...>` (trước nội dung). Không đổi gì khác.

### 3.4 Kiểm tra
- Đăng nhập demo, mở DevTools → Network: thấy `POST /api/presence` 204 mỗi ~45s, chuyển trang cũng gửi.
- Bảng `user_presence` có dòng của user; `login_events` có đúng 1 dòng cho phiên này (reload nhiều lần vẫn 1 dòng); đăng xuất rồi đăng nhập lại → thêm 1 dòng.
- Chưa đăng nhập: `curl -i -X POST localhost:3000/api/presence -H 'content-type: application/json' -d '{"path":"/x"}'` → 401.
- Ẩn tab >2 phút: không còn beat.
- Chạy `pnpm test:e2e -- admin.spec.ts` (hoặc suite đang dùng) để chắc không vỡ (có lỗi 5xx/pageerror sẽ làm `watchErrors` fail).

Commit: `feat: presence heartbeat and login recording`.

---

## Phase 4 — Lớp đọc dữ liệu cho admin

Tạo file mới `lib/data/admin-monitor.ts` (`import "server-only"`, dùng `createAdminClient()`; chỉ gọi sau `requireAdmin()`). Trước hết thêm `export` cho `allAuthUsers` trong `lib/data/admin.ts` (chỉ thêm từ khóa `export`).

Hàm cần có (kiểu trả về khai báo rõ, dùng type của `database.types.ts`):

1. `getPresenceMap(userIds?: string[]): Promise<Map<string, PresenceRow>>` — đọc `user_presence` (lọc `.in("user_id", ids)` nếu có).
2. `getRollupMap(): Promise<Map<string, Rollup>>` — gọi RPC `admin_user_rollup`.
3. `getOnlineNow(): Promise<{ online: OnlineRow[]; away: OnlineRow[] }>` — `user_presence` có `last_seen_at >= now-15 phút`, join tên từ `profiles` (`display_name, username, avatar_url`), phân loại bằng `presenceStatus`, sắp xếp mới nhất trước.
4. `getUserLoginHistory(userId, limit = 50): Promise<{ events: LoginEventRow[]; places: PlaceSummary[] }>`:
   - `events`: đọc `login_events` mới nhất trước, thêm cờ `newPlace` (khóa `country|region|city` chưa từng xuất hiện ở các dòng **cũ hơn**) và `newDevice` (khóa `device_type|browser|os` chưa từng thấy ở dòng cũ hơn). Dòng cũ nhất không gắn cờ.
   - `places`: gom theo `country|region|city` → `{ label, count, lastAt, latitude, longitude }`, sắp theo `count` giảm.
5. `getPetSummaryFor(userId)` và `getPetSummariesFor(userIds)`: đọc `daily_stats` (`day, reviews, correct, new_learned, xp`) và `user_settings` (`prefs, timezone`) rồi gọi `buildPetSummary` (Phase 2). Bản số nhiều dùng `.in("user_id", ids)` rồi group theo user (phân trang 1000 dòng nếu cần, mẫu `fetchAll` trong `lib/export.ts`).
6. `listUsersForAdmin({ q, page, status, sort })` — thay cho `listAdminUsers` ở tab Người dùng (giữ nguyên hàm cũ, không xóa):
   - Lấy `allAuthUsers()`, `profiles`, `decks` (đếm), `app_admins`, `getPresenceMap()`, `getRollupMap()`.
   - `status`: `all | online | away | offline | never | inactive7 | banned | admin | unstudied` (`inactive7` = `last_active_day` cách hôm nay ≥ 7 ngày hoặc null nhưng đã có tài khoản ≥ 7 ngày; `unstudied` = `active_days = 0`).
   - `sort`: `created` (mặc định, mới nhất) | `lastSeen` | `level` | `lastActive`. `level` tính từ `levelFromXp(total_xp)`. Người không có dữ liệu xếp cuối.
   - **Sau khi lọc/sắp xếp/cắt trang** (30 người/trang, `USERS_PER_PAGE`), mới gọi `getPetSummariesFor` cho đúng 30 người đó.
   - Mỗi dòng: tất cả trường của `AdminUser` cũ + `lastSeenAt`, `status`, `place` (chuỗi `placeLabel`), `deviceType`, `pet: { level, outfit, outfitName, streak } | null`.
7. `getActivitySummary()` cho Tổng quan: `onlineNow` (đếm `last_seen_at` ≤ 2 phút), `dau`, `wau`, `mau` (số user phân biệt có `daily_stats.reviews > 0` trong 1/7/30 ngày theo `studyDay`), `activeByDay` 14 ngày (`{day, active}`), `newByDay` 14 ngày (từ `createdAt` của auth users), `topCities` (top 5 từ `login_events` 30 ngày, đếm số user phân biệt theo thành phố/quốc gia), `levelBuckets` (`1-2`, `3-4`, `5-9`, `10+` từ rollup), `topXp` (5 người XP cao nhất kèm cấp).
8. `getAttention()` — dùng ở Phase 9.

Quy ước: ngày dùng `studyDay(new Date(), "Asia/Ho_Chi_Minh")`; khi một truy vấn lỗi thì `console.error` và trả mảng rỗng, không ném lỗi làm hỏng cả trang.

Test: `tests/unit/admin-monitor.test.ts` cho phần thuần tách ra được (hàm gắn cờ `newPlace/newDevice`, gom `places`, lọc/sắp xếp danh sách) — hãy tách các phần đó thành hàm thuần export riêng trong `lib/admin-monitor-utils.ts` (không `server-only`) để test được.

Commit: `feat(admin): monitoring data layer`.

---

## Phase 5 — Component dùng chung (`components/admin/`)

Tất cả là component server trừ khi ghi khác. Dùng token màu, không hex.

1. `online-dot.tsx` — `OnlineDot({ status, withLabel?, className })`: chấm tròn `size-2.5 rounded-full`: online `bg-success`, away `bg-c-sun`, offline `bg-border-strong`, never `bg-border`. **Không animation.** Kèm `<span className="sr-only">{STATUS_LABEL[status]}</span>` (hoặc nhãn hiện khi `withLabel`). Nhãn online dùng `text-success-fg`.
2. `place-line.tsx` — `PlaceLine({ city, region, country, ip, latitude, longitude, showMap })`: hiện `placeLabel(...)`; nếu `isLocalIp(ip)` hiện "Máy local (không có vị trí)"; IP hiện font mono nhỏ; nếu có tọa độ và `showMap`: 2 link "Google Maps" / "OpenStreetMap" (`target="_blank" rel="noopener noreferrer"`, `className` đạt cao ≥ 40px bằng `inline-flex min-h-10 items-center`). Dòng chú thích nhỏ: "Vị trí ước tính theo IP, thường chỉ đúng tới cấp thành phố."
3. `device-chip.tsx` — icon lucide (`Smartphone`, `Tablet`, `Monitor`, `CircleHelp`) + "Chrome · Windows".
4. `auto-refresh.tsx` — **client**: `AutoRefresh({ seconds = 30 })`, `setInterval` gọi `router.refresh()` chỉ khi `document.visibilityState === "visible"`; dọn interval khi unmount; hiện chữ nhỏ "Tự làm mới mỗi 30 giây" (`aria-live="off"`).
5. `pet-chip.tsx` — `PetChip({ level, outfit, outfitName, streak })`: `<OutfitIcon outfit size={20} />` (bỏ icon khi `outfit === "none"`), "Cấp N", `outfitName` (nếu khác "Không mặc"), "Chuỗi N ngày".
6. `pet-panel.tsx` — panel tab Thú cưng (Phase 7).
7. `login-history.tsx` — bảng lịch sử (Phase 7).
8. `stat-card.tsx` — chuyển `Stat` từ `app/(app)/admin/page.tsx` ra dùng chung (export, giữ nguyên giao diện) để Overview và các tab mới dùng lại.

Helper định dạng giờ cho admin: tạo `lib/admin-format.ts` với `dateTime(iso, withTime)` (copy hàm hiện có, múi `Asia/Ho_Chi_Minh`) và `ago(iso)` (bọc `formatAgo` từ `lib/format.ts`; null → "chưa có").

Commit: `feat(admin): shared monitoring components`.

---

## Phase 6 — Tab Người dùng nâng cấp + tab Đang online

File: `app/(app)/admin/page.tsx` (chỉ sửa `TABS`, `UsersTab`, và render thêm tab mới) + `components/admin/tabs/online-tab.tsx` (mới).

### 6.1 `TABS` (thứ tự)
`overview` Tổng quan · `online` Đang online · `users` Người dùng · `attention` Cần chú ý · `words` Từ vựng · `decks` Bộ từ công khai · `groups` Nhóm · `audit` Nhật ký · `admins` Quản trị viên.
Tab `attention` và `audit` chưa có ở phase này: tạm render `<p className="text-fg-muted">Sắp có.</p>`, sẽ thay ở Phase 9/10.

### 6.2 UsersTab
- Form tìm kiếm giữ nguyên (`name="q"`, nút "Tìm"), thêm 2 `<select>` (cùng kiểu class với select ở tab Từ vựng): "Trạng thái" (`name="status"`) và "Sắp xếp" (`name="sort"`). Nhãn tiếng Việt: Tất cả / Đang online / Vừa rời đi / Offline / Chưa ghi nhận / Không học 7 ngày+ / Chưa học bài nào / Bị khóa / Quản trị; Sắp xếp: Mới tạo / Online gần nhất / Cấp cao nhất / Học gần nhất. Link phân trang phải giữ `q`, `status`, `sort`.
- Dùng `listUsersForAdmin`. Mỗi `<li>`: thêm `<OnlineDot>` trước tên; dòng phụ: `Tạo … · Online {ago} · {place}`; thêm dòng `<PetChip>` nếu có `pet`.
- **Bắt buộc giữ nguyên** để `tests/e2e/admin.spec.ts` vẫn xanh: mỗi người là `<li>`; nút `AdminAction` "Khóa"/"Mở khóa"/"Xóa" và hộp thoại xác nhận như cũ; huy hiệu "Đã khóa" chỉ xuất hiện đúng 1 lần trong `<li>` khi bị khóa (đừng đưa chữ "Đã khóa" vào chip/nhãn khác trong `<li>`); dòng của chính admin không có nút nào.

### 6.3 Tab Đang online (`components/admin/tabs/online-tab.tsx`)
- `getOnlineNow()`; render `<AutoRefresh />`.
- Hai khối: "Đang online (n)" và "Vừa rời đi trong 15 phút qua (n)". Mỗi dòng: `UserAvatar` + tên (link `/admin/users/{id}`) + `@username`, `describePath(path)`, `PlaceLine` (không bản đồ), `DeviceChip`, `ago(last_seen_at)`. Người chính là admin đang xem: huy hiệu "Bạn".
- Rỗng: "Hiện không có ai online." Chú thích: "Cập nhật theo nhịp 45 giây của trình duyệt người dùng."

Kiểm tra: `pnpm dev`, chạy `node scripts/seed-presence.mjs` (Phase 12) hoặc tự chèn dòng để thấy giao diện; kiểm tra ở 390px và 1280px không cuộn ngang; chế độ tối đọc được.

Commit: `feat(admin): online tab and richer user list`.

---

## Phase 7 — Chi tiết người dùng (`app/(app)/admin/users/[id]/page.tsx`)

### 7.1 Header
Dưới dòng email, thêm: `<OnlineDot withLabel>` + "Online gần nhất {ago}" + `describePath` khi đang online; dòng "Vị trí gần nhất: {placeLabel}" (+ link bản đồ); `<PetChip>`. Lấy dữ liệu bằng `getPresenceMap([id])` và `getPetSummaryFor(id)` song song với `getAdminUserDetail`.

### 7.2 Tab mới
`TABS` thành: `overview` Tổng quan · `pet` Thú cưng · `login` Đăng nhập & vị trí · `words` · `decks` · `reviews` · `chat` · `account` (giữ nhãn cũ cho các tab cũ).

### 7.3 Tab Thú cưng (`components/admin/pet-panel.tsx`)
Bố cục 2 cột trên `lg`, 1 cột trên điện thoại, dùng `Section` có sẵn:
- **Hình Bin**: `<Pup mood={pet.mood} outfit={pet.outfit} size={140} animated={false} />` + tên Bin (`pet.name`) + huy hiệu "Linh vật đang bật/đã tắt".
- **Chỉ số** (`Figure`): Cấp (`level.level`), thanh XP (`xpInLevel/xpForNext`, dùng `div` thanh như thanh 30 ngày hiện có hoặc `components/ui/progress.tsx`), Tổng XP, Xương trong tay, Đã cho ăn (`treatsFed`) + "Hôm nay đã cho ăn: Có/Chưa", Tâm trạng (`moodLabel` + `moodScore/5`), Chuỗi hiện tại / dài nhất, Thưởng nhiệm vụ đã nhận (`questsClaimedTotal`).
- **Trang phục đang mặc**: tên (`outfitName`) in đậm; nếu "none" → "Không mặc".
- **Tủ đồ** (8 ô từ `OUTFITS`): mỗi ô `OutfitIcon`, tên, nhãn: "Đang mặc" (tone blue) / "Đã mở" (mint) / "Khóa · {outfitCondition}" (mặc định xám). Dòng cuối: "Trang phục tiếp theo: {name} ({remaining})".
- **Chiêu trò** (`TRICKS`): danh sách "Ngồi (cấp 1) – đã mở/chưa".
- **Nhiệm vụ hôm nay** (2 quest): tiêu đề, `progress/target`, nhãn "Đã nhận thưởng" khi `claimed`. Chú thích: "Nhiệm vụ 'Ôn hết từ đến hạn' cần dữ liệu thẻ đến hạn nên không hiển thị ở đây."
- Không có nút chỉnh sửa nào.

### 7.4 Tab Đăng nhập & vị trí (`components/admin/login-history.tsx`)
1. Khối "Hiện tại / gần nhất": trạng thái, `last_seen_at` (giờ đầy đủ), `PlaceLine` có bản đồ, IP, thiết bị/trình duyệt/hệ điều hành, múi giờ, tọa độ làm tròn 2 chữ số.
2. Khối "Lịch sử đăng nhập (tối đa 50 lần gần nhất)": bảng (bọc `overflow-x-auto`) cột Thời gian | Địa điểm | IP | Thiết bị | Ghi chú. Ghi chú: `Badge soft tone="orange"` "Nơi mới", `tone="grape"` "Thiết bị mới".
3. Khối "Các nơi đã đăng nhập": từ `places` → "Thành phố, Quốc gia · N lần · gần nhất {ago}".
4. Chú thích cuối: "Ghi nhận từ lúc bật tính năng. Phiên mở từ trước được ghi khi người dùng mở lại ứng dụng. Cột 'Đăng nhập gần nhất' ở tab Tài khoản là số liệu của Supabase."
5. Khi vào tab này, ghi nhật ký `view_login_history` (Phase 10).

### 7.5 Tab Tổng quan
Thêm 2 `Figure`: "Online gần nhất" (giá trị `ago`) và "Số nơi đăng nhập" (số `places`). Không sửa phần còn lại.

Kiểm tra E2E tay: người dùng chưa có presence → "Chưa ghi nhận", các khối rỗng có câu giải thích, không crash. UUID sai → 404 như cũ.

Commit: `feat(admin): pet and login tabs on user detail`.

---

## Phase 8 — Dashboard Tổng quan

Sửa `Overview()` trong `app/(app)/admin/page.tsx`: giữ nguyên lưới `Stat` và `WarmCacheCard` hiện có, **thêm phía trên**:
1. Hàng 4 `StatCard`: "Đang online" (tone mint, icon `Radio`), "Hoạt động hôm nay (DAU)", "7 ngày (WAU)", "30 ngày (MAU)". Hint cho DAU: "Người có ít nhất 1 lượt ôn".
2. Khối "Người học mỗi ngày (14 ngày)": cột div như biểu đồ 30 ngày ở trang người dùng (`bg-primary`, rỗng `bg-surface-3`), kèm số người đăng ký mới mỗi ngày (cột phụ `bg-c-mint`) và chú thích màu. Có `role="img"` + `aria-label` tóm tắt.
3. Khối "Nơi đăng nhập nhiều nhất (30 ngày)": top 5 thành phố/quốc gia + số người.
4. Khối "Cấp của Bin": 4 thanh ngang theo nhóm `1-2`, `3-4`, `5-9`, `10+` (số người).
5. Khối "Top XP": 5 người, link tới chi tiết, kèm `PetChip`.
6. `AutoRefresh seconds={60}`.

Dữ liệu từ `getActivitySummary()`. Test thuần cho phần đếm DAU/WAU/MAU và bucket cấp (trong `lib/admin-monitor-utils.ts`).

Commit: `feat(admin): overview dashboard`.

---

## Phase 9 — Tab "Cần chú ý"

Tạo `lib/admin-attention.ts` (thuần) + `components/admin/tabs/attention-tab.tsx`.

Hàm thuần `computeAttention(input)` trả về các nhóm, mỗi mục `{ userId, name, detail }`. Ngưỡng là hằng số export để dễ chỉnh:
| Nhóm | Điều kiện | Nhãn |
|---|---|---|
| `churn` | `active_days ≥ 7` và `last_active_day` cách hôm nay từ 3 đến 30 ngày | "Có nguy cơ bỏ học" |
| `stuck` | tài khoản tạo ≥ 2 ngày trước và `active_days = 0` | "Đăng ký nhưng chưa học" |
| `multiCountry` | ≥ 2 quốc gia khác nhau trong `login_events` 24 giờ qua | "Đăng nhập từ nhiều quốc gia" |
| `aiHeavy` | `ai_usage` hôm nay ≥ 80% `AI_DAILY_LIMIT_PER_USER` | "Dùng AI sát hạn mức" |

Mỗi nhóm là một `Section`: tiêu đề + số lượng + 1 câu giải thích; mỗi mục là link tới `/admin/users/{id}` (nhóm `multiCountry` link thẳng `?tab=login`). Nhóm rỗng: "Không có ai." Tab này không cần `AutoRefresh`.
Unit test: mỗi nhóm có ca đúng, ca sát ngưỡng, ca ngoài ngưỡng.

Commit: `feat(admin): attention tab`.

---

## Phase 10 — Nhật ký quản trị + ghi chú

### 10.1 Migration `supabase/migrations/20261028000013_admin_audit.sql`
```sql
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users on delete set null,
  admin_email text check (char_length(admin_email) <= 254),
  action text not null check (char_length(action) <= 60),
  target_user_id uuid, -- no foreign key: deleted accounts must stay in the log
  target_label text check (char_length(target_label) <= 200),
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.admin_audit_log (created_at desc);
create index on public.admin_audit_log (target_user_id, created_at desc);

create table public.admin_user_notes (
  user_id uuid primary key references public.profiles on delete cascade,
  note text not null check (char_length(note) <= 2000),
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
alter table public.admin_user_notes enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
revoke all on public.admin_user_notes from anon, authenticated;
```
Sau đó `pnpm db:types:local`, `pnpm db:push`. Thêm test DB: client `authenticated`/`anon` không đọc được hai bảng; xóa auth user giữ nguyên dòng log (`admin_id` thành null).

### 10.2 `lib/data/admin-audit.ts` (`server-only`)
- `logAdminAction({ admin: { id, email }, action, target?: { userId?, label? }, meta?, dedupeMinutes? })`: bọc `try/catch`, **không bao giờ ném lỗi**. Khi có `dedupeMinutes`, bỏ qua nếu đã có dòng cùng `admin_id + action + target_user_id` trong khoảng đó (dùng cho các hành động "xem").
- `listAuditLog({ action?, page })` 50 dòng/trang, mới nhất trước.
- `AUDIT_LABELS`: `ban` "Khóa tài khoản", `unban` "Mở khóa", `delete_user` "Xóa tài khoản", `grant_admin`, `revoke_admin`, `hide_deck` "Ẩn bộ từ", `delete_deck`, `delete_group`, `delete_word`, `view_login_history` "Xem lịch sử đăng nhập", `view_chat` "Xem trò chuyện gia sư", `export_user` "Xuất dữ liệu người dùng", `save_note` "Lưu ghi chú".

### 10.3 Gắn vào hành động (chỉ thêm 1 dòng sau khi thành công, không đổi logic)
- Trong `lib/actions/admin.ts`: `setUserBanned` (`ban`/`unban`), `deleteUserAccount` (lấy email trước khi xóa để làm `target_label`), `hidePublicDeck`, `deleteDeckAsAdmin`, `deleteGroupAsAdmin`, `grantAdmin`, `revokeAdmin`, `deleteWordAsAdmin`.
- `app/api/admin/users/[id]/export/route.ts`: `export_user`.
- Trang chi tiết người dùng: tab `login` → `view_login_history`; tab `chat` → `view_chat` (cả hai `dedupeMinutes: 10`).

### 10.4 Tab Nhật ký (`components/admin/tabs/audit-tab.tsx`)
Bảng: Thời gian | Quản trị viên | Hành động (nhãn tiếng Việt) | Đối tượng (link nếu tài khoản còn tồn tại, không thì `target_label`) | Chi tiết (`meta` rút gọn). Lọc theo hành động (select), phân trang. Không có nút xóa/sửa log.

### 10.5 Ghi chú riêng (P2)
- Action `saveUserNote({ userId, note })` trong `lib/actions/admin.ts`: `guard()`, zod (`uuid`, `note` ≤ 2000, cho phép rỗng = xóa dòng), upsert `admin_user_notes`, log `save_note`, `revalidatePath`.
- Form client `components/admin/user-note-form.tsx` (`Textarea` có sẵn trong `components/ui`, nút "Lưu ghi chú", toast qua `sonner`, mẫu theo `GrantAdminForm`), đặt trong tab Tổng quan của người dùng, `Section` "Ghi chú của quản trị viên" + dòng "Chỉ quản trị viên thấy, người dùng không thấy."

Test: unit cho `logAdminAction` dedupe (mock client) hoặc test DB; E2E ở Phase 12.

Commit: `feat(admin): audit log and user notes`.

---

## Phase 11 — Quyền riêng tư (bắt buộc)

### 11.1 `app/(public)/quyen-rieng-tu/page.tsx`
- Mục "1. Dữ liệu được lưu trữ", thêm gạch đầu dòng:
  `Hoạt động và vị trí đăng nhập: thời điểm bạn đang dùng ứng dụng, mục bạn đang xem, địa chỉ IP, vị trí ước tính theo IP (thành phố, quốc gia), loại thiết bị và trình duyệt. Lịch sử đăng nhập được giữ tối đa 90 ngày.`
- Mục "2. Cam kết bảo mật": **thay** gạch "Không thu thập IP…" bằng:
  `Vị trí chỉ là ước tính: Sổ Từ không xin quyền GPS của thiết bị. Vị trí chỉ suy ra từ địa chỉ IP, thường chỉ chính xác tới cấp thành phố, và chỉ quản trị viên xem được.`
  và thêm: `Quản trị viên xem dữ liệu nhạy cảm (lịch sử đăng nhập, trò chuyện gia sư) đều được ghi nhật ký.`
- Khung nhấn đầu trang: thêm cụm "vị trí và thiết bị đăng nhập" vào danh sách dữ liệu quản trị viên có thể xem. Không thêm emoji.
- Mục 3: nhắc file xuất dữ liệu gồm cả lịch sử đăng nhập.

### 11.2 `lib/export.ts` (`buildAccountExport`)
Thêm vào `Promise.all` thứ hai: `fetchAll<Tables<"login_events">>((f, t) => supabase.from("login_events").select("*").eq("user_id", userId).order("id").range(f, t))`, và trả `login_history: loginEvents` trong object kết quả. Thanh xuất của người dùng (RLS client) đọc được nhờ policy "owner read"; xuất của admin (service role) cũng chạy. Kiểm tra `tests/unit` và e2e không so sánh cứng danh sách khóa của file xuất (đã grep: không có).

### 11.3 Docs
Cập nhật `docs/DEPLOY.md` (mục mới "Giám sát người dùng"): geo chỉ có trên Vercel (`x-vercel-ip-*`), chạy `pnpm db:push` cho migration 12 và 13, chính sách quyền riêng tư đã khớp.

Commit: `feat(privacy): disclose presence and login tracking, include login history in export`.

---

## Phase 12 — Seed xem thử, E2E, hoàn thiện

### 12.1 `scripts/seed-presence.mjs` (+ `package.json`: `"admin:seed-presence": "node scripts/seed-presence.mjs"`)
Theo mẫu `scripts/admin.mjs` (đọc `.env.local`, service role). Với `demo@example.com`, `minh@example.com`, `lan@example.com` (tạo bởi `pnpm db:seed`):
- `demo`: `user_presence.last_seen_at = now()`, thành phố "Hồ Chí Minh", `VN`, path `/review`, Chrome/Windows, desktop.
- `minh`: cách 8 phút (away), "Hà Nội", Safari/iOS, mobile, path `/chat`.
- `lan`: cách 3 ngày (offline), "Đà Nẵng", Zalo/Android.
- Mỗi người thêm 3–5 dòng `login_events` với `session_id` ngẫu nhiên (`crypto.randomUUID()`), thành phố/thiết bị khác nhau (một dòng quốc gia khác như "SG" để thấy cờ "Nơi mới"), `created_at` rải trong 20 ngày. Xóa dòng cũ của 3 user này trước khi chèn (chạy lại an toàn).
- Cập nhật `user_settings.prefs` của `minh`: `{ "bin_outfit": "cap", "bin_treats_fed": 2, "bin_last_fed": "<hôm nay>" }` và chèn `daily_stats` đủ XP (≥500) để mở mũ lưỡi trai, để tab Thú cưng có dữ liệu thật.

### 12.2 `tests/e2e/admin-monitoring.spec.ts`
Mẫu theo `admin.spec.ts` (serial). Chuẩn bị: tài khoản A (`signUp` + chèn `app_admins`), tài khoản B ở context riêng:
```ts
const ctxB = await browser.newContext({
  locale: "vi-VN",
  extraHTTPHeaders: {
    "x-forwarded-for": "113.22.33.44",
    "x-vercel-ip-city": encodeURIComponent("Đà Nẵng"),
    "x-vercel-ip-country": "VN",
    "x-vercel-ip-country-region": "DN",
    "x-vercel-ip-latitude": "16.0678",
    "x-vercel-ip-longitude": "108.2208",
  },
});
```
Ca kiểm tra:
1. `POST /api/presence` không đăng nhập → 401 (`request.newContext()` không cookie).
2. Sau khi B đăng nhập: `expect.poll` đến khi `user_presence.city === "Đà Nẵng"`; `login_events` đúng 1 dòng; reload B vẫn 1 dòng.
3. Admin `/admin?tab=online`: thấy tên B, "Đà Nẵng"; `/admin?tab=users&q=<emailB>`: dòng B có chấm "Đang online" (sr-only) và nút "Khóa" vẫn dùng được.
4. `/admin/users/<B>?tab=login`: thấy "Đà Nẵng", "113.22.33.44", link Google Maps có `16.0678`.
5. Đặt `last_seen_at` cách 20 phút bằng service role → reload thấy "Offline".
6. Thú cưng: chèn `daily_stats` 300 XP + `prefs.bin_outfit = "bow"` → tab `pet` có "Cấp 4" và "Nơ hồng" (tên trong `OUTFITS`), nhãn "Đang mặc"; trang phục chưa mở có "Khóa".
7. Người không phải admin (B) vào `/admin?tab=online` và `/admin?tab=audit` → 404 (không thấy tiêu đề "Quản trị").
8. Nhật ký: sau khi A khóa/mở khóa B và mở tab `login`, `/admin?tab=audit` có "Khóa tài khoản" và "Xem lịch sử đăng nhập".
9. `watchErrors` không có `pageerror`/5xx.
Dọn: xóa user A, B trong `afterAll`.

### 12.3 Kiểm tra giao diện thủ công
Ở 390px và 1280px, sáng và tối: `/admin` (mọi tab), `/admin/users/<id>` (mọi tab). Không cuộn ngang, không chữ bị cắt, nút ≥ 40px, chấm online không nhấp nháy. Mọi cặp chữ/nền mới nên tái dùng cặp đã có (`text-success-fg` trên `bg-success-soft`...); nếu tạo cặp mới thì thêm vào `scripts/contrast.mjs` rồi chạy `node scripts/contrast.mjs`.

### 12.4 Cập nhật `CLAUDE.md`
Thêm mục "Admin V3 — giám sát người dùng" (cuối phần Admin) ghi: bảng `user_presence`, `login_events`, `admin_audit_log`, `admin_user_notes`; hàm `record_presence`, `admin_user_rollup`; `/api/presence` + `PresenceBeacon` (45s, ẩn tab thì dừng); ngưỡng online 2/15 phút; geo từ header Vercel; `lib/presence.ts`, `lib/admin-pet.ts`, `lib/data/admin-monitor.ts`, `lib/data/admin-audit.ts`; retention 90 ngày/200 dòng; quy tắc "chấm online không animation"; chính sách quyền riêng tư đã đổi; cách xem thử (`pnpm admin:seed-presence`, header giả trong E2E).

Commit: `test(admin): monitoring e2e, seed script, docs`.

---

## Phase 13 — Nghiệm thu cuối

Chạy lần lượt và tất cả phải xanh: `pnpm exec eslint app components lib tests scripts` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` (ít nhất `admin.spec.ts`, `admin-monitoring.spec.ts`, `layout.spec.ts`, `core-flow.spec.ts`, `auth.spec.ts`) · `pnpm build`.

Checklist:
- [ ] Admin thấy ai online/vừa rời/offline, ở danh sách, tab Đang online và chi tiết.
- [ ] Mỗi người có vị trí gần nhất + lịch sử đăng nhập (IP, thành phố, quốc gia, thiết bị, nơi/thiết bị mới) + link bản đồ + chú thích "ước tính theo IP".
- [ ] Tab Thú cưng đúng cấp, XP, trang phục đang mặc, tủ đồ + điều kiện mở, xương, tâm trạng, nhiệm vụ.
- [ ] Dashboard (DAU/WAU/MAU, online, top thành phố, phân bố cấp), tab Cần chú ý, Nhật ký, Ghi chú hoạt động.
- [ ] Người không phải admin: mọi trang/route admin trả 404; `/api/presence` không đăng nhập trả 401.
- [ ] Client (anon/authenticated) không đọc được `user_presence`, `admin_audit_log`, `admin_user_notes`; chỉ đọc được `login_events` của chính mình.
- [ ] Chính sách quyền riêng tư đã sửa; file xuất dữ liệu có `login_history`.
- [ ] Không thêm dependency; không sửa ngoài danh sách cho phép ở mục 0.1.
- [ ] `admin.spec.ts` cũ vẫn xanh.

---

## 14. Rủi ro và cách xử lý

| Vấn đề | Cách xử lý |
|---|---|
| Header thành phố của Vercel bị percent-encode (`%C4%90...`) | `decodeURIComponent` trong try/catch (đã nằm trong `readRequestMeta`) |
| `x-vercel-ip-country-region` là mã (ví dụ `SG`), không phải tên tỉnh | Hiển thị nguyên mã; ưu tiên hiện thành phố + quốc gia |
| Local dev không có header geo | UI hiện "Máy local (không có vị trí)"; dùng seed hoặc E2E để xem |
| Tự host (không qua Vercel): header có thể bị giả | Chỉ ảnh hưởng chính dòng của người gửi; ghi chú trong DEPLOY.md |
| VPN, 4G, mạng công ty làm sai vị trí | Chú thích cố định trong UI; không dùng để kết luận gian lận, chỉ làm tín hiệu |
| Một người dùng 2 thiết bị | `user_presence` chỉ giữ thiết bị gần nhất; lịch sử đăng nhập vẫn có đủ từng phiên |
| Tài khoản vừa bị xóa nhưng JWT còn hạn → lỗi khóa ngoại | Route nuốt lỗi, trả 204 |
| Tài khoản bị khóa vẫn gửi beat đến khi JWT hết hạn (~1 giờ) | Hành vi đã biết của app (xem CLAUDE.md), không xử lý thêm |
| `getClaims()` không có `session_id` | Kiểm ở Phase 3; nếu thiếu dùng phương án dự phòng khoảng cách 30 phút |
| Test `layout.spec` cảm giác chậm vì nhiều beat | Throttle 5s trong route + 20s trong SQL đã xử lý |

---

## 15. Ý tưởng để sau (chưa làm trong plan này)
- GPS chính xác theo kiểu người dùng tự bật (cần màn đồng ý, sửa Settings và `Permissions-Policy`).
- Buộc đăng xuất mọi thiết bị của một người (cần quyền ghi `auth.sessions`, shim test chưa hỗ trợ).
- Xuất CSV danh sách người dùng; cảnh báo qua email/push khi có tín hiệu "Cần chú ý".
- Gửi thông báo/ghim thông báo cho nhóm người dùng.
