# Kế hoạch: Bin 3.0 — Sổ xương, Phòng & Shop, Bin đi dạo, Bin trò chuyện, Khăn giữ chuỗi, Bạn nhỏ Miu/Panda

> File này là bản hướng dẫn **làm từng bước** cho agent code. Đặt ở `docs/PLAN-bin-3.md`.
> Làm **đúng thứ tự** các bước (1.1 → 1.2 → … → 3.6). Mỗi bước có: mục tiêu, file cần tạo/sửa, nội dung cụ thể, test, và **tiêu chí xong**. Chỉ sang bước sau khi tiêu chí xong của bước trước đã đạt.

---

## 0. Đọc trước khi làm (bắt buộc)

### 0.1 Tài liệu phải đọc
1. `CLAUDE.md` (toàn bộ, đặc biệt các mục "Design do/don't", "Bin 2.0", "Redesign V3"). Mọi quy tắc trong đó vẫn áp dụng.
2. `AGENTS.md`: Next.js trong repo là **bản 16.4 có thay đổi API**. Trước khi viết route handler, server action, `after()`, cache… hãy mở tài liệu tương ứng trong `node_modules/next/dist/docs/`. Không đoán API theo trí nhớ.
3. Code hiện có của Bin (đọc hết trước khi sửa):
   - `components/mascot/pup.tsx` (SVG Bin, props `mood`, `action`, `outfit`, `size`, `className`)
   - `components/mascot/bin-home.tsx` ("Góc của Bin": `Room`, `TILES`, cho ăn, ném bóng, trò, trang phục)
   - `components/mascot/bin-home-provider.tsx`, `use-bin.ts`, `outfits.tsx`, `mascot-say.tsx`, `pettable-pup.tsx`
   - `lib/mascot/lines.ts` (`LINES`, `say`, `seedOf`, `BIN_ACTIONS`, `answerMood`)
   - `lib/progress.ts` (cấp, xương, nhiệm vụ, trang phục, tâm trạng)
   - `lib/data/progress.ts` (`getProgress`), `lib/data/study.ts` (`getStudySummary`)
   - `lib/actions/bin.ts` (`loadBinHome`, `feedBin`, `setBinOutfit`, `claimQuest`, `loadSessionRewards`)
   - `lib/srs/streak.ts` (`computeStreak`, ngày nghỉ miễn phí mỗi tuần)
   - `components/review/session-bar.tsx`, `components/review/use-session-hud.ts`, `components/review/session-gifts.tsx`
   - `lib/ai/enrich.ts` (`callModel`, `checkQuota`, `recordUsage`, `AiError`)
   - `lib/supabase/admin.ts` (`createAdminClient`), `lib/supabase/server.ts` (`createClient`)
   - `lib/validation.ts` (`prefsSchema`, `DEFAULT_PREFS`, `readPrefs`)
   - `lib/admin-pet.ts`, `components/admin/pet-panel.tsx`
   - `tests/db/harness.ts` (test DB bằng PGlite), `tests/e2e/bin-home.spec.ts`, `tests/e2e/helpers.ts`

### 0.2 Quy ước bắt buộc (lấy từ `CLAUDE.md`, nhắc lại để không sai)
- **UI tiếng Việt; code, tên biến, comment, tên file: tiếng Anh.**
- Không dùng **hex thô** trong component. Màu chỉ lấy từ token CSS (`var(--c-sun)`, `bg-scene-floor`, `TONE_CLASSES[...]`…). Token mới thì thêm vào `app/globals.css` cho **cả sáng và tối** (xem khối `--scene-*` ở khoảng dòng 150 và dòng 276).
- Không emoji trong giao diện, kể cả trong câu Bin nói.
- Icon: `lucide-react`, stroke 2, đặt trong ô màu (`IconTile`) như các chỗ khác.
- Nút cao ≥ 44px (`min-h-11`), nút chỉ có icon phải có `aria-label`.
- Tôn trọng `prefers-reduced-motion` (dùng `useReducedMotion` của `motion/react` như `session-gifts.tsx`).
- **Không có animation lặp vô hạn** ngoài Bin (và Bạn nhỏ ở Giai đoạn 3, sẽ ghi ngoại lệ vào `CLAUDE.md`).
- Logic thuần (không React, không Supabase) để trong `lib/bin/*.ts`, nhận `rng`/`now`/`today` làm tham số để unit test được.
- Server action trả `ActionResult` qua `ok()` / `fail()` trong `lib/actions/result.ts`.
- Mọi thao tác **cộng/trừ xương** chỉ chạy trong Postgres qua RPC `security definer`, chỉ `service_role` gọi được. Server action kiểm tra người dùng bằng `requireUser()` rồi gọi RPC bằng `createAdminClient()`. Client **không bao giờ** tự ghi bảng `bin_*`.
- Giữ nguyên tên hiển thị của Bin: luôn dùng `prefs.mascot_name` (người dùng đổi được), không viết cứng "Bin" trong câu thoại; trong `LINES` dùng `{name}`.
- Khi pref `mascot` = tắt: không hiện Bin, không hiện nút đi dạo/shop/bạn nhỏ ở Today; các trang khác ẩn phần Bin như hiện nay.

### 0.3 Lệnh kiểm tra sau **mỗi bước**
```bash
pnpm lint
pnpm typecheck
pnpm test            # vitest: tests/unit + tests/db
```
Sau các bước có UI, thêm:
```bash
pnpm test:e2e -- tests/e2e/<file-của-bước>.spec.ts
node scripts/screenshot.mjs   # chụp 390px và 1280px, sáng và tối; xem lại ảnh
```
Sau bước có migration: `pnpm db:types:local` để sinh lại `lib/supabase/database.types.ts` (nếu không chạy được Supabase local, sửa tay file types: thêm đúng các bảng/hàm mới theo đúng format đang có trong file).

### 0.4 Commit
- Mỗi bước một commit, message tiếng Anh dạng `feat(bin): …`, `test(bin): …`, `chore(db): …`.
- Không commit `.env*`, không sửa file không liên quan, không format lại cả repo.

### 0.5 Những điều KHÔNG làm trong toàn bộ plan này
- Không cho Bin chết, bỏ đi, hay trừ xương/đồ khi người dùng bỏ học.
- Không bán gì bằng tiền thật.
- Không vẽ lại Bin theo giai đoạn tiến hóa.
- Không gọi AI cho từng câu trả lời trong phiên học.
- Không đổi luật XP, luật nhiệm vụ ngày, luật ngày nghỉ miễn phí hiện có.
- Không xóa key cũ trong `prefsSchema` (`bin_treats_fed`, `bin_last_fed`, `quests_total`, `quests_claimed`): chỉ ngừng dùng cho xương (xem 1.1).

---

## Tổng quan 3 giai đoạn

| Giai đoạn | Bước | Nội dung | Migration |
|---|---|---|---|
| **1** | 1.1 | ✅ Sổ xương (`bin_ledger`) + RPC, chuyển dữ liệu cũ | `20261030000014_bin_economy.sql` |
| | 1.2 | ✅ Danh mục đồ + bảng đồ sở hữu/phòng | (cùng file 000014) |
| | 1.3 | ✅ Phòng của Bin hiển thị đồ (`BinRoom`) | — |
| | 1.4 | ✅ Shop & trang trí trong Góc của Bin | — |
| | 1.5 | ✅ Bin đi dạo: dữ liệu + logic | (cùng file 000014) |
| | 1.6 | ✅ Bin đi dạo: truyện AI + mẫu dự phòng | — |
| | 1.7 | ✅ Bin đi dạo: giao diện (Góc của Bin, Today, bưu thiếp) | — |
| | 1.8 | ✅ Admin, seed demo, `CLAUDE.md` | — |
| **2** | 2.1 | Bin nói trong phiên học (combo, gỡ lại, nhớ ra từ) | — |
| | 2.2 | Lời chào AI mỗi ngày trên Today | `20261030000015_bin_companion.sql` |
| | 2.3 | Khăn giữ chuỗi: logic chuỗi | (cùng file 000015) |
| | 2.4 | Khăn giữ chuỗi: shop + giao diện | — |
| | 2.5 | Admin, `CLAUDE.md` | — |
| **3** | 3.1 | Dữ liệu bạn nhỏ + điều kiện nhận trứng | `20261030000016_bin_buddies.sql` |
| | 3.2 | Vẽ bạn nhỏ (`Buddy`) và trứng (`Egg`) | — |
| | 3.3 | Ấp trứng & nở | — |
| | 3.4 | Bạn nhỏ đi theo Bin (phòng, Today, màn kết thúc) | — |
| | 3.5 | Quà trứng ở màn kết thúc phiên | — |
| | 3.6 | Admin, seed, `CLAUDE.md` | — |

Đơn vị tiền tệ duy nhất là **xương**. Nguồn xương (sau Giai đoạn 1):
- 1 xương / 10 câu đúng (như cũ, tính từ `daily_stats.correct`).
- 2 xương / nhiệm vụ ngày nhận thưởng (như cũ, nay ghi vào sổ).
- 3–6 xương / chuyến đi dạo (mới).

Chỗ tiêu: cho ăn (1), đồ phòng (6–40), khăn giữ chuỗi (20).

---

# GIAI ĐOẠN 1 — Sổ xương, Phòng & Shop, Bin đi dạo

## Bước 1.1 — Sổ xương (`bin_ledger`) và RPC ✅

### Vì sao
Hiện số xương = `floor(tổng câu đúng / 10) + 2 × quests_total − bin_treats_fed`, trong đó `quests_total` và `bin_treats_fed` nằm trong `user_settings.prefs` (JSON). Người dùng có quyền `update` cột `prefs` (xem `20261016000003_rls.sql`), nên có thể tự sửa số xương; và đọc-sửa-ghi JSON ở hai tab cùng lúc có thể mất một lần ghi. Muốn có shop thì xương phải nằm trong một sổ ghi chép an toàn.

### 1.1.a Migration `supabase/migrations/20261030000014_bin_economy.sql` (phần 1: sổ xương)

```sql
-- Bin 3.0 (docs/PLAN-bin-3.md): the bone ledger, owned items, the room and trips.
-- Bones in hand = floor(sum(daily_stats.correct) / 10) + sum(bin_ledger.amount).
-- Every write goes through the service-role functions below, called by server actions after requireUser().

create table public.bin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('migrate', 'quest', 'feed', 'buy', 'trip')),
  amount int not null check (amount between -1000 and 1000),
  ref text check (char_length(ref) <= 80),
  study_day date not null,
  created_at timestamptz not null default now()
);
create index on public.bin_ledger (user_id, created_at desc);
create index on public.bin_ledger (user_id, kind, study_day);
-- One row per quest reward, per trip, per migration: a retried call cannot pay twice.
create unique index bin_ledger_once on public.bin_ledger (user_id, kind, ref)
  where kind in ('migrate', 'quest', 'trip');

alter table public.bin_ledger enable row level security;
create policy "bin_ledger: own read" on public.bin_ledger
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.bin_ledger from authenticated, anon;

-- Serializes bone writes of one user: lock their profile row for the transaction.
create or replace function public.bin_lock(p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.profiles where id = p_user for update;
end;
$$;

create or replace function public.bin_balance(p_user uuid)
returns int
language sql stable security definer set search_path = ''
as $$
  select (coalesce((select sum(correct) from public.daily_stats where user_id = p_user), 0) / 10)::int
       + coalesce((select sum(amount) from public.bin_ledger where user_id = p_user), 0)::int;
$$;

-- What getProgress needs in one call, for the signed-in user (RLS client).
create or replace function public.bin_wallet()
returns table (balance int, fed_today boolean)
language sql stable security definer set search_path = ''
as $$
  select public.bin_balance(auth.uid()),
         exists (select 1 from public.bin_ledger l
                 where l.user_id = auth.uid() and l.kind = 'feed'
                   and l.study_day = public.study_day(auth.uid()));
$$;

-- Adds bones (quest reward, trip). Returns the new balance; a repeated (kind, ref) adds nothing.
create or replace function public.bin_grant(p_user uuid, p_kind text, p_amount int, p_ref text)
returns int
language plpgsql security definer set search_path = ''
as $$
begin
  if p_amount <= 0 then raise exception 'bad_amount'; end if;
  perform public.bin_lock(p_user);
  insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
  values (p_user, p_kind, p_amount, p_ref, public.study_day(p_user))
  on conflict do nothing;
  return public.bin_balance(p_user);
end;
$$;

-- Takes bones (feed). Raises 'not_enough_bones' when the balance is short.
create or replace function public.bin_spend(p_user uuid, p_kind text, p_amount int, p_ref text)
returns int
language plpgsql security definer set search_path = ''
as $$
begin
  if p_amount <= 0 then raise exception 'bad_amount'; end if;
  perform public.bin_lock(p_user);
  if public.bin_balance(p_user) < p_amount then raise exception 'not_enough_bones'; end if;
  insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
  values (p_user, p_kind, -p_amount, p_ref, public.study_day(p_user));
  return public.bin_balance(p_user);
end;
$$;

-- Moves the bones kept in prefs into the ledger once: +2 per quest reward taken, -1 per bone fed.
insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
select s.user_id, 'migrate',
       2 * coalesce((s.prefs ->> 'quests_total')::int, 0) - coalesce((s.prefs ->> 'bin_treats_fed')::int, 0),
       'prefs-v1',
       public.study_day(s.user_id)
from public.user_settings s
where coalesce((s.prefs ->> 'quests_total')::int, 0) > 0
   or coalesce((s.prefs ->> 'bin_treats_fed')::int, 0) > 0
on conflict do nothing;

-- "Fed today" now comes from the ledger: keep today's feeding.
insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
select s.user_id, 'feed', 0, 'prefs-v1-last-fed', (s.prefs ->> 'bin_last_fed')::date
from public.user_settings s
where (s.prefs ->> 'bin_last_fed') ~ '^\d{4}-\d{2}-\d{2}$'
  and (s.prefs ->> 'bin_last_fed')::date = public.study_day(s.user_id);

revoke execute on function public.bin_lock(uuid), public.bin_balance(uuid),
  public.bin_grant(uuid, text, int, text), public.bin_spend(uuid, text, int, text)
  from public, anon, authenticated;
grant execute on function public.bin_lock(uuid), public.bin_balance(uuid),
  public.bin_grant(uuid, text, int, text), public.bin_spend(uuid, text, int, text)
  to service_role;
revoke execute on function public.bin_wallet() from public, anon;
grant execute on function public.bin_wallet() to authenticated;
```

Lưu ý:
- Dòng `feed` với `amount = 0` chỉ để giữ trạng thái "đã cho ăn hôm nay"; `check (amount between -1000 and 1000)` cho phép 0.
- Phần `bin_items`, `bin_room`, `bin_trips` sẽ thêm **vào cuối cùng file này** ở bước 1.2 và 1.5 (chưa deploy nên được sửa file).

### 1.1.b Test DB `tests/db/bin.test.ts` (tạo mới)
Theo mẫu `tests/db/push.test.ts`. Các ca:
1. User mới, chưa có gì → `bin_balance` = 0.
2. Thêm `daily_stats` correct = 57 (dùng `as(db, "service", …)`) → balance = 5.
3. `bin_grant(u, 'quest', 2, '2026-10-30:due')` hai lần → balance tăng **2** (không phải 4).
4. `bin_spend(u, 'feed', 1, null)` khi balance = 0 → lỗi chứa `not_enough_bones`.
5. `bin_spend` khi đủ → balance giảm đúng.
6. Gọi `bin_grant`/`bin_spend` với role `authenticated` → bị từ chối (permission denied).
7. User đọc `bin_ledger` của người khác → 0 dòng (RLS).
8. Migration chuyển prefs: tạo user, set `prefs = {"quests_total": 3, "bin_treats_fed": 2}` **trước khi** chạy file migration là khó với harness; thay vào đó viết test gọi lại đúng câu `insert … select` (copy vào test như một hàm SQL tạm) hoặc kiểm tra bằng cách: tạo DB, chèn user + prefs, rồi `db.exec` lại đoạn `insert into public.bin_ledger … 'prefs-v1' …` và kiểm tra balance = 3·2 − 2 = 4; chạy lần hai vẫn = 4.
9. `bin_wallet()` với role authenticated trả `fed_today = true` sau khi có dòng `feed` hôm nay.

### 1.1.c Sửa `lib/progress.ts`
- Đổi `bonesAvailable`:
  ```ts
  /** Bones in hand: one per 10 right answers plus everything in the ledger (quests, trips, feeding, buying). */
  export function bonesAvailable(input: { totalCorrect: number; ledgerSum: number }): number {
    return Math.max(0, Math.floor(Math.max(0, input.totalCorrect) / 10) + input.ledgerSum);
  }
  ```
- Cập nhật mọi chỗ gọi (`grep -rn bonesAvailable`), kể cả `lib/admin-pet.ts` và test `tests/unit/progress.test.ts`, `tests/unit/admin-pet.test.ts`.

### 1.1.d Sửa `lib/data/progress.ts` (`getProgress`)
- Gọi thêm `supabase.rpc("bin_wallet")` song song với truy vấn `daily_stats` (`Promise.all`).
- `bones` = `wallet.balance` (đã gồm phần câu đúng). Không tự tính lại trong TS nữa, để khớp tuyệt đối với SQL. Giữ `bonesAvailable` cho admin-pet và test.
- `fedToday` = `wallet.fed_today` (không đọc `prefs.bin_last_fed` nữa).
- Nếu RPC lỗi: log `console.error("[bin] wallet", …)`, trả `bones: 0`, `fedToday: false` (không làm sập trang Today).

### 1.1.e Sửa `lib/actions/bin.ts`
- `feedBin`:
  ```ts
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("bin_spend", { p_user: user.id, p_kind: "feed", p_amount: 1, p_ref: null });
  if (error) return fail(error.message.includes("not_enough_bones") ? "Chưa có xương để cho ăn." : "Không lưu được. Thử lại.");
  return ok({ bones: data });
  ```
  Bỏ ghi `bin_treats_fed`/`bin_last_fed` vào prefs.
- `claimQuest`: giữ nguyên phần kiểm tra (`quest.done`, `quest.claimed`) và vẫn ghi `quests_claimed` vào prefs (để biết "đã nhận hôm nay"), **nhưng** xương thì cộng qua:
  ```ts
  await admin.rpc("bin_grant", { p_user: user.id, p_kind: "quest", p_amount: QUEST_BONES, p_ref: `${progress.today}:${id}` });
  ```
  Thứ tự: gọi `bin_grant` trước, thành công mới ghi prefs. `quests_total` vẫn tăng (admin còn hiển thị), nhưng không còn dùng để tính xương.
- Thêm comment ở `prefsSchema` (`lib/validation.ts`): `bin_treats_fed`, `bin_last_fed`: `@deprecated since Bin 3.0, bones live in bin_ledger`.

### 1.1.f Unit test
- `tests/unit/progress.test.ts`: sửa ca của `bonesAvailable` theo chữ ký mới; thêm ca `ledgerSum` âm lớn hơn phần câu đúng → 0.

### Tiêu chí xong 1.1
- `pnpm test` xanh, có `tests/db/bin.test.ts` ≥ 9 ca.
- `tests/e2e/bin-home.spec.ts` (đã có) vẫn xanh: cho ăn trừ 1 xương và giữ sau khi tải lại.
- Grep không còn chỗ nào **ghi** `bin_treats_fed`/`bin_last_fed`.

---

## Bước 1.2 — Danh mục đồ, đồ sở hữu, phòng ✅

### 1.2.a Thêm vào cuối `20261030000014_bin_economy.sql`

```sql
-- Items a user owns (room items now; the streak scarf and eggs later). qty > 1 only for consumables.
create table public.bin_items (
  user_id uuid not null references public.profiles on delete cascade,
  item_id text not null check (char_length(item_id) <= 40),
  qty int not null default 1 check (qty >= 0 and qty <= 99),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- What stands in each spot of the room.
create table public.bin_room (
  user_id uuid not null references public.profiles on delete cascade,
  slot text not null check (slot in ('bowl', 'bed', 'wall', 'toy', 'rug', 'corner')),
  item_id text not null check (char_length(item_id) <= 40),
  primary key (user_id, slot)
);

alter table public.bin_items enable row level security;
alter table public.bin_room enable row level security;
create policy "bin_items: own read" on public.bin_items for select to authenticated using (user_id = auth.uid());
create policy "bin_room: own read" on public.bin_room for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.bin_items, public.bin_room from authenticated, anon;

-- Buys one item: takes the price and adds it to bin_items in one transaction.
-- p_max_qty: 1 for room items (raises 'already_owned'), 2 for the streak scarf, etc.
create or replace function public.bin_buy(p_user uuid, p_item text, p_price int, p_max_qty int)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  have int;
begin
  if p_price < 0 or p_max_qty < 1 then raise exception 'bad_amount'; end if;
  perform public.bin_lock(p_user);
  select qty into have from public.bin_items where user_id = p_user and item_id = p_item;
  if coalesce(have, 0) >= p_max_qty then raise exception 'already_owned'; end if;
  if p_price > 0 then
    if public.bin_balance(p_user) < p_price then raise exception 'not_enough_bones'; end if;
    insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
    values (p_user, 'buy', -p_price, p_item, public.study_day(p_user));
  end if;
  insert into public.bin_items (user_id, item_id, qty) values (p_user, p_item, 1)
  on conflict (user_id, item_id) do update set qty = public.bin_items.qty + 1;
  return public.bin_balance(p_user);
end;
$$;

revoke execute on function public.bin_buy(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.bin_buy(uuid, text, int, int) to service_role;
```

> Nếu sau này cần thêm một `kind` mới cho `bin_ledger` (plan này không cần), làm trong migration mới bằng `alter table … drop constraint bin_ledger_kind_check; alter table … add constraint bin_ledger_kind_check check (kind in (…));`. Không sửa migration đã deploy.

Đặt đồ vào phòng (`bin_room`) không tốn xương nên làm thẳng bằng admin client trong server action sau khi kiểm tra sở hữu (không cần RPC).

### 1.2.b Danh mục `lib/bin/catalog.ts` (tạo mới, thuần dữ liệu)

```ts
import type { LangCode } from "@/lib/lang/types";

export type RoomSlot = "bowl" | "bed" | "wall" | "toy" | "rug" | "corner";
export const ROOM_SLOTS: readonly RoomSlot[] = ["bowl", "bed", "wall", "toy", "rug", "corner"];
export const SLOT_LABEL: Record<RoomSlot, string> = {
  bowl: "Bát ăn", bed: "Nệm", wall: "Tranh", toy: "Đồ chơi", rug: "Thảm", corner: "Góc phòng",
};

export type ItemSource =
  | { kind: "default" }                                  // always owned, free
  | { kind: "shop"; price: number; level?: number; streak?: number } // level/streak = unlock condition (as OUTFITS)
  | { kind: "trip" };                                    // only found on a trip

export type RoomItem = {
  id: string;            // stable, ≤ 40 chars, never renamed once shipped
  slot: RoomSlot;
  name: string;          // Vietnamese
  source: ItemSource;
  lang?: LangCode;       // trip items tied to a language: only dropped on trips of that language
};
```

**Danh sách đồ bản đầu (24 món) — dùng đúng id, tên, giá này:**

| id | slot | Tên | Nguồn |
|---|---|---|---|
| `bowl_basic` | bowl | Bát đỏ | default |
| `bowl_blue` | bowl | Bát xanh | shop 8 |
| `bowl_bamboo` | bowl | Bát tre | shop 15 |
| `bowl_gold` | bowl | Bát vàng | shop 40, level 8 |
| `bed_none` | bed | (Không có nệm) | default |
| `bed_cushion` | bed | Đệm tròn | shop 12 |
| `bed_basket` | bed | Giỏ mây | shop 20 |
| `bed_cloud` | bed | Nệm mây | shop 35, level 6 |
| `bed_royal` | bed | Nệm hoàng gia | trip |
| `wall_none` | wall | (Tường trống) | default |
| `wall_sun` | wall | Tranh mặt trời | shop 10 |
| `wall_bone` | wall | Tranh khúc xương | shop 10 |
| `wall_hanzi` | wall | Thư pháp chữ 学 | shop 18 |
| `wall_map` | wall | Bản đồ thế giới | trip |
| `toy_none` | toy | (Không có) | default |
| `toy_yarn` | toy | Cuộn len | shop 6 |
| `toy_duck` | toy | Vịt cao su | shop 10 |
| `toy_frisbee` | toy | Đĩa bay | shop 14 |
| `toy_kite` | toy | Diều rồng | trip, lang zh |
| `rug_basic` | rug | Thảm xanh | default |
| `rug_stripes` | rug | Thảm sọc | shop 12 |
| `rug_paw` | rug | Thảm dấu chân | shop 18 |
| `rug_rainbow` | rug | Thảm cầu vồng | shop 30, streak 14 |
| `corner_none` | corner | (Trống) | default |
| `corner_cactus` | corner | Xương rồng | shop 8 |
| `corner_monstera` | corner | Cây trầu bà | shop 15 |
| `corner_lantern` | corner | Đèn lồng đỏ | trip, lang zh |
| `corner_bus` | corner | Xe buýt đỏ mini | trip, lang en |

(28 dòng gồm 6 món `*_none`/`basic` mặc định.)

Hàm trong cùng file (thuần, có test):
```ts
export const ITEMS: readonly RoomItem[] = [/* bảng trên */];
export const ITEM_BY_ID: ReadonlyMap<string, RoomItem>;
export const DEFAULT_ROOM: Record<RoomSlot, string> = {
  bowl: "bowl_basic", bed: "bed_none", wall: "wall_none", toy: "toy_none", rug: "rug_basic", corner: "corner_none",
};
export function isRoomItemId(id: string): boolean;
/** Owned = defaults + rows of bin_items. */
export function ownedItems(rows: { item_id: string }[]): Set<string>;
/** Why a shop item can't be bought yet, or null. Same wording style as outfitCondition: "Cấp 8", "Chuỗi 14 ngày". */
export function lockReason(item: RoomItem, input: { level: number; longestStreak: number }): string | null;
/** The room as stored, with defaults for empty slots and unknown/unowned ids dropped. */
export function resolveRoom(rows: { slot: string; item_id: string }[], owned: Set<string>): Record<RoomSlot, string>;
/** Trip-only items for a language that the user does not own yet. */
export function tripItemsFor(lang: LangCode, owned: Set<string>): RoomItem[];
```

### 1.2.c Server actions trong `lib/actions/bin.ts`
```ts
export type RoomData = {
  bones: number;
  room: Record<RoomSlot, string>;
  owned: string[];
  level: number;
  longestStreak: number;
};
export async function loadRoom(): Promise<ActionResult<RoomData>>;
export async function buyItem(input: unknown): Promise<ActionResult<{ bones: number; itemId: string }>>;
export async function placeItem(input: unknown): Promise<ActionResult<{ slot: RoomSlot; itemId: string }>>;
```
- `buyItem`: zod `z.string().refine(isRoomItemId)`; item phải có `source.kind === "shop"`; `lockReason` phải là `null` (lấy `level`, `longestStreak` từ `getProgress`); gọi `bin_buy(p_user, p_item, p_price, 1)`. Lỗi `not_enough_bones` → "Chưa đủ xương."; `already_owned` → "Bạn đã có món này."; khác → "Không lưu được. Thử lại."
- `placeItem`: input `{ slot, itemId }`; item phải thuộc đúng `slot` và nằm trong `ownedItems`; upsert `bin_room` bằng admin client (`onConflict: "user_id,slot"`). Đặt món `*_none` thì xóa dòng của slot đó.
- Cả hai gọi `revalidatePath("/", "layout")` chỉ khi cần cập nhật Today (phòng không hiện ở Today ⇒ **không** cần revalidate).
- `loadBinHome` trả thêm `room` (để Góc của Bin vẽ phòng ngay khi mở).

### 1.2.d Test
- `tests/unit/bin-catalog.test.ts`: id duy nhất, ≤ 40 ký tự; mỗi slot có đúng 1 món `default`; mọi món shop có giá 1–100; `resolveRoom` bỏ id lạ/không sở hữu; `lockReason` đúng chữ; `tripItemsFor('zh', …)` không chứa món `lang: 'en'`.
- `tests/db/bin.test.ts`: thêm ca `bin_buy` (đủ xương → có item, trừ đúng; mua lại → `already_owned`; thiếu xương → `not_enough_bones`, không có dòng `bin_items` nào được tạo).

### Tiêu chí xong 1.2
Test xanh; types DB có `bin_items`, `bin_room`, `bin_buy`.

---

## Bước 1.3 — Phòng của Bin hiển thị đồ (`BinRoom`) ✅

### 1.3.a Token màu mới trong `app/globals.css`
Thêm cạnh khối `--scene-*` (cả sáng ~dòng 150 và tối ~dòng 276), và khai báo `--color-scene-*` ở khối `@theme` (~dòng 327) theo đúng mẫu đang có:
```
--scene-wood: (sáng) màu gỗ nhạt, (tối) gỗ trầm
--scene-wood-dark:
--scene-cushion: dựa trên --c-pink-soft
--scene-plant: dựa trên --c-mint
--scene-plant-dark: dựa trên --c-mint-fg
--scene-gold: dựa trên --c-sun
```
Ưu tiên `color-mix(in oklab, var(--c-…) …)` từ bảng màu có sẵn thay vì hex mới. Chạy `node scripts/contrast.mjs` sau khi thêm.

### 1.3.b `components/mascot/room-items.tsx` (tạo mới)
Theo cách `outfits.tsx` vẽ trang phục:
- Mỗi món là một component SVG nhỏ, **nét `var(--pup-ink)` dày 3, đầu tròn** (giống nét Bin), fill bằng token. Không dùng hex.
- Xuất:
  ```ts
  export function RoomItemArt({ id, className }: { id: string; className?: string }): JSX.Element | null; // to vẽ trong phòng
  export function RoomItemIcon({ id, size = 40 }: { id: string; size?: number }): JSX.Element;            // ô vuông trong shop
  ```
- `viewBox` cố định theo slot (để vị trí trong phòng không lệch):
  | slot | viewBox | Gợi ý hình |
  |---|---|---|
  | bowl | `0 0 60 26` | bát cong; `bowl_basic` vẽ y như bát hiện tại (đỏ, viền đậm) |
  | bed | `0 0 130 44` | đệm bầu dục / giỏ có quai / mây phồng / nệm có viền vàng |
  | wall | `0 0 70 56` | khung gỗ + hình bên trong (mặt trời, khúc xương, chữ 学 bằng `<text>` font hệ thống, bản đồ chấm) |
  | toy | `0 0 40 30` | cuộn len, vịt, đĩa bay, diều |
  | rug | `0 0 200 46` | bầu dục; `rug_basic` = thảm hiện tại |
  | corner | `0 0 44 80` | chậu cây, đèn lồng treo, xe buýt |
- `*_none` trả `null`.

### 1.3.c `components/mascot/bin-room.tsx` (tạo mới) — tách từ `Room` trong `bin-home.tsx`
```ts
export function BinRoom({ night, name, room, preview, away }: {
  night: boolean;
  name: string;
  room: Record<RoomSlot, string>;
  /** A shop item shown in its spot before buying (not saved). */
  preview?: { slot: RoomSlot; itemId: string } | null;
  /** Bin is on a trip: the bed shows a note instead of Bin (see 1.7). */
  away?: { placeName: string; backAt: string } | null;
}): JSX.Element
```
- Giữ y nguyên cửa sổ, bảng tên, sàn hiện tại.
- Vị trí các slot (container `relative h-[270px] lg:h-[360px]`, đơn vị như `Room` hiện tại):
  - `wall`: `absolute top-[34px] left-1/2 -translate-x-1/2 w-[70px]` (giữa cửa sổ và bảng tên).
  - `rug`: thay thẻ `div` thảm hiện tại bằng `RoomItemArt` đặt cùng chỗ (`right-[18%] bottom-[22px] left-[18%] h-[46px]`).
  - `bed`: `absolute bottom-[18px] left-1/2 -translate-x-1/2 w-[150px] lg:w-[190px]` (dưới chân Bin, Bin đứng lên trên).
  - `bowl`: thay `div` bát hiện tại, cùng chỗ (`right-[26px] bottom-[26px] w-[54px]`).
  - `toy`: `absolute bottom-[22px] left-[22px] w-[40px]`.
  - `corner`: `absolute bottom-[70px] right-[6px] w-[44px] lg:bottom-[86px]` (đứng ở chân tường bên phải).
- Thứ tự lớp (z): rug < bed < bowl/toy/corner < Bin < nút xương kéo thả.
- Khi có `preview`, slot đó vẽ `preview.itemId` kèm viền đứt `outline-dashed outline-2 outline-primary rounded-md` để người dùng biết là đang xem thử.
- `aria-hidden` toàn bộ phần trang trí (như hiện tại).

### 1.3.d Sửa `bin-home.tsx`
- Xóa `Room`, dùng `BinRoom` với `room` từ `loadBinHome` (khi đang tải: `DEFAULT_ROOM`).
- Không đổi gì khác ở bước này.

### Tiêu chí xong 1.3
- Mở Góc của Bin, phòng trông **giống hệt trước** với tài khoản chưa mua gì (so ảnh chụp trước/sau 390px và 1280px, sáng/tối).
- `/dev-ui/bin` (lab hiện có, `components/mascot/bin-lab.tsx`): thêm một khối "Phòng" hiển thị lần lượt tất cả món của từng slot (dropdown chọn món cho mỗi slot) để kiểm tra mắt.

---

## Bước 1.4 — Shop & trang trí trong Góc của Bin ✅

### 1.4.a Bố cục ô chức năng
`TILES` trong `bin-home.tsx` giữ lưới **4 cột** như hiện tại (`grid-cols-4`), thành **2 hàng**. Thứ tự cuối cùng sau cả 3 giai đoạn:
| # | id | label | tone | icon (lucide) | Thêm ở bước |
|---|---|---|---|---|---|
| 1 | feed | Cho ăn | sun | `Bone` | có sẵn |
| 2 | play | Ném bóng | mint | `Volleyball` | có sẵn |
| 3 | tricks | Làm trò | blue | `Star` | có sẵn |
| 4 | outfits | Trang phục | pink | `Shirt` | có sẵn |
| 5 | decor | Trang trí | orange | `Sofa` | 1.4 |
| 6 | trip | Đi dạo | grape | `Footprints` | 1.7 |
| 7 | postcards | Bưu thiếp | teal | `Mail` | 1.7 (là `Link` tới `/bin/postcards`, không phải panel) |
| 8 | buddies | Bạn nhỏ | coral | `PawPrint` | 3.3 |

(Tất cả tone trên đều có trong `TONE_CLASSES` của `lib/tone.ts`.) Ở bước 1.4 chỉ thêm ô 5; các ô khác thêm đúng bước ghi trong bảng. Ô 7 render bằng `next/link` với cùng class như các ô khác.

Thêm state `panel: "main" | "decor" | "trip" | "buddies"` vào `BinHome` (mặc định `"main"`; reset về `"main"` khi đóng dialog). Khi `panel !== "main"`, cột phải hiện khu tương ứng thay cho lưới ô + trò + trang phục, đầu khu có nút "Quay lại" (`ChevronLeft`, `aria-label="Quay lại"`, `min-h-11`). `BinHomeProvider` thêm `open(panel?: Panel)` để chỗ khác mở thẳng một khu.

### 1.4.b Khu trang trí (`components/mascot/bin-decor.tsx`, tạo mới)
Bấm "Trang trí" → `panel = "decor"` (xem 1.4.a).

Cấu trúc:
1. Hàng chip chọn slot: 6 chip (`SLOT_LABEL`), chip đang chọn `bg-primary-soft text-primary-fg`.
2. Lưới món của slot đó (`grid grid-cols-3 sm:grid-cols-4 gap-2`), mỗi ô `size-[84px]` gồm `RoomItemIcon` + một dòng chữ nhỏ trạng thái:
   - Đang đặt: viền `border-primary`, chữ "Đang dùng".
   - Đã có: chữ "Đã có".
   - Shop chưa mua: hiện giá với icon `Bone` nhỏ, ví dụ "12".
   - Bị khóa: icon `Lock` + `lockReason` ("Cấp 8").
   - Món chỉ có từ chuyến đi mà chưa có: hình bóng mờ (`opacity-40 grayscale`), chữ "Đi dạo".
3. Chạm một ô → **xem thử**: `BinRoom` nhận `preview`, Bin làm `sniff` rồi `nod`. Không lưu.
4. Thanh hành động dưới lưới (luôn hiện khi có ô đang chọn):
   - Món đã có, chưa đặt: nút chính "Đặt vào phòng" → `placeItem` → Bin `spin`, câu `decorPlaced`, `playSfx("pop")`.
   - Món shop chưa có, đủ điều kiện: nút chính "Mua · 12 xương". Bấm lần 1 đổi thành "Chắc chắn mua?" (2 giây, sau đó tự trở lại). Bấm lần 2 → `buyItem`, thành công thì **tự đặt luôn** (`placeItem`), số xương ở header cập nhật, `Confetti` nhỏ (component có sẵn `components/fx/confetti`), Bin `dance`, câu `decorBought`.
   - Không đủ xương: nút disabled với chữ "Còn thiếu 5 xương" + link nhỏ "Đi học" như khi `noBone`.
   - Bị khóa: chữ giải thích, không có nút.
5. Cập nhật lạc quan (optimistic) như `choose()` hiện có: lỗi thì hoàn tác + `toast.error`.

### 1.4.c Câu thoại mới trong `lib/mascot/lines.ts`
```ts
decorPreview: ["Để {name} ngửi thử…", "Trông cũng hợp đó."],
decorPlaced: ["Đẹp hơn rồi!", "{name} thích chỗ này lắm."],
decorBought: ["Đồ mới! Cảm ơn bạn!", "{name} vui quá, có đồ mới rồi."],
decorShort: ["Thiếu chút xương nữa. Ôn thêm vài câu nhé.", "Gom thêm xương rồi quay lại mua nha."],
```
(Không emoji; giữ giọng ngắn như các câu hiện có.)

### 1.4.d E2E `tests/e2e/bin-decor.spec.ts` (tạo mới, theo mẫu `bin-home.spec.ts`)
- Tạo user, chèn `daily_stats` correct = 200 (20 xương).
- Mở Góc của Bin → Trang trí → chip "Nệm" → chọn "Đệm tròn" → thấy "Mua · 12 xương" → bấm 2 lần → header hiện "8 xương", ô hiện "Đang dùng".
- Tải lại trang, mở lại → vẫn "Đang dùng".
- Chọn "Nệm mây" (cấp 6) → thấy "Cấp 6", không có nút mua.
- Chọn "Bát vàng" khi đủ cấp nhưng thiếu xương (set `daily_stats.xp` để lên cấp 8 nhưng correct thấp) → "Còn thiếu … xương".
- Không có lỗi console (`watchErrors`).

### Tiêu chí xong 1.4
E2E xanh; ảnh 390px: lưới không tràn ngang, nút ≥ 44px; bàn phím: Tab đi qua chip → ô → nút mua.

---

## Bước 1.5 — Bin đi dạo: dữ liệu và logic ✅

### 1.5.a Luật (chốt)
- **Điều kiện đi**: trong ngày học hiện tại đã **xong ≥ 2/3 nhiệm vụ** (`quests.filter(q => q.done).length >= 2`) **hoặc** `reviewsToday >= 20`.
- Mỗi **ngày học** (đổi ngày lúc 04:00 theo `lib/srs/streak.ts`) tối đa **1 chuyến**.
- Thời gian đi: `TRIP_MINUTES = 180`. Nếu giờ về (theo múi giờ của user) rơi vào **22:00–06:59** thì dời về **07:00** sáng hôm sau; nội dung câu báo "Bin ngủ lại ở {place}, sáng mai về".
- Chuyến chưa đón vẫn chờ đến khi đón (không hết hạn). Chuyến hôm qua chưa đón **không** chặn chuyến hôm nay: hôm nay vẫn đi được sau khi đón chuyến cũ (UI buộc đón trước, xem 1.7).
- **Ngôn ngữ của chuyến** = ngôn ngữ của từ được chọn; không có từ thì lấy `study_langs[0]` trong `user_settings`. Chọn từ:
  1. Từ có thẻ `state in ('learning','relearning')` hoặc `lapses >= 2`, trong các bộ người dùng đang học (`study_deck_ids`), ưu tiên lỗi nhiều, rồi lần ôn gần nhất.
  2. Không có → từ `review` bất kỳ đã ôn trong 14 ngày.
  3. Vẫn không có → không chọn từ (`word_id = null`), truyện dùng mẫu không có từ.
  Lấy tối đa 30 ứng viên rồi chọn ngẫu nhiên có seed.
- **Địa điểm** (`lib/bin/places.ts`): 12 cho `en`, 12 cho `zh`. Ưu tiên địa điểm **chưa có trong album**; hết thì chọn bất kỳ.
  - en: London, Oxford, Edinburgh, Dublin, New York, San Francisco, Toronto, Sydney, Melbourne, Auckland, Cape Town, Singapore.
  - zh: Bắc Kinh, Thượng Hải, Tây An, Hàng Châu, Tô Châu, Thành Đô, Quế Lâm, Lệ Giang, Cáp Nhĩ Tân, Quảng Châu, Hồng Kông, Đài Bắc.
  - Mỗi địa điểm: `{ id: "london", lang: "en", name: "London", landmark: "Tháp đồng hồ Big Ben", tone: Tone }` (tone để tô bưu thiếp).
- **Phần thưởng**: xương = `3 + floor(rng() * 4)` (3–6). Với xác suất **25%**, thêm 1 món `tripItemsFor(lang, owned)` ngẫu nhiên (nếu còn món chưa có). Chuyến **thứ 3** của người dùng luôn có đồ (nếu còn) để người mới sớm thấy đồ hiếm.
- Toàn bộ lựa chọn tính ở server, **tại lúc bắt đầu chuyến**, seed = `seedOf(userId + studyDay)` (hàm `seedOf` trong `lines.ts`). Người dùng không "quay lại" kết quả được.

### 1.5.b Thêm vào cuối `20261030000014_bin_economy.sql`
```sql
create table public.bin_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  study_day date not null,
  lang public.lang_code not null,
  place_id text not null check (char_length(place_id) <= 40),
  word_id uuid references public.words on delete set null,
  word_term text check (char_length(word_term) <= 200),    -- kept so the postcard survives a deleted word
  story jsonb,                                             -- see BinStory in lib/bin/trip.ts; null until written
  bones int not null check (bones between 0 and 20),
  item_id text check (char_length(item_id) <= 40),
  started_at timestamptz not null default now(),
  returns_at timestamptz not null,
  collected_at timestamptz,
  notified_at timestamptz,
  unique (user_id, study_day)
);
create index on public.bin_trips (user_id, started_at desc);
create index bin_trips_due on public.bin_trips (returns_at) where collected_at is null and notified_at is null;

alter table public.bin_trips enable row level security;
create policy "bin_trips: own read" on public.bin_trips for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.bin_trips from authenticated, anon;

-- Collects a trip that is back: marks it, pays the bones and adds the item, all at once.
create or replace function public.bin_collect_trip(p_user uuid, p_trip uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  t public.bin_trips;
begin
  perform public.bin_lock(p_user);
  select * into t from public.bin_trips where id = p_trip and user_id = p_user for update;
  if not found then raise exception 'no_trip'; end if;
  if t.collected_at is not null then raise exception 'already_collected'; end if;
  if t.returns_at > now() then raise exception 'not_back'; end if;
  update public.bin_trips set collected_at = now() where id = p_trip;
  if t.bones > 0 then
    insert into public.bin_ledger (user_id, kind, amount, ref, study_day)
    values (p_user, 'trip', t.bones, p_trip::text, public.study_day(p_user))
    on conflict do nothing;
  end if;
  if t.item_id is not null then
    insert into public.bin_items (user_id, item_id, qty) values (p_user, t.item_id, 1)
    on conflict (user_id, item_id) do nothing;
  end if;
  return public.bin_balance(p_user);
end;
$$;
revoke execute on function public.bin_collect_trip(uuid, uuid) from public, anon, authenticated;
grant execute on function public.bin_collect_trip(uuid, uuid) to service_role;
```

### 1.5.c `lib/bin/places.ts` (tạo mới)
Dữ liệu ở 1.5.a + `placesFor(lang)`, `placeById(id)`, `pickPlace(lang, visited: Set<string>, rng)`.

### 1.5.d `lib/bin/trip.ts` (tạo mới, thuần)
```ts
export const TRIP_MINUTES = 180;
export const TRIP_MIN_REVIEWS = 20;
export const TRIP_MIN_QUESTS = 2;
export const TRIP_ITEM_CHANCE = 0.25;

export type BinStory = {
  lines: { target: string; vi: string }[];  // 2-3 lines; target = English or Chinese sentence
  pinyin?: string[];                        // zh only, same length as lines
  source: "ai" | "template";
};

export type TripStatus =
  | { kind: "locked"; needReviews: number; needQuests: number }  // not allowed yet today
  | { kind: "ready" }                                            // can start now
  | { kind: "away"; tripId: string; placeId: string; returnsAt: string }
  | { kind: "back"; tripId: string; placeId: string }            // waiting to be collected
  | { kind: "done" };                                            // today's trip collected

export function canStartTrip(i: { reviewsToday: number; questsDone: number }): boolean;
export function tripReturnTime(start: Date, timeZone: string, minutes = TRIP_MINUTES): Date; // night rule 22:00-06:59 → 07:00
export function isOvernight(start: Date, timeZone: string): boolean;
export function tripStatus(i: {
  today: string; reviewsToday: number; questsDone: number; now: Date;
  latest: { id: string; study_day: string; place_id: string; returns_at: string; collected_at: string | null } | null;
}): TripStatus;
export function pickWord<T extends { id: string; lapses: number; state: string; last_review: string | null }>(
  candidates: T[], rng: () => number): T | null;
export function tripReward(i: { lang: LangCode; owned: Set<string>; tripNumber: number; rng: () => number }):
  { bones: number; itemId: string | null };
export function templateStory(i: { lang: LangCode; placeName: string; landmark: string; term: string | null; meaningVi: string | null; name: string; seed: number }): BinStory;
/** Seeded generator (mulberry32) so a seed gives the same picks on every call. */
export function rngFrom(seed: number): () => number;
```
Ưu tiên của `tripStatus` (đúng thứ tự):
1. `latest` chưa đón và `returns_at > now` → `away`.
2. `latest` chưa đón và đã về → `back` (kể cả chuyến của ngày trước).
3. `latest.study_day === today` (đã đón) → `done`.
4. Đủ điều kiện → `ready`, không thì `locked` với số còn thiếu.

`templateStory`: 4 mẫu cho mỗi ngôn ngữ, chọn theo `seed`. Ví dụ (en, có từ):
- target: `"In {place}, I saw a {term} near {landmark}!"`, vi: `"Ở {place}, {name} thấy một {meaning} gần {landmark}!"`
Mẫu zh dùng câu tiếng Trung rất đơn giản có `{term}` (ví dụ `"我在{place}看到了{term}！"`) + pinyin của phần cố định viết sẵn, phần `{term}` lấy pinyin của từ (cột `words.reading`, với tiếng Trung là pinyin có dấu; xem `lib/word-schema.ts`). Không có từ → mẫu chỉ nói về địa điểm.

### 1.5.e Server actions (`lib/actions/bin-trip.ts`, tạo mới, `"use server"`)
```ts
export type TripView = {
  status: TripStatus;
  trip: null | {
    id: string; placeId: string; lang: LangCode; returnsAt: string; overnight: boolean;
    word: { id: string | null; term: string; meaningVi: string | null } | null;
    story: BinStory | null; bones: number; itemId: string | null; collected: boolean;
  };
};
export async function loadTrip(): Promise<ActionResult<TripView>>;
export async function startTrip(): Promise<ActionResult<TripView>>;
export async function collectTrip(input: unknown): Promise<ActionResult<{ bones: number; view: TripView }>>;
export async function loadPostcards(): Promise<ActionResult<{ placeId: string; lang: LangCode; day: string; tripId: string; word: string | null }[]>>;
```
`startTrip` từng bước:
1. `requireUser()`, `getProgress()`; lấy chuyến gần nhất (`bin_trips` order `started_at desc` limit 1, client RLS).
2. `tripStatus(...)` phải là `ready`, không thì `fail("Bin chưa đi được lúc này.")`.
3. Lấy ứng viên từ (RLS client; viết truy vấn trong `lib/data/bin.ts`, xem dưới), địa điểm đã thăm (`select place_id from bin_trips`), đồ sở hữu, số chuyến đã có (`count`).
4. `rng = rngFrom(seedOf(user.id + progress.today))`; `pickWord`, `pickPlace`, `tripReward`.
5. `returns_at = tripReturnTime(new Date(), me.settings.timezone)`.
6. Insert bằng **admin client** (bảng không cho client ghi). Nếu lỗi unique (`23505`) → `fail("Hôm nay Bin đã đi dạo rồi.")`.
7. Gọi viết truyện **sau khi trả lời** bằng `after()` của Next (đọc docs `after` trong `node_modules/next/dist/docs/` trước) → bước 1.6.
8. Trả `TripView` mới.

`collectTrip`: zod uuid; gọi RPC `bin_collect_trip`; nếu `story` đang `null` thì sinh `templateStory` và `update` vào dòng (admin client) trước khi trả về, để lúc nào đón cũng có truyện. Lỗi `not_back` → "Bin chưa về đâu."; `already_collected` → trả view hiện tại (không báo lỗi).

`lib/data/bin.ts` (tạo mới, `server-only`): `tripWordCandidates(userId)` — một truy vấn `user_cards` join `words` (lọc `direction = 'recognize'`, `suspended = false`, `word.deck_id in study_deck_ids`) lấy `id, term, meaning_vi, language, pinyin(nếu có), lapses, state, last_review`, giới hạn 30, sắp như 1.5.a. Nếu PostgREST khó lọc theo `study_deck_ids`, tạo RPC `bin_trip_candidates()` **security invoker** trong migration 000014 trả đúng các cột trên (khuyến khích cách RPC, dễ test bằng PGlite).

### 1.5.f Test
- `tests/unit/bin-trip.test.ts`: `canStartTrip` biên (19/20 lượt; 1/2 nhiệm vụ); `tripReturnTime` (10:00 → 13:00; 20:30 → 07:00 hôm sau; 05:00 → 08:00; múi `Asia/Ho_Chi_Minh` và `America/New_York`); `tripStatus` đủ 5 nhánh; `tripReward` cùng seed cho cùng kết quả, `tripNumber === 3` luôn có đồ khi còn; `pickWord` ưu tiên `lapses` cao; `templateStory` chứa đúng `term`, không có ký tự emoji (regex `\p{Extended_Pictographic}`).
- `tests/db/bin.test.ts`: `bin_collect_trip` (chưa về → `not_back`; về rồi → cộng xương, thêm đồ; gọi lần 2 → `already_collected`, xương không tăng thêm); user khác không đón được (`no_trip`).

### Tiêu chí xong 1.5
Test xanh. Gọi `startTrip` từ một test tích hợp nhỏ hoặc từ trang lab trả về `away` đúng giờ.

---

## Bước 1.6 — Truyện của Bin bằng AI (có dự phòng) ✅

### 1.6.a `lib/ai/bin-story.ts` (tạo mới, `server-only`)
```ts
export async function writeTripStory(i: {
  userId: string; tripId: string; lang: LangCode; placeName: string; landmark: string;
  term: string | null; meaningVi: string | null; pinyin: string | null; name: string;
}): Promise<void>
```
1. Không có `term` → không gọi AI, ghi `templateStory` và thoát.
2. `await checkQuota(userId)`; nếu ném `AiError` (hết lượt, chưa cấu hình) → ghi `templateStory`, thoát.
3. `callModel(schema, system, prompt, 400)` với schema zod (`lib/ai/schemas.ts` thêm `binStorySchema`):
   ```ts
   z.object({
     lines: z.array(z.object({ target: z.string().max(160), vi: z.string().max(200) })).min(2).max(3),
     pinyin: z.array(z.string().max(240)).max(3).optional(),
   })
   ```
4. Hậu kiểm: ít nhất 1 dòng `target` chứa đúng `term` (với zh so khớp chuỗi Hán tự; với en so khớp không phân biệt hoa thường, cho phép dạng số nhiều/chia động từ bằng cách kiểm tra `term` gốc **hoặc** `term + "s"/"ed"/"ing"`). Không đạt → `templateStory`.
   Xóa emoji bằng regex `\p{Extended_Pictographic}` ở mọi chuỗi.
5. `update bin_trips set story = … where id = tripId and story is null` (admin client) — không ghi đè truyện đã có.
6. `recordUsage(userId)` chỉ khi gọi AI thành công.
7. Mọi lỗi khác: `console.error("[bin] story", …)` rồi ghi `templateStory`. **Hàm không bao giờ ném lỗi ra ngoài.**

### 1.6.b Prompt (`lib/ai/prompts.ts`, thêm hằng `BIN_STORY_SYSTEM` và hàm `binStoryPrompt(...)`)
System (tiếng Anh, vì model làm tốt hơn; nội dung trả về theo yêu cầu):
```
You write tiny postcards from a cheerful puppy named {name} to the learner who owns it.
Write 2 or 3 very short sentences in {English|Simplified Chinese} for a learner at beginner-to-intermediate level.
The puppy is visiting {place} ({landmark}). The postcard MUST use the word "{term}" exactly once, naturally.
First person, as the puppy. Warm and playful, never guilt-tripping. No emoji. No hashtags.
For each sentence, give a natural Vietnamese translation in "vi".
{zh only: Also give "pinyin" for each sentence, with tone marks, same order.}
Keep each sentence under 15 words (or 20 Chinese characters).
```
User prompt: JSON nhỏ gồm `term`, `meaning_vi`, `place`, `landmark`.

### 1.6.c Gọi từ `startTrip`
```ts
after(() => writeTripStory({...}));
```
(Kiểm tra cách dùng `after` trong Next 16 docs; `lib/ai/enrich.ts` đã dùng `after` trong `recordUsage`, làm theo đó.)

### 1.6.d Test
- `tests/unit/bin-story.test.ts`: mock `callModel`/`checkQuota` theo cách các test AI hiện có (`tests/unit/ai.test.ts`, `ai-fallback.test.ts`):
  - AI trả đúng → ghi `source: "ai"`.
  - AI trả truyện **không** chứa từ → ghi template.
  - `checkQuota` ném `quota_user` → template, không gọi model.
  - AI trả có emoji → emoji bị xóa.

### Tiêu chí xong 1.6
Test xanh; khi thiếu API key, đi dạo vẫn chạy trọn vẹn với truyện mẫu.

---

## Bước 1.7 — Bin đi dạo: giao diện ✅

### 1.7.a `components/mascot/bin-trip.tsx` (tạo mới) — khu "Đi dạo" trong Góc của Bin
Mở bằng ô "Đi dạo" (`panel === "trip"`). Nội dung theo `TripStatus`:
- **locked**: `IconTile` `Footprints` + "Hoàn thành thêm {needQuests} nhiệm vụ hoặc ôn thêm {needReviews} lượt để {name} được đi dạo." + nút "Đi học" (`/review` nếu `dueCount > 0`, không thì `/practice`).
- **ready**: tiêu đề "{name} muốn đi dạo!", mô tả "{name} sẽ đi khoảng 3 tiếng và mang quà về.", nút chính "Cho {name} đi dạo" (`min-h-11`, `btn` chính).
  Bấm → `startTrip` → Bin `wave` → Bin chạy ra khỏi phòng (dùng `m.div` animate `x` sang phải như hiệu ứng `chasing`, rồi ẩn) → chuyển trạng thái `away`. Reduced motion: chỉ đổi mặt rồi ẩn, không chạy.
- **away**: phòng không có Bin; trên nệm (hoặc chỗ Bin đứng nếu không có nệm) là tờ giấy nhỏ (SVG trong `room-items.tsx`, id đặc biệt `note`), chữ trong khu: "{name} đang ở {place}. Về lúc {HH:mm}" (định dạng giờ bằng `Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone })`; nếu `overnight` thì "Sáng mai {name} về"). Đếm ngược "còn 1 giờ 20 phút", cập nhật mỗi 30 giây (setInterval, dọn khi đóng). Các ô Cho ăn/Ném bóng/Làm trò **disabled** với `title="{name} đang đi dạo"`; Trang phục và Trang trí vẫn dùng được.
- **back**: Bin ngồi trước cửa (đứng ở vị trí thường, mood `love`, cầm phong bì: thêm prop `holding?: "envelope"` cho `Pup`, vẽ phong bì trong miệng — nếu khó, đặt `RoomItemArt id="envelope"` ngay trước Bin). Nút chính "Đón {name}".
  Bấm → `collectTrip` → trình tự (mỗi bước ~700ms, giống `STEP_MS` trong `session-gifts.tsx`):
  1. Bin `jump` + `playSfx("pop")` + `haptic("success")`.
  2. **Bưu thiếp** lật ra (component `Postcard`, xem 1.7.c), hiệu ứng lật `rotateY` 180→0 (reduced motion: fade).
  3. **Truyện**: các dòng hiện lần lượt, mỗi dòng có câu `target` (to), pinyin (zh, nhỏ, theo pref ẩn/hiện pinyin hiện có nếu áp dụng được), dòng tiếng Việt (màu `text-fg-muted`). Nút loa phát TTS cho cả truyện (dùng hàm phát âm có sẵn, xem `components/word/pronounce-button.tsx` / `lib/tts.ts`).
  4. **Từ Bin nhặt được**: thẻ nhỏ với từ + nghĩa, link "Xem từ" tới `/words/{wordId}` (route có sẵn `app/(app)/words/[wordId]/page.tsx`); ẩn link khi `word.id` là `null` (từ đã bị xóa).
  5. **Phần thưởng**: "+{bones} xương" (CountUp), nếu có đồ: ô `RoomItemIcon` + "Đồ hiếm: {tên}" + nút "Đặt vào phòng".
  6. Nút "Xong" → trạng thái `done`.
- **done**: "Hôm nay {name} đi dạo rồi. Mai đi tiếp nhé." + link "Xem album bưu thiếp".

### 1.7.b Thêm `trip` vào dữ liệu Today
- `lib/data/progress.ts`: `Progress.trip: TripStatus` (đọc chuyến gần nhất bằng RLS client, tính `tripStatus`). Dùng `cache` sẵn có nên không tốn thêm truy vấn khi gọi nhiều lần.
- `loadBinHome` trả thêm `trip: TripView`.
- Trang Today (`app/(app)/today/page.tsx`), chỉ khi `prefs.mascot`:
  - `away`: dưới bong bóng `MascotSay` (cả điện thoại và desktop), thay `PettablePup` bằng thẻ nhỏ: icon `Footprints` trong `IconTile` + "{name} đang ở {place} · về lúc {HH:mm}". Không có Bin ở hero trong lúc này. Câu thoại hero: key mới `tripAway`.
  - `back`: thẻ nổi bật (tone grape) "{name} về rồi! Có bưu thiếp cho bạn" + nút "Đón {name}" mở Góc của Bin ở `panel="trip"` (thêm tham số cho `BinHomeProvider.open(panel?)`).
  - `ready`: không chen vào hero; chỉ đổi một trong các câu `texts` của `MascotSay` thành key `tripReady` ("Ôn đủ rồi, cho {name} đi dạo không?") và bấm bong bóng mở thẳng `panel="trip"`.
- Màn kết thúc phiên (`components/review/session-gifts.tsx`): nếu sau phiên `trip.kind === "ready"` lần đầu trong ngày, thêm dòng cuối "Đủ điều kiện! Cho {name} đi dạo" với nút mở Góc của Bin ở `panel="trip"`. (Lấy `trip` từ `loadSessionRewards`; thêm field vào `SessionRewardData`.)

### 1.7.c Bưu thiếp
- `components/mascot/postcard.tsx`: `Postcard({ placeId, day, word, size = "md" | "sm" })`. Hình chữ nhật bo góc `rounded-[18px]`, nền `TONE_CLASSES[place.tone].soft`, bên trái hình minh họa địa danh (SVG đơn giản, **mỗi địa điểm một hình riêng nhưng tối giản**: tháp, cầu, núi, chùa… vẽ bằng 3–6 path, nét `var(--pup-ink)`), bên phải tên địa điểm (đậm 800), ngày (dd/MM), con tem tròn có in hình chân cún. Không dùng ảnh ngoài.
  > 24 hình địa danh là phần tốn công: tạo `components/mascot/landmarks.tsx` với `Landmark({ id })`. Nếu cần chia nhỏ, làm 6 hình chung (tháp, cầu, núi, chùa, tòa nhà cao, cây) và gán mỗi địa điểm một hình + màu tone khác nhau; ghi lại lựa chọn vào `CLAUDE.md`.
- Trang album `app/(app)/bin/postcards/page.tsx` (route mới, server component): tiêu đề "Bưu thiếp của {name}", dòng "Đã sưu tầm x/24 nơi", lưới bưu thiếp (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`), ô chưa có = bóng mờ + "???". Bấm bưu thiếp đã có → mở dialog xem lại truyện của chuyến đó. Có link tới trang này từ khu "Đi dạo" và từ Góc của Bin (link nhỏ dưới ô).
  Thêm route vào nhóm `(app)` cho đúng layout; không thêm vào thanh nav chính.

### 1.7.d Câu thoại mới (`lines.ts`)
```ts
tripReady: ["Ôn đủ rồi, cho {name} đi dạo không?", "{name} muốn ra ngoài chơi một vòng."],
tripAway: ["{name} đang đi dạo, lát về kể bạn nghe.", "{name} ra ngoài rồi, bạn cứ học tiếp nhé."],
tripBack: ["{name} về rồi! Có quà cho bạn.", "Mở bưu thiếp ra xem nào."],
tripOvernight: ["{name} ngủ lại ở đó, sáng mai về."],
```

### 1.7.e Thông báo đẩy khi Bin về (tùy chọn, làm nếu cron chạy được)
- **Kiểm tra trước**: `vercel.json` hiện có 1 cron mỗi ngày. Gói Vercel Hobby chỉ cho cron chạy **mỗi ngày một lần**; nếu dự án đang ở Hobby thì **bỏ qua mục này** và ghi vào `CLAUDE.md` là chưa làm vì giới hạn cron.
- Nếu làm: route `app/api/cron/bin-trips/route.ts` (copy cách xác thực `CRON_SECRET` của `app/api/cron/reminders/route.ts`), chạy `*/30 * * * *`:
  1. Admin client lấy `bin_trips` có `returns_at <= now()`, `collected_at is null`, `notified_at is null`, giới hạn 500.
  2. Lọc user có `push_subscriptions`; `sendPush` với payload `{ title: "{name} về rồi!", body: "Có bưu thiếp từ {place} cho bạn.", url: "/today?bin=trip", tag: "bin-trip" }` (lấy `mascot_name` từ prefs).
  3. Đặt `notified_at = now()` cho mọi chuyến đã xử lý (kể cả không có thiết bị).
  - Trang Today đọc `?bin=trip` để tự mở Góc của Bin ở `panel="trip"`.
  - Tối đa 1 push loại này mỗi user mỗi ngày (vì 1 chuyến/ngày).

### 1.7.f E2E `tests/e2e/bin-trip.spec.ts`
1. User có `daily_stats` hôm nay `reviews = 25` (dùng study day hiện tại, tính như `studyDay` trong test helpers).
2. Mở Góc của Bin → Đi dạo → "Cho Bin đi dạo" → thấy "đang ở".
3. Dùng admin client đặt `returns_at = now() - 1 minute`, tải lại.
4. Today hiện "Bin về rồi!" → "Đón Bin" → thấy bưu thiếp, ít nhất 2 dòng truyện, "+N xương".
5. Header xương tăng đúng N. Mở `/bin/postcards` thấy "Đã sưu tầm 1/24".
6. Mở lại Đi dạo → "Hôm nay Bin đi dạo rồi".
(Môi trường test không có API key ⇒ truyện là mẫu; test không phụ thuộc AI.)

### Tiêu chí xong 1.7
E2E xanh; ảnh chụp 4 trạng thái (ready, away, back, done) ở 390px và 1280px, sáng/tối; Lighthouse accessibility trang Today không giảm (so `docs/redesign-v3/lighthouse-after.md`).

---

## Bước 1.8 — Admin, seed demo, tài liệu ✅

- `lib/admin-pet.ts` + `components/admin/pet-panel.tsx`: thêm số dư xương (từ `bin_balance` qua admin client), 20 dòng `bin_ledger` gần nhất (bảng: thời gian, loại, số, ref), phòng hiện tại (6 slot), chuyến gần nhất (địa điểm, trạng thái), số bưu thiếp. Cập nhật `tests/unit/admin-pet.test.ts`.
- `scripts/seed-demo.mjs`: tài khoản `demo@example.com` có sẵn 2 món phòng (`bed_cushion`, `wall_sun` đặt vào phòng) và 2 chuyến cũ đã đón (London, Bắc Kinh) có truyện mẫu.
- `CLAUDE.md`: thêm mục **"Bin 3.0 — Giai đoạn 1"** mô tả: sổ xương và RPC (ai được gọi), danh mục đồ, vị trí slot, luật đi dạo, truyện AI + dự phòng, album, cron (làm hay không).
- Cập nhật `docs/PLAN-bin-3.md`: đánh dấu ✅ các bước đã xong.

---

# GIAI ĐOẠN 2 — Bin trò chuyện (bản nhẹ) + Khăn giữ chuỗi

## Bước 2.1 — Bin nói trong phiên học ✅

### Hiện trạng
`session-bar.tsx` đã làm Bin nhảy/rũ/nhảy múa theo câu trả lời và có bong bóng `idleLine` sau 25 giây không làm gì. `LINES` đã có `combo`, `praise`, `wrongComfort` nhưng **chưa được dùng trong phiên**. Bước này cho Bin **nói** vào những thời điểm đáng nói, không gọi AI.

### 2.1.a Logic thuần `lib/mascot/session-talk.ts` (tạo mới)
```ts
export type TalkEvent = { correct: boolean; close?: boolean; wordId?: string; term?: string };
export type TalkState = {
  answers: number;           // answers so far in this session
  combo: number;             // after this answer
  wrongRun: number;          // wrong answers in a row, after this answer
  missed: Set<string>;       // word ids answered wrong earlier in this session
  lastTalkAt: number;        // value of `answers` when Bin last talked (-Infinity at start)
  halfwaySaid: boolean;
};
export type Talk = { key: LineKey; n?: number; word?: string };

export const TALK_GAP = 4; // at least this many answers between two lines, except milestones

export function initialTalkState(): TalkState;
/** Pure: the next state and what Bin says (or null). `progress` = done / total, 0..1. */
export function nextTalk(prev: TalkState, e: TalkEvent, progress: number): { state: TalkState; talk: Talk | null };
```
Luật `nextTalk` (theo thứ tự ưu tiên, chỉ chọn **một**):
1. `isComboMilestone(combo)` (5, 10, 20, 30…) → `{ key: "comboTalk", n: combo }` — **không** cần chờ `TALK_GAP`.
2. Câu đúng, có `wordId` nằm trong `missed` → `{ key: "redeem", word: term }`, xóa id khỏi `missed`.
3. Câu đúng ngay sau `wrongRun >= 2` (tức trước câu này sai ≥ 2 câu liên tiếp) → `{ key: "comeback" }`.
4. Câu sai làm `wrongRun === 3` → `{ key: "wrongRun" }` ("Khó nhỉ. Chậm lại một chút cũng được.").
5. `progress >= 0.5` lần đầu và `answers >= 8` → `{ key: "halfway" }`, `halfwaySaid = true`.
- Các mục 2–5 chỉ nói nếu `answers - lastTalkAt >= TALK_GAP`; nếu không thì vẫn cập nhật state nhưng `talk = null` (riêng mục 2 vẫn xóa id khỏi `missed`).
- Câu sai có `wordId` → thêm vào `missed`.
- `close` tính như sai cho `wrongRun` nhưng **không** thêm vào `missed`.

### 2.1.b `lines.ts`
- Thêm tham số `word` cho `say`:
  ```ts
  export function say(key, { seed = 0, name = "Bin", n, word }: { seed?: number; name?: string; n?: number; word?: string } = {})
  // ... .replaceAll("{word}", word ?? "")
  ```
- Câu mới:
  ```ts
  comboTalk: ["{n} câu liền! {name} chóng mặt vì bạn đó.", "Combo {n}! Giữ nhịp này nhé.", "{n} câu đúng liên tục, quá đỉnh."],
  redeem: ["Lần này nhớ {word} rồi!", "{word}, lần này chuẩn luôn.", "Thấy chưa, {word} vào đầu rồi."],
  comeback: ["Gỡ lại rồi!", "Đó, vậy mới đúng chứ.", "Lấy lại nhịp rồi."],
  wrongRun: ["Khó nhỉ. Chậm lại một chút cũng được.", "Mấy từ này khó thật, {name} vẫn ở đây."],
  halfway: ["Được một nửa rồi.", "Nửa chặng rồi, cố lên."],
  ```
- Thêm test vào `tests/unit/mascot.test.ts`: `say` thay `{word}`; mọi câu mới không emoji; không câu nào dài quá 60 ký tự sau khi thay `{n}=30`, `{name}=Bin`, `{word}=鼓励`.

### 2.1.c `use-session-hud.ts`
- `answer` nhận thêm `word?: { id: string; term: string }`.
- Thêm vào `SessionHud`: `talk: (Talk & { n: number /* counter */ }) | null`.
- Trong `answer`: giữ `talkRef = useRef(initialTalkState())`, gọi `nextTalk`, nếu có talk thì `setTalk({ ...talk, id: countRef.current })`.
- **Không** đổi gì về âm thanh/rung/XP.

### 2.1.d Truyền từ vào `answer` ở 3 chỗ gọi
- `components/review/review-session.tsx` (dòng `answerHud({ correct: rating > 1 })`): truyền `word: { id: current.word.id, term: current.word.term }` (kiểm tra tên field thật của object `current.word`).
- `components/practice/practice-session.tsx` và `learn-session.tsx` (`answerHud(o)`): truyền `{ ...o, word: { id: q.word.id, term: q.word.term } }`.
- Kiểm tra kiểu `Outcome` để không phá chỗ khác.

### 2.1.e `session-bar.tsx`
- Prop `hud` thêm `talk`.
- Hợp nhất bong bóng: state `bubble: { text: string; key: string } | null`. Khi `hud.talk` đổi (theo `id`) và pref `mascot` bật → `bubble = say(talk.key, { seed: talk.id, name, n: talk.n, word: talk.word })`, tự ẩn sau **2600 ms**. `idleLine` cũ dùng cùng bong bóng (bong bóng mới đè cái cũ).
- Bong bóng là chữ trang trí (`aria-hidden` như `idleLine` hiện tại) **nhưng** thêm một vùng `sr-only aria-live="polite"` đọc câu combo milestone cho trình đọc màn hình (chỉ milestone, để không ồn).
- Với `comboTalk`, giữ hành vi Bin `dance` có sẵn; với `redeem`/`comeback` → Bin `highFive`; `wrongRun` → Bin `sit` (an ủi).
- Truyền `talk` ở 3 chỗ render `SessionBar` (review, practice, learn) — tìm `hud={{ combo: hud.combo, xp: hud.xp, reaction: hud.reaction }}` và thêm `talk: hud.talk`.

### 2.1.f Test
- `tests/unit/session-talk.test.ts`: chuỗi sự kiện mẫu → đúng câu ở đúng chỗ: combo 5 nói dù vừa nói ở câu trước; `redeem` khi từ sai rồi đúng lại; khoảng cách `TALK_GAP`; `wrongRun` đúng ở câu sai thứ 3; `halfway` chỉ 1 lần.
- `tests/e2e/session-hud.spec.ts` (đã có): thêm ca trả lời đúng 5 câu liên tiếp ở luyện tập trắc nghiệm → thấy bong bóng chứa "5".

### Tiêu chí xong 2.1
Test xanh; trong một phiên 20 câu Bin nói **không quá ~6 lần**; tắt linh vật thì không có bong bóng.

---

## Bước 2.2 — Lời chào AI mỗi ngày trên Today ✅

### 2.2.a Migration `supabase/migrations/20261030000015_bin_companion.sql` (phần 1)
```sql
-- One AI-written greeting per user per study day (docs/PLAN-bin-3.md §2.2).
create table public.bin_daily (
  user_id uuid not null references public.profiles on delete cascade,
  study_day date not null,
  greeting text not null check (char_length(greeting) <= 200),
  mood text not null check (mood in ('happy','wave','cheer','love','wink','cool','think')),
  word_id uuid references public.words on delete set null,
  source text not null check (source in ('ai', 'template')),
  created_at timestamptz not null default now(),
  primary key (user_id, study_day)
);
alter table public.bin_daily enable row level security;
create policy "bin_daily: own read" on public.bin_daily for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.bin_daily from authenticated, anon;
```

### 2.2.b Pref mới (`lib/validation.ts`)
```ts
/** Bin writes one greeting a day with AI (needs the AI key); off = only the fixed lines. */
bin_ai_greeting: z.boolean().optional(),
```
`DEFAULT_PREFS.bin_ai_greeting = true`. Thêm công tắc "Lời chào thông minh mỗi ngày" vào `components/settings/mascot-prefs.tsx` (mô tả nhỏ: "{name} nhắc lại từ bạn vừa học hôm qua. Dùng 1 lượt AI mỗi ngày."), ẩn khi `mascot` tắt.

### 2.2.c Ngữ cảnh lời chào (`lib/data/bin.ts`, thêm)
```ts
export async function greetingContext(userId: string, today: string): Promise<{
  name: string;
  streak: number;
  dueToday: number;
  reviewedToday: number;
  hardWords: { id: string; term: string; meaningVi: string | null; language: LangCode }[]; // ≤ 3
  newYesterday: { id: string; term: string; meaningVi: string | null; language: LangCode }[]; // ≤ 3
  tripBack: boolean;
}>
```
- `hardWords`: từ có `review_logs.rating = 1` trong 2 ngày gần nhất (đếm số lần sai, lấy 3 từ sai nhiều nhất). Viết bằng RPC trong migration 000015:
  ```sql
  create or replace function public.bin_recent_misses(p_days int default 2)
  returns table (word_id uuid, term text, meaning_vi text, language public.lang_code, misses int)
  language sql stable security invoker set search_path = ''
  as $$
    select w.id, w.term, w.meaning_vi, w.language, count(*)::int
    from public.review_logs l join public.words w on w.id = l.word_id
    where l.user_id = auth.uid() and l.rating = 1
      and l.reviewed_at >= now() - make_interval(days => greatest(1, least(p_days, 7)))
    group by w.id, w.term, w.meaning_vi, w.language
    order by count(*) desc, max(l.reviewed_at) desc
    limit 3;
  $$;
  grant execute on function public.bin_recent_misses(int) to authenticated;
  ```
- `newYesterday`: từ có `review_logs.state_before = 'new'` hôm qua (≤ 3).

### 2.2.d Viết lời chào (`lib/ai/bin-greeting.ts`, `server-only`)
```ts
export async function getOrWriteGreeting(userId: string, today: string): Promise<{ text: string; mood: PupMood; wordId: string | null } | null>
```
1. Đọc `bin_daily` (user, today). Có → trả luôn.
2. Không có, pref `bin_ai_greeting` tắt hoặc `mascot` tắt → trả `null` (Today dùng câu cố định như cũ).
3. Lấy `greetingContext`. Nếu không có `hardWords` lẫn `newYesterday` → ghi lời chào **mẫu** (`source = 'template'`, key mới `greetDaily` trong `lines.ts`) để không tốn AI, trả về.
4. `checkQuota` → lỗi thì ghi mẫu.
5. `callModel` với schema:
   ```ts
   z.object({ text: z.string().min(10).max(160), mood: z.enum(["happy","wave","cheer","love","wink","cool","think"]), word_id: z.string().uuid().nullable() })
   ```
   System prompt (tiếng Anh, yêu cầu trả tiếng Việt):
   ```
   You are {name}, a friendly puppy mascot in a Vietnamese vocabulary app. Write ONE greeting in Vietnamese for today, at most 2 short sentences (max 160 characters).
   Mention at most one word from the list, written exactly as given, and only if it fits naturally (for example: "Hôm qua mình thấy bạn hơi vấp chữ 鼓励, hôm nay gặp lại nó nhé").
   Be warm and light. Never guilt-trip, never mention losing, never invent numbers that are not given. No emoji. Do not use the word "streak"; say "chuỗi".
   Pick a mood that matches the text. word_id must be the id of the word you mentioned, or null.
   ```
   User prompt: JSON ngữ cảnh (không gửi email, tên thật hay dữ liệu cá nhân khác — chỉ `name` của Bin, các số, các từ).
6. Hậu kiểm: xóa emoji; nếu `word_id` khác null thì `text` phải chứa `term` của từ đó, không thì đặt `word_id = null`; nếu `text` chứa số nào **không** có trong ngữ cảnh (regex `\d+`, so với `streak`, `dueToday`, `reviewedToday`) → dùng mẫu.
7. `insert … on conflict do nothing` (admin client), rồi **đọc lại** dòng (để hai tab cùng lúc trả cùng một câu). `recordUsage` nếu gọi AI thành công.
8. Không ném lỗi ra ngoài: lỗi → `console.error("[bin] greeting", …)` và trả `null`.

### 2.2.e Server action + giao diện
- `lib/actions/bin.ts`: `loadGreeting(): Promise<ActionResult<{ text: string; mood: PupMood } | null>>` gọi `getOrWriteGreeting`.
- **Không chặn render Today**: trang Today giữ nguyên tính `mood/text/texts` như hiện tại. Thêm component client `components/mascot/daily-greeting.tsx` bọc `MascotSay`:
  - Nhận `fallback: { mood, text, texts }` (cái hiện có) và `situation: LineKey` (đang dùng).
  - Chỉ gọi `loadGreeting()` khi `situation` là `due` hoặc `dueMany` hoặc `allDone` (khi `empty` hoặc `streakAtRisk` thì câu cố định quan trọng hơn).
  - Khi có kết quả: đặt lời chào AI làm **câu đầu** của `texts` và đổi `mood`; fade nhẹ (150ms) như `MascotSay` đang làm khi đổi câu.
  - Lưu kết quả vào `sessionStorage` key `sotu:bin-greeting:{today}` (bọc try/catch) để chuyển trang về Today không gọi lại.
- Desktop (hero dùng `PettablePup` + bubble): truyền lời chào làm câu bong bóng mặc định nếu có (đọc component `PettablePup` để biết prop bubble text).

### 2.2.f Test
- `tests/unit/bin-greeting.test.ts` (mock `callModel`, `checkQuota`, Supabase): có sẵn trong DB → không gọi AI; pref tắt → null; không có từ → mẫu, không gọi AI; AI bịa số → mẫu; AI nhắc từ không đúng id → `word_id = null`; emoji bị xóa.
- `tests/db/bin.test.ts`: RLS `bin_daily` (đọc được của mình, không đọc được của người khác, không insert được).

### Tiêu chí xong 2.2
Mỗi user tối đa **1** lần gọi AI cho lời chào mỗi ngày (kiểm tra bằng log `[ai]` khi tải lại Today nhiều lần). Thiếu API key: Today y như cũ.

---

## Bước 2.3 — Khăn giữ chuỗi: logic chuỗi ✅

### Luật (chốt)
- Đã có **1 ngày nghỉ miễn phí mỗi tuần** (giữ nguyên). Khăn là lớp bảo vệ **thêm**.
- Món `streak_scarf` (không thuộc phòng), giá **20 xương**, giữ **tối đa 2** cái (`bin_buy(..., p_max_qty => 2)`).
- Khi một ngày bị lỡ mà ngày nghỉ tuần **không** che được, và người dùng còn khăn → tự dùng 1 khăn cho ngày đó. Ngày dùng khăn **không cộng** vào số ngày chuỗi (giống ngày nghỉ) nhưng không làm đứt.
- Chỉ cứu khi trước khoảng trống có chuỗi (có ngày học trước đó). Không cứu khoảng trống dài hơn số khăn đang có + ngày nghỉ còn lại.
- Khăn được dùng **lúc người dùng mở app lần đầu sau khoảng trống** (lúc tính `getStudySummary`).

### 2.3.a Migration 000015 (phần 2)
```sql
create table public.bin_freezes (
  user_id uuid not null references public.profiles on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.bin_freezes enable row level security;
-- group mates read them too: their streaks are shown in the group feed and leaderboard
create policy "bin_freezes: own or group mates" on public.bin_freezes
  for select to authenticated using (user_id = auth.uid() or public.shares_group_with(user_id));
revoke insert, update, delete on public.bin_freezes from authenticated, anon;

-- Uses one scarf per day in p_days (oldest first) while scarves last. Returns the days actually frozen.
create or replace function public.bin_use_freezes(p_user uuid, p_days date[])
returns date[]
language plpgsql security definer set search_path = ''
as $$
declare
  have int;
  d date;
  used date[] := '{}';
begin
  perform public.bin_lock(p_user);
  select qty into have from public.bin_items where user_id = p_user and item_id = 'streak_scarf';
  have := coalesce(have, 0);
  foreach d in array (select array_agg(x order by x) from unnest(p_days) x) loop
    exit when have <= 0;
    insert into public.bin_freezes (user_id, day) values (p_user, d) on conflict do nothing;
    if found then
      have := have - 1;
      used := used || d;
    end if;
  end loop;
  update public.bin_items set qty = have where user_id = p_user and item_id = 'streak_scarf';
  return used;
end;
$$;
revoke execute on function public.bin_use_freezes(uuid, date[]) from public, anon, authenticated;
grant execute on function public.bin_use_freezes(uuid, date[]) to service_role;
```
(Kiểm tra `found` sau `insert … on conflict do nothing` trong PGlite: nếu không chạy, dùng `get diagnostics n = row_count`.)

### 2.3.b `lib/srs/streak.ts`
- Đổi chữ ký (tham số mới **tùy chọn** để không phá chỗ gọi cũ):
  ```ts
  export function computeStreak(activeDays: Iterable<string>, today: string, frozenDays: Iterable<string> = []): Streak
  ```
- Trong vòng lặp: ngày nằm trong `frozen` xử lý như "được che": **không** tăng `current`, **không** dùng ngày nghỉ tuần, **không** làm đứt; đẩy vào danh sách `frozenDays` của kết quả (chỉ những ngày nằm trong chuỗi đang tính, giống cách `restDays` dùng `pendingRest`).
- `Streak` thêm `frozenDays: string[]` và `since: string | null` (ngày cũ nhất mà chuỗi hiện tại chạm tới; `null` nếu `current === 0`).
- Thêm hàm thuần:
  ```ts
  /**
   * Days to freeze now so the streak survives, or [] when it can't (or needn't) be saved.
   * Gap = study days strictly between the last active-or-frozen day and today.
   */
  export function planFreezes(activeDays: Iterable<string>, frozenDays: Iterable<string>, today: string, scarves: number): string[]
  ```
  Thuật toán (đã chạy thử với các ca ở 2.3.e, kết quả khớp bảng):
  1. `L` = ngày lớn nhất `< today` có trong active ∪ frozen. Không có, hoặc `scarves <= 0` → `[]`.
  2. Nếu `computeStreak(active, addDays(L, 1), frozen).current === 0` (trước khoảng trống không có chuỗi) → `[]`.
  3. `gap` = các ngày từ `addDays(L, 1)` tới `addDays(today, -1)`. Rỗng → `[]`.
  4. `base = computeStreak(active, today, frozen)`; nếu `base.current > 0 && base.since <= L` (ngày nghỉ tuần đã nối được) → `[]`.
  5. Nếu `gap.length > scarves + 2` → `[]`.
  6. Với `k` từ 1 tới `min(scarves, gap.length)`: duyệt các tổ hợp `k` ngày của `gap`, sinh từ danh sách `gap` **sắp giảm dần** (ngày mới trước, để ngày nghỉ tuần che ngày cũ hơn). Tổ hợp đầu tiên `S` làm `r = computeStreak(active, today, [...frozen, ...S])` thỏa `r.current > 0 && r.since <= L` → trả `S` sắp tăng dần.
  7. Không có → `[]`.

  Cách sửa vòng lặp trong `computeStreak` (giữ nguyên phần còn lại của hàm):
  ```ts
  const frozen = new Set(frozenDays);
  const frozenHit: string[] = [];
  let since: string | null = null;
  // ...
  const pendingRest: string[] = [];
  const pendingFrozen: string[] = [];
  while (day >= earliest) {
    if (active.has(day)) {
      current++;
      since = day;
      restDays.push(...pendingRest);
      frozenHit.push(...pendingFrozen);
      pendingRest.length = 0;
      pendingFrozen.length = 0;
    } else if (frozen.has(day)) {
      pendingFrozen.push(day); // covered by a scarf: no count, no rest day used, no break
    } else {
      const week = weekStart(day);
      if (restWeeks.has(week)) break;
      restWeeks.add(week);
      pendingRest.push(day);
    }
    day = addDays(day, -1);
  }
  // return { ..., frozenDays: frozenHit.sort(), since }
  ```

### 2.3.c `lib/data/study.ts` (`getStudySummary`)
1. Đọc song song: `bin_freezes` của mình (từ `from` tới `today`) và `qty` của `streak_scarf` (bảng `bin_items`).
2. `const plan = planFreezes(activeDays, frozen, today, scarves)`.
3. Nếu `plan.length > 0`: gọi `createAdminClient().rpc("bin_use_freezes", { p_user: me.user.id, p_days: plan })`, cộng kết quả vào `frozen`. Lỗi → log, bỏ qua (chuỗi tính như chưa có khăn).
4. `computeStreak(activeDays, today, frozen)`.
5. Trả thêm `scarves` (số còn lại) và `frozenYesterday: boolean` (ngày `today - 1` vừa nằm trong `plan`) để Today báo tin.

### 2.3.d Các chỗ khác gọi `computeStreak`
- `lib/data/groups.ts` (chuỗi của bạn cùng nhóm): đọc thêm `bin_freezes` của các thành viên (RLS cho phép), truyền vào.
- `lib/data/admin.ts`, `lib/admin-pet.ts`: đọc bằng admin client, truyền vào.
- **Không** gọi `bin_use_freezes` ở các chỗ này (chỉ người chủ khi mở app mới tiêu khăn).
- `longestStreak` giữ nguyên (khăn không tính vào kỷ lục chuỗi dài nhất, vì đó là ngày không học).

### 2.3.e Test
File mới `tests/unit/streak-freeze.test.ts`. Tuần tính từ thứ Hai: 2026-11-02 là thứ Hai, 2026-11-04 là thứ Tư. `range(a, b)` = mọi ngày từ a tới b.

| Ca | active | frozen | scarves | today | `planFreezes` | `current` sau khi đóng băng | `restDays` |
|---|---|---|---|---|---|---|---|
| A. Lỡ hôm qua, ngày nghỉ tuần che | `range(10-28, 11-02)` | — | 1 | 11-04 | `[]` | 6 | `[11-03]` |
| B. Lỡ T2 + T3 cùng tuần, 1 khăn | `range(10-29, 11-01)` | — | 1 | 11-04 | `[11-03]` | 4 | `[11-02]` |
| B0. Như B, 0 khăn | `range(10-29, 11-01)` | — | 0 | 11-04 | `[]` | 0 | `[]` |
| C. Lỡ T2, T3, T4, 1 khăn | `range(10-29, 11-01)` | — | 1 | 11-05 | `[]` | 0 | `[]` |
| C2. Như C, 2 khăn | `range(10-29, 11-01)` | — | 2 | 11-05 | `[11-03, 11-04]` | 4 | `[11-02]` |
| D. Không có chuỗi gần | `[10-20]` | — | 2 | 11-04 | `[]` | 0 | `[]` |
| E. Đã đóng băng rồi (mở app lần 2) | `range(10-29, 11-01)` | `[11-03]` | 1 | 11-04 | `[]` | 4 | `[11-02]` |
| F. Hôm nay đã học lại | `range(10-29, 11-01)` + `[11-04]` | — | 1 | 11-04 | `[11-03]` | 5 | `[11-02]` |

(Năm 2026 cho mọi ngày.) Thêm:
- `computeStreak` không truyền `frozenDays` → kết quả **giống hệt** trước khi sửa cho mọi ca test cũ trong `tests/unit/srs.test.ts`.
- `computeStreak(..., frozen)` trả `frozenDays` đã sắp tăng dần, chỉ gồm ngày đóng băng nằm trong chuỗi đang tính.
- `tests/db/bin.test.ts`: `bin_use_freezes` với 1 khăn và 2 ngày → chỉ ngày cũ hơn được ghi, qty về 0; gọi lại với cùng ngày → không trừ thêm; không có khăn → mảng rỗng.

### Tiêu chí xong 2.3
Toàn bộ test chuỗi cũ vẫn xanh (không đổi hành vi khi không có khăn).

---

## Bước 2.4 — Khăn giữ chuỗi: shop và giao diện ✅

### 2.4.a Danh mục
`lib/bin/catalog.ts` thêm loại đồ đặc biệt:
```ts
export type SpecialItem = { id: "streak_scarf"; name: "Khăn giữ chuỗi"; price: 20; maxQty: 2; description: string };
export const STREAK_SCARF: SpecialItem;
```
`buyItem` nhận cả `"streak_scarf"` (gọi `bin_buy(..., 20, 2)`), lỗi `already_owned` → "Đã có đủ 2 khăn."

### 2.4.b Nơi mua
- Trong khu Trang trí (1.4) thêm chip thứ 7 **"Đặc biệt"** (icon `Sparkles`) chứa thẻ Khăn giữ chuỗi: hình khăn (dùng lại SVG khăn của trang phục `scarf` trong `outfits.tsx`, bọc trong ô), mô tả: "Lỡ một ngày, {name} quàng khăn giữ chuỗi cho bạn. Giữ được tối đa 2 cái." Hiện "Đang có 1/2". Nút "Mua · 20 xương" (xác nhận 2 lần như 1.4).
- Thẻ chuỗi trên Today (`components/today/today-card.tsx`, khối `bg-streak-soft`): dưới `StreakWeek` thêm dòng nhỏ với icon `Shield` (lucide) + "Có {scarves} khăn giữ chuỗi" khi `scarves > 0`; khi `scarves === 0` và chuỗi ≥ 3: link nhỏ "Mua khăn giữ chuỗi" mở Góc của Bin ở `panel="decor"` + chip Đặc biệt.

### 2.4.c Lịch tuần (`components/stats/streak-week.tsx`)
- Nhận thêm `streak.frozenDays`; ngày đóng băng tô `bg-c-blue-soft text-c-blue-fg` với icon `Shield` nhỏ, `aria-label="Ngày giữ chuỗi bằng khăn"`. Ngày nghỉ miễn phí giữ kiểu hiện tại.

### 2.4.d Báo tin khi khăn vừa được dùng
- Today: nếu `frozenYesterday` → câu thoại ưu tiên cao nhất (trước `streakAtRisk`): key `streakSaved`, mood `love`, và Bin hero mặc **trang phục `scarf`** trong ngày đó (chỉ hiển thị, không đổi pref).
  ```ts
  streakSaved: ["Hôm qua {name} quàng khăn giữ chuỗi giúp bạn rồi. Hôm nay ôn một thẻ nhé.", "Chuỗi {n} ngày vẫn còn nhờ chiếc khăn. Học tiếp nào."],
  ```
- Không gửi push riêng cho việc này.

### 2.4.e E2E `tests/e2e/bin-scarf.spec.ts`
1. User có `daily_stats` reviews > 0 cho 5 ngày liên tiếp kết thúc **hai** ngày trước hôm nay, và ngày nghỉ của tuần hiện tại đã bị dùng (dựng dữ liệu cẩn thận theo tuần thứ Hai–Chủ nhật), có 60 xương.
2. Mua khăn ở Đặc biệt → "Đang có 1/2".
3. Tải lại Today → thấy câu "quàng khăn giữ chuỗi", lịch tuần có ô khăn, "Có 0 khăn giữ chuỗi" không hiện (hết khăn) và link mua hiện.
> Nếu dựng ngày quá phức tạp ở e2e, giảm còn: mua khăn → thấy "Có 1 khăn giữ chuỗi" trên Today; phần đóng băng đã có unit + db test.

### Tiêu chí xong 2.4
E2E xanh; ảnh chụp thẻ chuỗi 390px với 0/1/2 khăn.

---

## Bước 2.5 — Admin và tài liệu ✅
- `pet-panel.tsx`: số khăn, các ngày đã đóng băng (30 ngày gần nhất), lời chào hôm nay (nếu có, kèm `source`).
- `CLAUDE.md`: mục **"Bin 3.0 — Giai đoạn 2"**: luật Bin nói trong phiên (`session-talk.ts`, `TALK_GAP`), lời chào AI (1 lần/ngày, khi nào gọi, dự phòng, pref), khăn giữ chuỗi (luật, `planFreezes`, chỗ tiêu khăn, nhóm đọc được `bin_freezes`).

---

# GIAI ĐOẠN 3 — Bạn nhỏ của Bin: Miu, Panda (và hai bạn nữa)

## Bước 3.1 — Dữ liệu và điều kiện nhận trứng ✅

### 3.1.a Danh sách bạn nhỏ (`lib/bin/buddies.ts`, tạo mới, thuần)
```ts
export type BuddySpecies = "miu" | "panda" | "duck" | "bunny";
export type Buddy = {
  species: BuddySpecies;
  defaultName: string;          // "Miu", "Panda", "Vịt Quạc", "Thỏ Bông"
  egg: EggRule;
  hatchCorrect: number;         // right answers needed after the egg arrives
  tone: Tone;                   // egg colour and card colour
};
export type EggRule =
  | { kind: "mastered"; lang: LangCode | "any"; count: number };

export const BUDDIES: readonly Buddy[] = [
  { species: "miu",   defaultName: "Miu",      egg: { kind: "mastered", lang: "any", count: 25 },  hatchCorrect: 30, tone: "orange" },
  { species: "panda", defaultName: "Panda",    egg: { kind: "mastered", lang: "zh",  count: 25 },  hatchCorrect: 30, tone: "mint" },
  { species: "duck",  defaultName: "Vịt Quạc", egg: { kind: "mastered", lang: "en",  count: 25 },  hatchCorrect: 30, tone: "sun" },
  { species: "bunny", defaultName: "Thỏ Bông", egg: { kind: "mastered", lang: "any", count: 100 }, hatchCorrect: 60, tone: "pink" },
];

/** A word is "mastered" when its recognize card is in review with an interval of 21 days or more. */
export const MASTERED_INTERVAL_DAYS = 21;

export function eggCondition(b: Buddy): string; // "Thuộc 25 từ tiếng Trung", "Thuộc 100 từ"
export function eggsEarned(mastered: { en: number; zh: number }, have: Set<BuddySpecies>): BuddySpecies[];
export function hatchProgress(i: { totalCorrect: number; startCorrect: number; need: number }): { done: number; need: number; ready: boolean };
```
(Kiểm tra tone có trong `TONE_CLASSES`; nếu thiếu `orange`/`mint`/`sun`/`pink` thì đổi cho khớp.)

### 3.1.b Migration `supabase/migrations/20261030000016_bin_buddies.sql`
```sql
create table public.bin_buddies (
  user_id uuid not null references public.profiles on delete cascade,
  species text not null check (species in ('miu', 'panda', 'duck', 'bunny')),
  name text not null check (char_length(name) between 1 and 20),
  egg_at timestamptz not null default now(),
  start_correct int not null check (start_correct >= 0),  -- total right answers when the egg arrived
  hatched_at timestamptz,
  primary key (user_id, species)
);
alter table public.bin_buddies enable row level security;
create policy "bin_buddies: own read" on public.bin_buddies for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.bin_buddies from authenticated, anon;

-- Counts mastered words per language for the signed-in user (recognize cards, interval >= 21 days).
create or replace function public.bin_mastered_counts()
returns table (language public.lang_code, n int)
language sql stable security invoker set search_path = ''
as $$
  select w.language, count(*)::int
  from public.user_cards c join public.words w on w.id = c.word_id
  where c.user_id = auth.uid() and c.direction = 'recognize' and c.state = 'review'
    and c.scheduled_days >= 21 and not c.suspended
  group by w.language;
$$;
grant execute on function public.bin_mastered_counts() to authenticated;
```

### 3.1.c Đồng bộ trứng (`lib/actions/bin-buddies.ts`, tạo mới)
```ts
export type BuddyView = {
  species: BuddySpecies; name: string;
  state: "locked" | "egg" | "hatched";
  condition: string;                 // eggCondition
  mastered: number;                  // current count for that rule
  hatch: { done: number; need: number; ready: boolean } | null;
};
export type BuddiesData = { buddies: BuddyView[]; active: BuddySpecies | null; newEggs: BuddySpecies[] };

/** Grants the eggs the person has earned (idempotent) and returns every buddy's state. */
export async function syncBuddies(): Promise<ActionResult<BuddiesData>>;
export async function hatchBuddy(input: unknown): Promise<ActionResult<BuddiesData>>;
export async function renameBuddy(input: unknown): Promise<ActionResult<BuddiesData>>;
export async function setActiveBuddy(input: unknown): Promise<ActionResult<{ active: BuddySpecies | null }>>;
```
- `syncBuddies`: `requireUser`, `getProgress` (lấy `totalCorrect`), `rpc("bin_mastered_counts")`, đọc `bin_buddies`; `eggsEarned(...)` → insert từng trứng mới bằng admin client với `start_correct = totalCorrect`, `name = defaultName` (`on conflict do nothing`). `newEggs` = các loài vừa thêm.
- `hatchBuddy`: loài phải có trứng, `hatchProgress.ready`; update `hatched_at = now()` (admin client, `where hatched_at is null`). Nếu người dùng chưa có bạn đồng hành nào → tự đặt bạn vừa nở làm `active`.
- `renameBuddy`: `{ species, name }`, tên qua `z.string().trim().min(1).max(20)`; chỉ bạn đã nở.
- `setActiveBuddy`: lưu vào pref mới `bin_buddy` (chỉ là lựa chọn hiển thị, để ở prefs như `bin_outfit`); phải là bạn đã nở hoặc `null` (không đi theo).

### 3.1.d Pref (`lib/validation.ts`)
```ts
/** Buddy that follows Bin around ("" = none). One of BUDDIES in lib/bin/buddies.ts, must be hatched. */
bin_buddy: z.string().max(20).optional(),
```
`DEFAULT_PREFS.bin_buddy = ""`.

### 3.1.e Test
- `tests/unit/bin-buddies.test.ts`: `eggsEarned` (24 từ zh → không có panda; 25 → có; đã có trứng → không cấp lại; `any` cộng en + zh); `hatchProgress` biên; `eggCondition` đúng chữ.
- `tests/db/bin.test.ts`: `bin_mastered_counts` chỉ đếm `review` + `scheduled_days >= 21` + recognize + không suspended; RLS `bin_buddies`.

---

## Bước 3.2 — Vẽ bạn nhỏ và trứng ✅

### 3.2.a `components/mascot/buddy.tsx` (tạo mới)
```ts
export function Buddy({ species, mood = "happy", size = 48, className }: {
  species: BuddySpecies; mood?: "happy" | "sleepy" | "cheer"; size?: number; className?: string;
}): JSX.Element
```
- SVG `viewBox="0 0 120 120"` **cùng phong cách Bin**: nét `var(--pup-ink)` dày ~5, đầu tròn, má hồng `var(--pup-blush)`, mắt là 2 chấm `var(--pup-feature)`.
- Màu từ token (thêm vào `globals.css` cả sáng/tối nếu cần, ưu tiên `color-mix` từ palette):
  - Miu: lông `--c-orange-soft`, sọc `--c-orange`, tai tam giác, ria 3 nét mỗi bên.
  - Panda: lông `--pup-fur`, mảng mắt/tai/tay `--pup-ink`, cầm một nhánh tre nhỏ `--c-mint`.
  - Vịt Quạc: thân `--c-sun-soft`, mỏ `--c-orange`.
  - Thỏ Bông: thân `--pup-fur`, tai dài trong tai `--c-pink-soft`.
- Mood: `happy` mắt chấm + miệng cười; `sleepy` mắt cung + chữ "z" nhỏ; `cheer` mắt cung ngược + tay giơ.
- Animation: **chỉ chớp mắt** dùng lại đúng cơ chế/keyframe chớp mắt của `pup.tsx` (đọc cách `pup.tsx` làm), lệch pha so với Bin (`animation-delay` khác). Reduced motion: không chớp.
- Ghi ngoại lệ vào `CLAUDE.md`: "bạn nhỏ chỉ chớp mắt, được phép lặp như Bin".

### 3.2.b `components/mascot/egg.tsx`
```ts
export function Egg({ species, progress, ready, size = 64, onTap }: {...})
```
- Trứng bầu dục, nền `TONE_CLASSES[tone]`-tương ứng qua token, có chấm hoa văn riêng từng loài (tai mèo nhô, chấm đen panda…).
- Vết nứt vẽ theo `progress` (0, ≥0.5, ≥0.9).
- `ready`: lắc nhẹ **một lần** khi khu Bạn nhỏ mở và mỗi lần được chạm (keyframe CSS 500ms, không lặp vô hạn; tắt khi reduced motion).
- Là `<button>` khi có `onTap`, `aria-label="Trứng của {tên}, chạm để ấp nở"`.

### 3.2.c Lab
`components/mascot/bin-lab.tsx` (`/dev-ui/bin`): thêm khối "Bạn nhỏ": 4 loài × 3 mood, 4 trứng × 3 mức nứt.

### Tiêu chí xong 3.2
Ảnh chụp lab sáng/tối; bạn nhỏ cạnh Bin trông cùng một bộ (nét, màu má, tỉ lệ đầu).

---

## Bước 3.3 — Ấp trứng và nở ✅

### 3.3.a Khu "Bạn nhỏ" trong Góc của Bin (`components/mascot/bin-buddies.tsx`)
- Thêm ô thứ 8 "Bạn nhỏ" (tone `coral`, icon `PawPrint`) như bảng ở 1.4.a; bấm → `panel = "buddies"`. Nếu có trứng `ready`, ô hiện chấm tròn nhỏ `bg-c-coral` ở góc (`aria-label` của ô thêm ", có trứng sắp nở").
- `panel === "buddies"`: danh sách thẻ 4 loài (`grid-cols-2`):
  - **locked**: hình bóng (`Buddy` với `className="opacity-25 grayscale"`), tên "???", điều kiện `eggCondition` + tiến độ "12/25".
  - **egg**: `Egg` + "Còn {need - done} câu đúng để nở" + thanh tiến độ. Khi `ready`: chữ "Sẵn sàng nở!", chạm trứng 3 lần để nở (mỗi lần trứng lắc + `haptic("light")`, lần 3 gọi `hatchBuddy`).
  - **hatched**: `Buddy` + tên (bấm vào tên để đổi, input inline, Enter lưu, Esc hủy) + nút "Đi cùng {name Bin}" / "Đang đi cùng" (`setActiveBuddy`).
- Khi mở khu này lần đầu gọi `syncBuddies()`.

### 3.3.b Hoạt cảnh nở
Dialog nhỏ toàn màn (dùng `Dialog` của `components/ui/dialog.tsx`):
1. Trứng to giữa màn, nứt dần (300ms) → vỡ đôi (hai nửa bay ra) → `Confetti`.
2. Bạn nhỏ xuất hiện mood `cheer`, Bin bên cạnh `dance`.
3. Chữ "Chào {defaultName}!" + ô đặt tên (điền sẵn tên mặc định) + nút "Xong".
Reduced motion: bỏ bay/confetti, chỉ fade từ trứng sang bạn nhỏ.

### 3.3.c Câu thoại (`lines.ts`)
```ts
eggNew: ["Có một quả trứng lạ trong phòng {name}!", "Ơ, quả trứng này của ai thế?"],
eggReady: ["Trứng đang động đậy kìa!", "Sắp nở rồi, chạm thử xem."],
hatched: ["Chào bạn mới!", "{name} có bạn rồi, vui quá."],
buddyHello: ["{name} và bạn nhỏ chào bạn.", "Hai đứa đang chờ bạn ôn bài."],
```

### Tiêu chí xong 3.3
Có thể đi hết vòng: trứng → đủ câu đúng → chạm 3 lần → hoạt cảnh → đặt tên → đi cùng.

---

## Bước 3.4 — Bạn nhỏ đi theo Bin ✅

Hiện bạn nhỏ đang `active` (pref `bin_buddy`, phải là bạn đã nở — kiểm tra lại ở server khi đọc; bạn chưa nở/không tồn tại → coi như không có):
1. **Phòng của Bin** (`BinRoom` thêm prop `buddy?: BuddySpecies | null`): đứng bên trái Bin, `bottom-[24px]`, size 64 (lg 84). Khi Bin đi dạo, bạn nhỏ **ở nhà** mood `sleepy` ngồi trên nệm.
2. **Today hero**: cạnh `PettablePup`, size 40 (desktop 56), lệch xuống dưới chân Bin. Chạm vào bạn nhỏ → mood `cheer` 1 giây + `playSfx("pop")`.
3. **Màn kết thúc** (`components/review/celebration.tsx` hoặc `session-gifts.tsx`, chỗ Bin hiện): bạn nhỏ mood `cheer` cạnh Bin.
4. **Không** hiện ở thanh tiến độ phiên học (quá nhỏ) và không hiện ở auth/404.
5. `MeProvider`/`useMe().prefs` đã có prefs ⇒ đọc `prefs.bin_buddy`. Server (Today) cần biết bạn đó đã nở: thêm `buddy: BuddySpecies | null` vào `Progress` (đọc `bin_buddies` theo pref, kiểm `hatched_at`).

---

## Bước 3.5 — Quà trứng ở màn kết thúc phiên ✅
- `loadSessionRewards` gọi logic của `syncBuddies` (tách hàm dùng chung trong `lib/data/bin.ts` để không gọi server action từ server action) và trả `newEggs`.
- `session-gifts.tsx`: thêm loại quà `"egg"` vào `Gift` (sau `"unlocks"`): `Egg` của loài mới + "Bạn nhận được một quả trứng!" + "Ấp đủ {hatchCorrect} câu đúng để nở." + nút "Xem trứng" mở Góc của Bin ở `panel="buddies"`.
- Khi trứng của bạn đã `ready` sau phiên (trước phiên chưa ready): quà `"eggReady"` "Trứng sắp nở rồi!" với cùng nút.

---

## Bước 3.6 — Admin, seed, tài liệu, kiểm tra cuối ✅
- `pet-panel.tsx`: danh sách bạn nhỏ (loài, tên, trạng thái, ngày nhận trứng/nở), bạn đang đi cùng.
- `scripts/seed-demo.mjs`: `demo@example.com` có Miu đã nở và đang đi cùng, trứng Panda đang ấp 20/30.
- `CLAUDE.md`: mục **"Bin 3.0 — Giai đoạn 3"**.
- E2E `tests/e2e/bin-buddies.spec.ts`:
  1. User có 25 thẻ zh `review` với `scheduled_days = 30` (dựng bằng admin client, theo cách `tests/db/push.test.ts` dựng thẻ) và `daily_stats.correct = 100`.
  2. Mở Góc của Bin → Bạn nhỏ → Panda là trứng, "Còn 30 câu đúng để nở".
  3. Cập nhật `daily_stats.correct = 130`, mở lại → "Sẵn sàng nở!" → chạm 3 lần → thấy "Chào Panda!" → đổi tên "Gấu" → Xong.
  4. "Đi cùng" → Today hiện bạn nhỏ cạnh Bin (kiểm tra bằng `aria-label` hoặc `data-testid="buddy"` thêm vào component).
- Chạy toàn bộ: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`, chụp ảnh đủ trang có Bin.

---

## Phụ lục A — Bảng tổng hợp file

| Loại | File | Bước |
|---|---|---|
| Migration | `supabase/migrations/20261030000014_bin_economy.sql` | 1.1, 1.2, 1.5 |
| Migration | `supabase/migrations/20261030000015_bin_companion.sql` | 2.2, 2.3 |
| Migration | `supabase/migrations/20261030000016_bin_buddies.sql` | 3.1 |
| Logic thuần | `lib/bin/catalog.ts`, `lib/bin/places.ts`, `lib/bin/trip.ts`, `lib/bin/buddies.ts`, `lib/mascot/session-talk.ts` | 1.2, 1.5, 3.1, 2.1 |
| Data (server-only) | `lib/data/bin.ts` | 1.5, 2.2, 3.5 |
| AI | `lib/ai/bin-story.ts`, `lib/ai/bin-greeting.ts`, thêm vào `lib/ai/prompts.ts`, `lib/ai/schemas.ts` | 1.6, 2.2 |
| Actions | `lib/actions/bin.ts` (sửa), `lib/actions/bin-trip.ts`, `lib/actions/bin-buddies.ts` | 1.1–3.5 |
| Component | `components/mascot/room-items.tsx`, `bin-room.tsx`, `bin-decor.tsx`, `bin-trip.tsx`, `postcard.tsx`, `landmarks.tsx`, `daily-greeting.tsx`, `buddy.tsx`, `egg.tsx`, `bin-buddies.tsx` | 1.3–3.4 |
| Sửa | `bin-home.tsx`, `bin-home-provider.tsx`, `bin-lab.tsx`, `session-bar.tsx`, `use-session-hud.ts`, `review-session.tsx`, `practice-session.tsx`, `learn-session.tsx`, `session-gifts.tsx`, `today/page.tsx`, `today-card.tsx`, `streak-week.tsx`, `mascot-prefs.tsx`, `lib/srs/streak.ts`, `lib/data/study.ts`, `lib/data/progress.ts`, `lib/data/groups.ts`, `lib/data/admin.ts`, `lib/admin-pet.ts`, `pet-panel.tsx`, `lib/progress.ts`, `lib/validation.ts`, `lib/mascot/lines.ts`, `app/globals.css`, `scripts/seed-demo.mjs`, `CLAUDE.md` | |
| Route | `app/(app)/bin/postcards/page.tsx`, (tùy chọn) `app/api/cron/bin-trips/route.ts` | 1.7 |
| Test | `tests/db/bin.test.ts`; `tests/unit/bin-catalog`, `bin-trip`, `bin-story`, `session-talk`, `bin-greeting`, `streak-freeze`, `bin-buddies`; `tests/e2e/bin-decor`, `bin-trip`, `bin-scarf`, `bin-buddies` | |

## Phụ lục B — Cân bằng xương (để chỉnh nếu thấy lệch)
- Người học đều (~30 câu đúng, 3 nhiệm vụ, 1 chuyến/ngày) ≈ 3 + 6 + 4.5 ≈ **13 xương/ngày**; cho ăn 1/ngày ⇒ dư ~12.
- ⇒ món rẻ (6–12) mua được mỗi ngày, món giữa (15–20) 2 ngày, món đắt (30–40) 3 ngày, khăn 20 ≈ 2 ngày.
- Tổng toàn bộ shop ≈ 330 xương ≈ 4 tuần học đều. Đây là chủ ý: đủ mục tiêu 1 tháng; sau đó có bưu thiếp, đồ chuyến đi và bạn nhỏ.
- Chỉnh giá **chỉ** trong `lib/bin/catalog.ts`; đổi phần thưởng chuyến đi chỉ trong `lib/bin/trip.ts`.

## Phụ lục C — Những chỗ dễ sai (agent đọc kỹ)
1. **Ngày học đổi lúc 04:00 theo múi giờ của user**, không phải 00:00 UTC. Dùng `studyDay()` (TS) / `public.study_day()` (SQL), không tự tính.
2. `getProgress` và `getStudySummary` bọc `cache()` của React: đừng gọi chúng sau khi vừa ghi dữ liệu trong cùng request rồi mong có số mới; tự tính lại hoặc trả số từ RPC.
3. Server action không gọi server action khác; dùng chung hàm trong `lib/data/*`.
4. Bảng `bin_*` client chỉ **đọc**; ghi bằng `createAdminClient()` **sau** `requireUser()`; tuyệt đối không nhận `userId` từ input.
5. PGlite (test DB) không có extension lạ: chỉ dùng SQL thường (`gen_random_uuid()` đã có vì migration cũ dùng).
6. Không để AI làm chậm trang: truyện viết trong `after()`, lời chào gọi từ client sau khi trang đã hiện.
7. Không hardcode "Bin": dùng `prefs.mascot_name` / `{name}`.
8. Mọi câu chữ mới: tiếng Việt có dấu, không emoji, câu ngắn, giọng nhẹ nhàng giống `LINES` hiện có.
9. Sau mỗi migration: cập nhật `lib/supabase/database.types.ts`, nếu không typecheck sẽ lỗi ở `rpc("bin_…")`.
10. Khi một bước quá lớn, chia commit nhỏ hơn nhưng **không** bỏ test của bước đó.
11. Icon lucide dùng trong plan: `Bone`, `Volleyball`, `Star`, `Shirt`, `Sofa`, `Footprints`, `Mail`, `PawPrint`, `Shield`, `Sparkles`, `ChevronLeft`, `Lock`. Nếu bản `lucide-react` trong repo thiếu icon nào, chọn icon gần nghĩa nhất và ghi lại trong `CLAUDE.md`.
12. Bảng `bin_items` có thể có `qty = 0` (khăn đã dùng hết). Khi tính đồ sở hữu cho phòng/shop, chỉ tính dòng `qty > 0`.
13. Bản chạy thử thuật toán `planFreezes` + `computeStreak` có khăn đã được kiểm tra khớp toàn bộ bảng ở 2.3.e; nếu kết quả của bạn khác bảng, sửa code, **không** sửa bảng.
