# PLAN TRIỂN KHAI: "Sổ Từ" – Web học & ôn từ vựng Anh / Trung dùng chung

> Tài liệu này dành cho **Claude Code**. Hãy đọc hết một lượt, sau đó làm theo **từng giai đoạn (Phase)** ở mục 14. Mỗi phase kết thúc bằng phần "Tiêu chí hoàn thành" — chỉ chuyển phase khi đạt hết. Commit sau mỗi phase.
>
> Ngôn ngữ giao diện: **tiếng Việt**. Code, tên biến, comment: tiếng Anh.

---

## 0. Hướng dẫn cho Claude Code (đọc trước)

1. **Bắt đầu bằng plan mode**: đọc toàn bộ file, đề xuất cấu trúc thư mục, hỏi lại chủ dự án nếu có điểm mâu thuẫn. Không tự ý đổi stack.
2. **Tạo `CLAUDE.md`** ở gốc repo, tóm tắt: stack, lệnh chạy, quy ước code, cấu trúc thư mục, link tới file plan này (lưu plan vào `docs/PLAN.md`).
3. **Skill nên dùng**:
   - `frontend-design` — **bắt buộc** khi làm bất kỳ màn hình/component nào. Tuân theo hệ thiết kế ở mục 12, không dùng giao diện template mặc định.
   - Nếu có skill test trình duyệt (Playwright / webapp-testing) thì dùng để tự chụp màn hình kiểm tra UI trên viewport điện thoại (390px) và desktop (1280px).
4. **Không hardcode secret**. Mọi key nằm trong biến môi trường (mục 13).
5. **Mobile-first**: người dùng ôn bài chủ yếu trên điện thoại.
6. Viết test cho phần logic quan trọng: thuật toán ôn tập, chuẩn hóa từ, parser nhập hàng loạt, schema AI.
7. Khi một thư viện có API khác với mô tả trong plan (do phiên bản mới), **ưu tiên tài liệu chính thức** của thư viện và ghi chú lại thay đổi.

---

## 1. Tổng quan sản phẩm

**Vấn đề**: Người học ghi từ vựng vào tập giấy, muốn ôn phải mở tập, không biết từ nào sắp quên, không chia sẻ được với bạn bè.

**Giải pháp**: Web app (PWA) cho phép:
- Lưu từ vựng **tiếng Anh** và **tiếng Trung** vào các bộ từ (deck).
- Gõ một từ → **AI tự điền** phiên âm/pinyin, loại từ, nghĩa, câu ví dụ có dịch, đồng/trái nghĩa, cụm từ, họ từ, chủ đề; **gợi ý ảnh minh họa** từ kho ảnh miễn phí.
- **Ôn tập thông minh** bằng thuật toán lặp lại ngắt quãng (FSRS): mỗi ngày web nói rõ cần ôn bao nhiêu từ.
- Nhiều kiểu luyện: flashcard, trắc nghiệm, gõ từ, nghe – chọn, và riêng tiếng Trung: luyện viết chữ Hán, luyện thanh điệu.
- **Dùng chung với bạn bè**: tài khoản riêng, chia sẻ bộ từ, nhóm học (lớp) có mã mời, bảng xếp hạng tuần.

**Người dùng mục tiêu**: Người Việt tự học, nhóm bạn học cùng nhau. Số lượng nhỏ–vừa (vài chục đến vài trăm người).

**Ngoài phạm vi (không làm ở bản đầu)**: app native, thanh toán, chat thời gian thực, ngôn ngữ thứ ba (nhưng thiết kế dữ liệu phải dễ thêm ngôn ngữ sau này, ví dụ tiếng Nhật/Hàn).

---

## 2. Stack công nghệ

| Lớp | Lựa chọn | Lý do |
|---|---|---|
| Framework | **Next.js** (bản ổn định mới nhất, App Router) + **TypeScript** strict | Chạy tốt nhất trên Vercel, Server Actions, Route Handlers |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix) — tùy biến lại theo mục 12 | Nhanh, accessible, tự sở hữu code component |
| Icon | `lucide-react` | |
| Database + Auth + Storage | **Supabase** (Postgres, Auth, Storage, Row Level Security) | Miễn phí cho quy mô nhỏ, RLS bảo vệ dữ liệu theo người dùng |
| Supabase client | `@supabase/ssr` + `@supabase/supabase-js` | Chuẩn cho Next.js App Router |
| Kiểu DB | Sinh type bằng `supabase gen types typescript` | Type-safe |
| AI | **Vercel AI SDK** (`ai`) + `@ai-sdk/anthropic`, dùng `generateObject` với schema **zod** | Đầu ra có cấu trúc, validate chặt |
| Model AI | Mặc định `claude-haiku-5-5` (rẻ, nhanh), cấu hình qua env `AI_MODEL` | |
| Ảnh minh họa | **Pexels API** (chính) + **Unsplash API** (dự phòng) | Miễn phí, ảnh chất lượng, có điều khoản ghi nguồn rõ ràng |
| Phát âm | **Web Speech API** (`speechSynthesis`) `en-US` / `zh-CN` | Miễn phí, không cần server |
| Thuật toán ôn tập | **`ts-fsrs`** (FSRS) | Chính xác hơn SM-2, có sẵn thư viện TS |
| Tiếng Trung | `pinyin-pro` (chuyển pinyin, kiểm tra thanh điệu), `hanzi-writer` (thứ tự nét + luyện viết), `opencc-js` (giản ↔ phồn) | |
| Form | `react-hook-form` + `zod` | |
| State phía client | TanStack Query (cho dữ liệu cần refetch/optimistic) — Server Components cho phần còn lại | |
| Biểu đồ thống kê | `recharts` | |
| Toast | `sonner` | |
| Test | `vitest` (unit), Playwright (E2E vài luồng chính) | |
| Lint/format | ESLint + Prettier | |
| PWA | `manifest.webmanifest` + service worker tối giản (cài lên màn hình chính, mở offline trang đã cache) | |
| Deploy | **Vercel** (Production + Preview cho mỗi PR) | |

Quản lý gói: `pnpm`.

---

## 3. Kiến trúc tổng thể

```
Trình duyệt (PWA, mobile-first)
   │
   ├── Server Components / Server Actions (Next.js trên Vercel)
   │      ├── Supabase (Postgres + RLS)  ← dữ liệu người dùng, deck, từ, tiến độ ôn
   │      ├── Supabase Storage           ← ảnh người dùng tự tải lên
   │      ├── Anthropic API (qua AI SDK) ← điền thông tin từ
   │      └── Pexels / Unsplash API      ← tìm ảnh minh họa
   │
   └── Client: speechSynthesis (đọc), hanzi-writer (vẽ chữ), ts-fsrs (tính lịch ôn — chạy cả client để phản hồi tức thì, server ghi nhận lại)
```

Nguyên tắc:
- **Mọi lời gọi API bên thứ ba (AI, ảnh) chạy phía server**, key không bao giờ xuống client.
- **Cache AI dùng chung**: kết quả tra một từ được lưu vào bảng `dictionary_cache`. Bạn A tra "resilient" rồi thì bạn B tra lại sẽ lấy từ cache, không tốn tiền AI.
- **Tách "nội dung từ" khỏi "tiến độ học"**: một từ thuộc về một deck (có thể nhiều người cùng học), còn tiến độ ôn là riêng từng người (`user_cards`).

---

## 4. Cấu trúc thư mục đề xuất

```
/app
  /(marketing)/page.tsx            # trang giới thiệu khi chưa đăng nhập
  /(auth)/login/page.tsx
  /(auth)/auth/callback/route.ts   # OAuth callback Supabase
  /(app)/layout.tsx                # khung app: thanh điều hướng dưới (mobile) / bên trái (desktop)
  /(app)/today/page.tsx            # "Hôm nay": số từ cần ôn, nút bắt đầu, streak
  /(app)/decks/page.tsx
  /(app)/decks/new/page.tsx
  /(app)/decks/[deckId]/page.tsx
  /(app)/decks/[deckId]/add/page.tsx
  /(app)/decks/[deckId]/import/page.tsx
  /(app)/decks/[deckId]/settings/page.tsx
  /(app)/words/[wordId]/page.tsx
  /(app)/words/[wordId]/edit/page.tsx
  /(app)/review/page.tsx           # phiên ôn SRS (?deck= tùy chọn)
  /(app)/practice/page.tsx         # chọn chế độ luyện
  /(app)/practice/[mode]/page.tsx  # quiz | typing | listening | writing | tones
  /(app)/groups/page.tsx
  /(app)/groups/[groupId]/page.tsx
  /(app)/explore/page.tsx          # bộ từ công khai
  /(app)/stats/page.tsx
  /(app)/settings/page.tsx
  /join/[code]/page.tsx            # vào nhóm bằng mã mời
  /d/[slug]/page.tsx               # xem bộ từ qua link chia sẻ
  /api/ai/enrich/route.ts
  /api/ai/enrich-batch/route.ts
  /api/images/search/route.ts
/components
  /ui                              # shadcn đã tùy biến
  /word                            # WordCard, WordForm, ExampleList, PosBadge, PronounceButton, ImagePicker
  /review                          # Flashcard, RatingBar, SessionProgress, SessionSummary
  /practice                        # QuizQuestion, TypingQuestion, ListeningQuestion, HanziWriterPad, ToneQuiz
  /zh                              # PinyinText (tô màu thanh điệu), HanziDisplay, StrokeOrder
  /deck, /group, /stats
/lib
  /supabase (server.ts, client.ts, middleware.ts)
  /ai (schemas.ts, prompts.ts, enrich.ts)
  /images (pexels.ts, unsplash.ts)
  /srs (fsrs.ts, queue.ts)
  /lang (normalize.ts, en.ts, zh.ts, registry.ts)
  /tts.ts
  /rate-limit.ts
  /import-parser.ts
/supabase
  /migrations/*.sql
  seed.sql
/docs/PLAN.md
/tests
```

---

## 5. Mô hình dữ liệu (Postgres / Supabase)

Viết thành migration trong `/supabase/migrations`. Dùng `uuid` (`gen_random_uuid()`), `timestamptz` mặc định `now()`.

### 5.1 Enum

```sql
create type lang_code as enum ('en', 'zh');
create type deck_visibility as enum ('private', 'group', 'public');
create type group_role as enum ('owner', 'member');
create type card_state as enum ('new', 'learning', 'review', 'relearning');
create type review_mode as enum ('flashcard', 'quiz', 'typing', 'listening', 'writing', 'tones');
```

### 5.2 Bảng

```sql
-- Hồ sơ người dùng (tạo tự động bằng trigger khi đăng ký)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null,
  avatar_url text,
  daily_new_limit int not null default 15,      -- số từ mới tối đa/ngày
  daily_review_limit int not null default 200,
  study_langs lang_code[] not null default '{en}',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now()
);

-- Nhóm học (lớp)
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references profiles on delete cascade,
  invite_code text unique not null,              -- 8 ký tự, không gồm ký tự dễ nhầm (0/O, 1/l)
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid references groups on delete cascade,
  user_id uuid references profiles on delete cascade,
  role group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Bộ từ
create table decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  name text not null,
  description text,
  language lang_code not null,
  visibility deck_visibility not null default 'private',
  group_id uuid references groups on delete set null,   -- bắt buộc khi visibility = 'group'
  share_slug text unique,                               -- link chia sẻ /d/[slug], null = tắt
  allow_member_edit boolean not null default false,     -- thành viên nhóm được thêm/sửa từ
  cloned_from uuid references decks on delete set null,
  word_count int not null default 0,                    -- cập nhật bằng trigger
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (visibility <> 'group' or group_id is not null)
);

-- Người dùng "theo học" deck của người khác (không cần sao chép)
create table deck_subscriptions (
  user_id uuid references profiles on delete cascade,
  deck_id uuid references decks on delete cascade,
  subscribed_at timestamptz not null default now(),
  primary key (user_id, deck_id)
);

-- Từ vựng
create table words (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks on delete cascade,
  created_by uuid not null references profiles on delete set null,
  language lang_code not null,
  term text not null,                 -- EN: "resilient" | ZH: "坚强" (giản thể)
  normalized text not null,           -- xem lib/lang/normalize.ts
  reading text,                       -- EN: IPA "/rɪˈzɪliənt/" | ZH: pinyin dấu "jiānqiáng"
  parts_of_speech text[] not null default '{}',   -- mã chuẩn hóa, xem mục 7.3
  meaning_vi text not null,
  meaning_en text,                    -- giải nghĩa ngắn bằng tiếng Anh (cả với từ tiếng Trung)
  examples jsonb not null default '[]',
  -- [{ "text": "...", "reading": "pinyin (chỉ zh)", "vi": "..." }]
  synonyms text[] not null default '{}',
  antonyms text[] not null default '{}',
  collocations jsonb not null default '[]',       -- [{ "text": "...", "vi": "..." }]
  word_family jsonb not null default '[]',        -- [{ "text": "resilience", "pos": "noun", "vi": "..." }]
  topic text,                                     -- chủ đề, ví dụ "Cảm xúc"
  emoji text,
  image_url text,
  image_source jsonb,  -- { provider: 'pexels'|'unsplash'|'upload', author, author_url, page_url, storage_path? }
  lang_extra jsonb not null default '{}',
  -- EN: { "cefr": "B2", "plural": "...", "verb_forms": {...}, "us_ipa": "...", "uk_ipa": "..." }
  -- ZH: { "traditional": "堅強", "pinyin_numbered": "jian1 qiang2", "hsk": { "level": 5, "version": "2.0" },
  --       "measure_words": [{ "char": "个", "pinyin": "gè" }], "characters": [{ "char": "坚", "meaning_vi": "...", "radical": "土" }] }
  personal_note text,                 -- ghi chú riêng (mẹo nhớ)
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deck_id, normalized)
);
create index on words (deck_id);
create index words_term_trgm on words using gin (term gin_trgm_ops);       -- cần extension pg_trgm
create index words_meaning_trgm on words using gin (meaning_vi gin_trgm_ops);

-- Tiến độ học của từng người với từng từ (FSRS)
create table user_cards (
  user_id uuid references profiles on delete cascade,
  word_id uuid references words on delete cascade,
  direction text not null default 'recognize',   -- 'recognize' (từ → nghĩa) | 'recall' (nghĩa → từ)
  state card_state not null default 'new',
  due timestamptz not null default now(),
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days int not null default 0,
  scheduled_days int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  last_review timestamptz,
  suspended boolean not null default false,       -- "tạm ẩn" từ này khỏi ôn tập
  primary key (user_id, word_id, direction)
);
create index on user_cards (user_id, due) where suspended = false;

-- Lịch sử ôn tập
create table review_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade,
  word_id uuid not null references words on delete cascade,
  direction text not null,
  mode review_mode not null,
  rating smallint not null check (rating between 1 and 4),  -- 1 Quên, 2 Khó, 3 Nhớ, 4 Dễ
  was_correct boolean,
  duration_ms int,
  state_before card_state not null,
  reviewed_at timestamptz not null default now()
);
create index on review_logs (user_id, reviewed_at desc);

-- Thống kê theo ngày (để tính streak và bảng xếp hạng nhanh)
create table daily_stats (
  user_id uuid references profiles on delete cascade,
  day date not null,                 -- theo timezone của người dùng
  reviews int not null default 0,
  correct int not null default 0,
  new_learned int not null default 0,
  words_added int not null default 0,
  xp int not null default 0,
  primary key (user_id, day)
);

-- Cache AI dùng chung giữa mọi người
create table dictionary_cache (
  language lang_code not null,
  normalized text not null,
  payload jsonb not null,            -- đúng schema zod ở mục 7
  model text not null,
  prompt_version int not null,
  hit_count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (language, normalized, prompt_version)
);

-- Hạn mức dùng AI
create table ai_usage (
  user_id uuid references profiles on delete cascade,
  day date not null,
  requests int not null default 0,
  primary key (user_id, day)
);
```

### 5.3 Trigger & hàm

- `handle_new_user()`: sau khi `auth.users` có bản ghi mới → tạo `profiles` (username sinh từ email, bỏ ký tự lạ, thêm số nếu trùng; display_name từ metadata Google).
- `words` insert/delete → cập nhật `decks.word_count`; mọi update → `updated_at = now()`.
- Hàm RPC `get_due_cards(p_deck_id uuid default null, p_limit int)` trả về danh sách thẻ đến hạn của `auth.uid()` + số thẻ mới được phép hôm nay (tôn trọng `daily_new_limit`, trừ đi số từ mới đã học hôm nay trong `daily_stats`).
- Hàm RPC `record_review(...)` (security definer, kiểm tra `auth.uid()`): trong **một transaction** cập nhật `user_cards`, chèn `review_logs`, cộng `daily_stats`. Client gửi trạng thái FSRS mới đã tính; server **tính lại bằng ts-fsrs trong Server Action** (không tin client) rồi gọi RPC.
- Hàm `ensure_user_cards(p_deck_id)`: tạo bản ghi `user_cards` trạng thái `new` cho mọi từ trong deck mà người dùng học (deck của mình, deck đã subscribe, deck nhóm). Gọi khi mở trang review hoặc khi subscribe.
- Hàm `weekly_leaderboard(p_group_id)`: tổng `xp` 7 ngày gần nhất của các thành viên.

### 5.4 Row Level Security (BẬT cho mọi bảng)

Định nghĩa hàm trợ giúp `is_group_member(gid uuid)` và `can_read_deck(did uuid)`, `can_edit_deck(did uuid)` (security definer, stable).

| Bảng | Đọc | Ghi |
|---|---|---|
| profiles | mọi người đã đăng nhập (chỉ cột công khai: username, display_name, avatar) | chính chủ |
| groups | thành viên nhóm | owner (sửa/xóa); ai cũng tạo được |
| group_members | thành viên cùng nhóm | tự tham gia qua RPC `join_group(code)`; owner xóa thành viên; tự rời nhóm |
| decks | owner; thành viên nhóm nếu `visibility='group'`; mọi người nếu `public` | owner |
| words | theo `can_read_deck` | `can_edit_deck` (owner, hoặc thành viên nhóm khi `allow_member_edit`) |
| deck_subscriptions | chính chủ | chính chủ, chỉ với deck đọc được |
| user_cards, review_logs, ai_usage | chính chủ | chỉ qua RPC/Server Action |
| daily_stats | chính chủ + thành viên cùng nhóm (cho bảng xếp hạng) | chỉ qua RPC |
| dictionary_cache | không cho client đọc trực tiếp | chỉ service role (server) |

Link chia sẻ `/d/[slug]`: đọc qua Server Component dùng service role, **chỉ** trả về deck có `share_slug` khớp; xem được không cần đăng nhập, muốn học thì phải đăng nhập rồi bấm "Học bộ này" (subscribe) hoặc "Sao chép về bộ của tôi" (clone).

Viết test SQL hoặc test tích hợp chứng minh: người A **không** đọc được deck private của B, không sửa được từ trong deck của B, không đọc được `user_cards` của B.

---

## 6. Xác thực & tài khoản

- Supabase Auth: **Google OAuth** + **Email magic link** (đăng nhập bằng link gửi mail, không cần mật khẩu).
- Middleware Next.js làm mới session (`@supabase/ssr`), chặn route nhóm `(app)` khi chưa đăng nhập → chuyển về `/login?next=...`.
- Lần đầu đăng nhập → màn hình **chào mừng** 2 bước: (1) đặt tên hiển thị + username, (2) chọn ngôn ngữ đang học (Anh / Trung / cả hai) và số từ mới mỗi ngày (5 / 10 / 15 / 20). Sau đó tạo sẵn 1 deck trống theo mỗi ngôn ngữ đã chọn ("Từ vựng tiếng Anh của tôi", "Từ vựng tiếng Trung của tôi").
- Trang Cài đặt: đổi tên, avatar (upload Storage bucket `avatars`), giới hạn từ mới/ngày, giọng đọc ưa thích (chọn trong danh sách giọng của trình duyệt cho từng ngôn ngữ), tốc độ đọc, xóa tài khoản (xóa toàn bộ dữ liệu), xuất dữ liệu (JSON/CSV).

---

## 7. Tính năng AI tự điền ("Gợi ý")

### 7.1 Luồng

1. Người dùng gõ từ vào ô "Từ" trong form thêm từ (deck đã có ngôn ngữ nên biết là Anh hay Trung).
2. Bấm **"Gợi ý"** (hoặc tự kích hoạt sau 600ms ngừng gõ nếu bật trong cài đặt — mặc định tắt để tiết kiệm).
3. Server Action / `POST /api/ai/enrich` với `{ language, term, context? }`:
   - Chuẩn hóa `term` → tìm trong `dictionary_cache` (theo `prompt_version` hiện tại). Có → trả về ngay, `hit_count++`, **không tính** vào hạn mức.
   - Không có → kiểm tra hạn mức (mục 7.6) → gọi AI bằng `generateObject` với schema zod → validate → lưu cache → trả về.
4. Form được điền sẵn, các trường do AI điền có viền/đánh dấu nhẹ "AI gợi ý" để người dùng biết cần xem lại. Người dùng sửa tùy ý rồi bấm **"Lưu từ"**.
5. Đồng thời gọi tìm ảnh (mục 8) bằng `image_query` AI trả về.

**Từ nhiều nghĩa**: AI trả về tối đa 3 `senses` (nghĩa). Form hiển thị các nghĩa dưới dạng lựa chọn; người dùng chọn 1 nghĩa chính (hoặc gộp). Lưu nghĩa đã chọn vào các cột chính. Tham số `context` (tùy chọn) cho phép người dùng gõ câu mình gặp từ đó để AI chọn đúng nghĩa.

**Lỗi chính tả**: nếu AI nhận thấy từ có vẻ sai chính tả, trả `did_you_mean` → hiện "Có phải bạn muốn gõ *receive*?" với nút áp dụng.

### 7.2 Schema zod (`lib/ai/schemas.ts`)

```ts
const Example = z.object({
  text: z.string(),                 // câu tiếng Anh hoặc tiếng Trung
  reading: z.string().optional(),   // pinyin của câu (chỉ zh)
  vi: z.string(),
});

const Sense = z.object({
  pos: z.array(PosCode),            // mã loại từ chuẩn hóa, xem 7.3
  meaning_vi: z.string(),           // ngắn gọn, 1–6 từ, cách nhau dấu phẩy nếu nhiều
  meaning_en: z.string(),           // giải nghĩa 1 câu, đơn giản
  examples: z.array(Example).min(2).max(3),
});

export const EnrichResultEN = z.object({
  is_valid_word: z.boolean(),
  did_you_mean: z.string().nullable(),
  lemma: z.string(),                // dạng gốc: "running" -> "run"
  ipa_us: z.string(), ipa_uk: z.string().nullable(),
  cefr: z.enum(['A1','A2','B1','B2','C1','C2']).nullable(),
  senses: z.array(Sense).min(1).max(3),
  synonyms: z.array(z.string()).max(6),
  antonyms: z.array(z.string()).max(4),
  collocations: z.array(z.object({ text: z.string(), vi: z.string() })).max(5),
  word_family: z.array(z.object({ text: z.string(), pos: PosCode, vi: z.string() })).max(6),
  verb_forms: z.object({ past: z.string(), past_participle: z.string(), ing: z.string(), third_person: z.string() }).nullable(),
  plural: z.string().nullable(),
  topic_vi: z.string(),             // chọn trong danh sách chủ đề chuẩn (7.4), hoặc "Khác"
  emoji: z.string(),                // 1 emoji
  image_query: z.string(),          // 1–3 từ tiếng Anh, cụ thể, dễ ra ảnh (từ trừu tượng -> cảnh minh họa)
  memory_tip_vi: z.string().nullable(), // mẹo nhớ ngắn (tùy chọn)
});

export const EnrichResultZH = z.object({
  is_valid_word: z.boolean(),
  did_you_mean: z.string().nullable(),
  simplified: z.string(),
  traditional: z.string(),
  pinyin: z.string(),               // có dấu thanh: "jiānqiáng"
  pinyin_numbered: z.string(),      // "jian1 qiang2"
  hsk: z.object({ level: z.number().int().min(1).max(9), version: z.enum(['2.0','3.0']) }).nullable(),
  senses: z.array(Sense).min(1).max(3),   // examples có reading = pinyin của câu
  measure_words: z.array(z.object({ char: z.string(), pinyin: z.string() })).max(3),
  characters: z.array(z.object({ char: z.string(), pinyin: z.string(), meaning_vi: z.string(), radical: z.string() })),
  synonyms: z.array(z.string()).max(6),
  antonyms: z.array(z.string()).max(4),
  collocations: z.array(z.object({ text: z.string(), reading: z.string(), vi: z.string() })).max(5),
  han_viet: z.string().nullable(),  // âm Hán Việt, ví dụ 坚强 -> "kiên cường" — RẤT hữu ích cho người Việt
  topic_vi: z.string(),
  emoji: z.string(),
  image_query: z.string(),          // tiếng Anh
  memory_tip_vi: z.string().nullable(),
});
```

**Kiểm tra lại sau AI (không tin tuyệt đối)**:
- ZH: dùng `pinyin-pro` sinh pinyin cho `simplified` và so với `pinyin` AI trả. Lệch → ưu tiên kết quả `pinyin-pro` cho từ đơn, giữ của AI nếu khác do đa âm (đánh dấu cần xem lại). Dùng `opencc-js` sinh `traditional` để đối chiếu.
- `emoji`: phải đúng 1 grapheme emoji, sai thì bỏ.
- Chuỗi rỗng → null.

### 7.3 Mã loại từ chuẩn (`PosCode`) và nhãn hiển thị

| Mã | Nhãn VI | Áp dụng |
|---|---|---|
| noun | Danh từ | en, zh |
| verb | Động từ | en, zh |
| adj | Tính từ | en, zh |
| adv | Trạng từ / Phó từ | en, zh |
| pron | Đại từ | en, zh |
| prep | Giới từ | en, zh |
| conj | Liên từ | en, zh |
| interj | Thán từ | en, zh |
| det | Hạn định từ | en |
| phrasal_verb | Cụm động từ | en |
| idiom | Thành ngữ | en, zh (成语) |
| phrase | Cụm từ | en, zh |
| measure | Lượng từ | zh |
| particle | Trợ từ | zh |
| num | Số từ | en, zh |

Mỗi loại có màu badge riêng (lấy từ bảng màu mục 12).

### 7.4 Chủ đề chuẩn (gợi ý, người dùng vẫn tạo được chủ đề riêng)

Gia đình, Nhà cửa, Ăn uống, Mua sắm, Du lịch, Giao thông, Công việc, Kinh doanh, Học tập, Công nghệ, Sức khỏe, Thể thao, Thiên nhiên, Thời tiết, Động vật, Cảm xúc, Tính cách, Ngoại hình, Thời gian, Xã hội, Văn hóa – Giải trí, Giao tiếp hằng ngày, Khác.

### 7.5 Prompt (`lib/ai/prompts.ts`) — có `PROMPT_VERSION` (số nguyên), tăng khi đổi prompt để cache cũ không dùng nữa

Hướng dẫn hệ thống (tóm tắt nội dung cần có):
- Vai trò: từ điển song ngữ cho người Việt học tiếng Anh/Trung.
- Nghĩa tiếng Việt phải tự nhiên, phổ biến, ngắn; không dịch máy móc.
- Câu ví dụ: ngắn (≤ 15 từ / ≤ 20 chữ Hán), đời thường, đúng trình độ của từ (từ A1 dùng câu dễ), có bản dịch tiếng Việt tự nhiên. Không dùng nội dung nhạy cảm.
- Tiếng Trung: mặc định **giản thể**, pinyin có dấu thanh chuẩn, có biến điệu thì ghi theo cách đọc chuẩn từ điển (không ghi biến điệu của 一/不).
- `image_query`: tiếng Anh, cụ thể, chụp được bằng ảnh thật ("resilient" → "tree growing through rock").
- Nếu không phải từ có thật → `is_valid_word=false`, gợi ý `did_you_mean`.
- Chỉ trả về JSON đúng schema.

Nhiệt độ thấp (0.2–0.3). Timeout 20s, retry 1 lần khi lỗi schema.

### 7.6 Hạn mức & chi phí

- Mỗi người: **100 lần gọi AI/ngày** (env `AI_DAILY_LIMIT_PER_USER`), cache hit không tính. Đếm trong `ai_usage` bằng câu lệnh `insert ... on conflict do update set requests = requests + 1 returning requests` (nguyên tử).
- Hết hạn mức → thông báo: "Bạn đã dùng hết lượt gợi ý hôm nay. Bạn vẫn có thể tự nhập, lượt gợi ý sẽ có lại vào ngày mai."
- Giới hạn tổng toàn hệ thống/ngày (env `AI_GLOBAL_DAILY_LIMIT`) để chủ dự án không bị bất ngờ hóa đơn.
- Log số token mỗi lần gọi (console, xem trên Vercel Logs).

### 7.7 Nhập hàng loạt (`/decks/[id]/import`)

- Ô textarea, mỗi dòng 1 từ. Hỗ trợ các dạng:
  - `apple` → chỉ có từ, AI điền hết
  - `apple - quả táo` / `apple: quả táo` / `apple = quả táo` / `apple\tquả táo` → giữ nghĩa người dùng ghi, AI điền phần còn lại và **không ghi đè nghĩa** đó
  - ZH: `苹果 - quả táo`, `苹果 píngguǒ quả táo`
- Hoặc tải file CSV (cột: term, meaning_vi, … tùy chọn) / dán từ Excel (tab).
- Parser (`lib/import-parser.ts`, có unit test) → bảng xem trước: dòng hợp lệ, dòng trùng (đã có trong deck), dòng lỗi.
- Bấm "Điền tự động & thêm": gọi `/api/ai/enrich-batch` theo lô 10 từ, chạy song song tối đa 3 lô, thanh tiến độ, từ nào lỗi thì đánh dấu để thử lại riêng. Tối đa 100 từ mỗi lần nhập.
- **Nhập từ ảnh chụp trang vở** (Phase 6): tải ảnh lên → AI (model có thị giác) đọc chữ viết tay → ra danh sách dạng text như trên → người dùng sửa trong textarea → tiếp tục như nhập thường.

---

## 8. Ảnh minh họa

### 8.1 Gợi ý ảnh tự động
- `GET /api/images/search?q=<image_query>&lang=...` (server):
  - Gọi **Pexels** `GET https://api.pexels.com/v1/search?query=...&per_page=8&orientation=square` header `Authorization: <PEXELS_API_KEY>`.
  - Không đủ kết quả → gọi **Unsplash** `GET https://api.unsplash.com/search/photos?query=...&per_page=8` với `client_id`.
  - Chuẩn hóa về `{ id, provider, thumb_url, url, author, author_url, page_url, download_location? }`.
  - Cache response 7 ngày (Next.js `fetch` revalidate hoặc bảng cache nhỏ), vì API miễn phí có giới hạn số lượt/giờ.
- UI `ImagePicker`: lưới 2×4 ảnh thu nhỏ, chọn 1 ảnh, nút "Tìm ảnh khác" (ô nhập từ khóa sửa được), "Không dùng ảnh", "Tải ảnh của tôi lên".
- Khi lưu: lưu `image_url` (URL ảnh cỡ vừa của nhà cung cấp) + `image_source` (tác giả, link). **Bắt buộc hiển thị ghi nguồn** nhỏ dưới ảnh ("Ảnh: Tên tác giả / Pexels"). Với Unsplash phải gọi `download_location` khi người dùng chọn ảnh (theo điều khoản API).
- Cấu hình `next.config` `images.remotePatterns` cho `images.pexels.com`, `images.unsplash.com`, domain Supabase Storage.

### 8.2 Ảnh tự tải lên
- Bucket Supabase Storage `word-images` (đường dẫn `{user_id}/{uuid}.webp`). Nén/resize phía client về tối đa 800px, WebP, < 300KB trước khi tải lên. Hỗ trợ chụp trực tiếp bằng camera trên điện thoại (`<input accept="image/*" capture>`).
- Policy Storage: ai đọc được deck thì xem được ảnh; chỉ người tải lên được xóa.

### 8.3 Không có ảnh
- Hiển thị emoji AI gợi ý trên nền màu nhạt theo loại từ.

---

## 9. Phát âm (TTS)

- `lib/tts.ts`: hàm `speak(text, lang: 'en'|'zh', opts)` dùng `speechSynthesis`, `lang` = `en-US` / `zh-CN`, chọn giọng theo cài đặt người dùng, tốc độ 0.6 / 0.85 / 1.0.
- Danh sách giọng nạp bất đồng bộ (`voiceschanged`) — xử lý đúng trên Safari iOS.
- Nếu máy không có giọng `zh-CN` → hiện hướng dẫn ngắn cách cài giọng tiếng Trung trên iOS/Android/Windows, nút đọc bị làm mờ kèm tooltip.
- Nút 🔊 có ở: từ, từng câu ví dụ, cụm từ. Phím tắt khi ôn trên desktop: `R` đọc lại.
- (Phase 6, tùy chọn) TTS server chất lượng cao, cache file âm thanh vào Storage.

---

## 10. Ôn tập & luyện tập

### 10.1 Thuật toán FSRS (`lib/srs`)
- Dùng `ts-fsrs` với tham số mặc định, `request_retention = 0.9`, bật fuzz.
- Mỗi từ có 2 hướng thẻ: **recognize** (thấy từ → nhớ nghĩa) bật mặc định; **recall** (thấy nghĩa → nhớ từ) mở khóa sau khi recognize đạt trạng thái `review` (người dùng có thể tắt trong cài đặt deck).
- 4 mức đánh giá, nhãn tiếng Việt: **Quên** (Again) · **Khó** (Hard) · **Nhớ** (Good) · **Dễ** (Easy). Dưới mỗi nút hiện khoảng thời gian tiếp theo ("10 phút", "2 ngày") tính sẵn bằng `ts-fsrs`.
- Hàng đợi phiên ôn (`lib/srs/queue.ts`): thẻ quá hạn (cũ nhất trước) → thẻ đang learning đến hạn trong phiên → thẻ mới (giới hạn theo ngày). Thẻ "Quên" được đưa lại cuối hàng đợi trong cùng phiên. Viết unit test cho queue.
- "Ngày" tính theo timezone người dùng, mốc qua ngày lúc 4:00 sáng (như Anki) để học khuya không bị tính sang ngày mới.

### 10.2 Trang "Hôm nay" (`/today`) — trang chủ sau đăng nhập
- Con số lớn: **số từ cần ôn hôm nay** + số từ mới sẽ học, tách theo ngôn ngữ (🇬🇧 / 🇨🇳) nếu học cả hai.
- Nút chính: **"Bắt đầu ôn"**. Phụ: "Thêm từ", "Luyện tập".
- Streak (chuỗi ngày), mục tiêu ngày (thanh tiến độ), lịch nhiệt 12 tuần (giống GitHub) — đặt bên dưới, không chiếm phần đầu.
- Trạng thái trống: "Chưa có từ nào cần ôn. Thêm từ đầu tiên của bạn" + nút.
- Hết bài: "Bạn đã ôn xong hôm nay. Ngày mai có X từ cần ôn."

### 10.3 Phiên ôn (`/review`)
- Toàn màn hình, tối giản. Thanh tiến độ trên cùng, nút thoát.
- **Mặt trước** (recognize): từ (cỡ rất lớn), phiên âm/pinyin, nút đọc, ảnh/emoji (tùy chọn ẩn ảnh trong cài đặt để tránh "nhớ ảnh không nhớ từ"). Tiếng Trung: có tùy chọn ẩn pinyin ở mặt trước để luyện đọc chữ.
- Chạm / phím `Space` → lật thẻ (animation lật ngắn, tôn trọng `prefers-reduced-motion`).
- **Mặt sau**: nghĩa VI, loại từ, 1–2 câu ví dụ có dịch, Hán Việt (zh), ghi chú riêng. Link "Xem chi tiết".
- 4 nút đánh giá, phím tắt `1 2 3 4`. Trên mobile: nút to ở vùng ngón cái.
- Tự động đọc từ khi lật (bật/tắt trong cài đặt).
- Ghi kết quả: cập nhật lạc quan ở client, gửi Server Action nền; lỗi mạng → xếp hàng gửi lại (lưu tạm IndexedDB), không làm gián đoạn phiên.
- Kết thúc: tóm tắt (số thẻ, % nhớ, thời gian, XP nhận được), danh sách từ đã "Quên" để xem lại.

### 10.4 Các chế độ luyện tập (`/practice/[mode]`) — không ảnh hưởng lịch FSRS trừ khi bật "tính vào ôn tập"
Chọn deck + số câu (10/20/30) + nguồn từ (tất cả / đến hạn / hay quên nhất / mới thêm).

| Mode | Mô tả | Ngôn ngữ |
|---|---|---|
| `quiz` | Trắc nghiệm 4 đáp án: từ → nghĩa hoặc nghĩa → từ (ngẫu nhiên). Đáp án nhiễu lấy từ cùng deck, ưu tiên cùng loại từ/chủ đề | en, zh |
| `typing` | Hiện nghĩa (+ ảnh), gõ lại từ. EN: so sánh không phân biệt hoa thường, cho phép sai 1 ký tự với từ ≥ 6 chữ ("gần đúng"). ZH: gõ pinyin (chấp nhận có/không dấu, số thanh) hoặc chữ Hán | en, zh |
| `listening` | Nghe đọc từ → chọn từ đúng / gõ lại | en, zh |
| `cloze` | Câu ví dụ bị che từ, chọn/gõ từ còn thiếu | en, zh |
| `writing` | Luyện viết chữ Hán bằng `hanzi-writer` quiz mode: viết từng nét trên khung, sai nét thì gợi ý | zh |
| `tones` | Nghe từ → chọn đúng tổ hợp thanh điệu (ví dụ "1-2", "3-4") | zh |
| `learn` | Học theo vòng 7 từ: trắc nghiệm → gõ từ, sai thì hỏi lại cuối vòng, tới khi thuộc hết. Tiến độ lưu trên máy (xem docs/PLAN-study-games.md) | en, zh |
| `test` | Bài kiểm tra trộn trắc nghiệm / đúng-sai / gõ từ / điền từ, chấm điểm khi nộp, làm lại câu sai | en, zh |
| `match` | Ghép 6 cặp từ–nghĩa mỗi bảng, tính giờ (+1 giây mỗi lần sai), kỷ lục theo bộ từ. Không ghi `review_logs` | en, zh |

Kết quả luyện tập ghi `review_logs` với `mode` tương ứng (rating suy ra: đúng = 3, sai = 1) và cộng XP.

### 10.5 XP & streak
- XP: mỗi thẻ ôn = 1, đúng ở chế độ luyện = 1, thêm từ mới = 2, hoàn thành mục tiêu ngày = 10.
- Streak: số ngày liên tiếp có ≥ 1 lượt ôn. Có 1 "ngày nghỉ" miễn phí mỗi tuần (không mất streak) — hiển thị rõ.

---

## 11. Quản lý từ vựng & dùng chung

### 11.1 Bộ từ (`/decks`)
- Danh sách deck của tôi + deck đang theo học + deck của nhóm, lọc theo ngôn ngữ.
- Mỗi deck: tên, ngôn ngữ (cờ), số từ, số từ cần ôn, người tạo (nếu không phải mình).
- Tạo deck: tên, mô tả, ngôn ngữ, chế độ hiển thị (Riêng tư / Nhóm / Công khai).

### 11.2 Trang deck (`/decks/[id]`)
- Ô tìm kiếm (theo từ, nghĩa, pinyin không dấu), lọc: chủ đề, loại từ, trạng thái học (mới / đang học / đã thuộc / hay quên), HSK/CEFR. Sắp xếp: mới thêm, A–Z, hay quên nhất.
- Hiển thị danh sách dạng hàng gọn (từ – phiên âm – nghĩa – chấm trạng thái), chạm để mở chi tiết. Có chế độ xem dạng lưới thẻ có ảnh.
- Thao tác hàng loạt: chọn nhiều → chuyển deck, đổi chủ đề, tạm ẩn khỏi ôn, xóa.
- Nút: Thêm từ, Nhập hàng loạt, Ôn deck này, Luyện tập, Chia sẻ, Cài đặt deck, Xuất CSV.
- Phân trang vô hạn (cursor), deck có thể tới vài nghìn từ.

### 11.3 Trang chi tiết từ (`/words/[id]`)
- Từ lớn + phiên âm + 🔊; EN: IPA Mỹ/Anh, CEFR; ZH: phồn thể, Hán Việt, HSK, **pinyin tô màu theo thanh điệu**, lượng từ.
- Ảnh (kèm ghi nguồn), nghĩa VI + giải nghĩa EN, loại từ, câu ví dụ (có nút đọc từng câu), cụm từ, đồng/trái nghĩa (chạm vào → nếu chưa có trong deck thì gợi ý "Thêm từ này"), họ từ / dạng động từ.
- ZH: khối **"Từng chữ"**: mỗi chữ Hán có hoạt ảnh thứ tự nét (`hanzi-writer`), bộ thủ, nghĩa, pinyin; nút "Luyện viết".
- Ghi chú riêng (mẹo nhớ), lịch sử ôn (lần ôn gần nhất, lần tới, số lần quên).
- Sửa / xóa (nếu có quyền).

### 11.4 Form thêm/sửa từ
- Trường bắt buộc: **Từ**, **Nghĩa tiếng Việt**. Mọi trường khác tùy chọn, gom trong phần "Thêm chi tiết" có thể mở rộng.
- Nút "Gợi ý" cạnh ô Từ (mục 7). Trạng thái loading hiển thị khung xương ở các trường sẽ được điền.
- Cảnh báo trùng ngay khi gõ: "Từ này đã có trong bộ *Tên deck*" + link.
- Sau khi lưu: toast "Đã lưu *resilient*", form reset, con trỏ quay lại ô Từ để thêm liên tục (luồng nhanh như ghi vở).
- Câu ví dụ / cụm từ: danh sách thêm/xóa/sắp xếp được.

### 11.5 Chia sẻ & nhóm
- **Chia sẻ deck bằng link**: bật "Chia sẻ bằng link" → sinh `share_slug` → copy link. Người nhận xem danh sách từ, bấm "Học bộ này" (subscribe — học trực tiếp, tự cập nhật khi chủ deck thêm từ) hoặc "Sao chép về bộ của tôi" (clone — bản riêng, sửa thoải mái).
- **Nhóm học** (`/groups`): tạo nhóm → mã mời 8 ký tự + link `/join/[code]` + mã QR. Trong nhóm:
  - Deck của nhóm (deck `visibility='group'`), thành viên tự động được học.
  - **Bảng xếp hạng tuần** theo XP (reset thứ Hai 0:00 giờ VN).
  - Hoạt động gần đây: "Lan vừa thêm 12 từ vào *IELTS Speaking*", "Minh đạt chuỗi 7 ngày" (lấy từ `daily_stats` + `words`, không cần bảng riêng ở bản đầu).
  - Owner: đổi tên, tạo lại mã mời, xóa thành viên, bật cho thành viên sửa deck.
- **Khám phá** (`/explore`): deck công khai, lọc theo ngôn ngữ, tìm theo tên, sắp xếp theo số người học.

---

## 12. Hệ thiết kế giao diện (dùng cùng skill `frontend-design`)

### 12.1 Ý tưởng
Sản phẩm sinh ra để **thay cuốn tập ghi từ vựng**, nên ngôn ngữ thiết kế lấy cảm hứng từ **trang vở kẻ ô li của học sinh Việt Nam**: giấy trắng hơi xanh, mực xanh, **đường lề đỏ** dọc bên trái, và **bút dạ quang vàng** để đánh dấu những gì cần chú ý. Không phải phong cách "giấy cũ màu kem" — đây là cuốn vở mới, sạch, sáng.

Điểm nhấn duy nhất (chi tiết đáng nhớ): **đường lề đỏ** chạy dọc mép trái của mọi thẻ từ và màn hình ôn tập — giống lề vở. Mọi thứ khác giữ yên tĩnh, kỷ luật.

### 12.2 Màu (CSS variables, có chế độ tối)

| Token | Sáng | Tối | Dùng cho |
|---|---|---|---|
| `--paper` | `#F7F9FC` | `#14171F` | Nền trang |
| `--surface` | `#FFFFFF` | `#1C2029` | Thẻ, sheet |
| `--ink` | `#1E2A4A` | `#E6EAF2` | Chữ chính (mực xanh đậm, không dùng đen) |
| `--ink-soft` | `#5B6785` | `#9AA4BC` | Chữ phụ, phiên âm |
| `--ink-blue` | `#2F5BD3` | `#7C9BF0` | Màu chủ đạo: nút chính, link, tiếng Anh |
| `--margin-red` | `#E0484E` | `#F07378` | Đường lề, nút "Quên", lỗi |
| `--highlight` | `#FFE45C` | `#C9A93A` | Đánh dấu: số từ cần ôn, từ đến hạn |
| `--jade` | `#178A6A` | `#4CC4A0` | Tiếng Trung, trạng thái "đã thuộc", đúng |
| `--rule` | `#DCE3F0` | `#2A303D` | Đường kẻ dòng, viền |

Màu thanh điệu pinyin (quy ước phổ biến, đủ tương phản trên nền sáng và tối): thanh 1 `#D93A3A`, thanh 2 `#E08A00`, thanh 3 `#2E9E4F`, thanh 4 `#2F5BD3`, thanh nhẹ `--ink-soft`. Cho phép tắt tô màu trong cài đặt; thanh điệu luôn kèm dấu nên không phụ thuộc chỉ vào màu.

Đảm bảo tương phản WCAG AA cho mọi cặp chữ/nền.

### 12.3 Chữ
- **Be Vietnam Pro** (Google Fonts) — toàn bộ giao diện. Font được thiết kế cho tiếng Việt, dấu đẹp. Trọng lượng 400 / 500 / 700.
- **Noto Serif SC** — hiển thị chữ Hán cỡ lớn (từ ở thẻ ôn, trang chi tiết). Chữ Hán cỡ nhỏ trong danh sách dùng **Noto Sans SC**.
- **Noto Sans** (có ký tự IPA) cho phiên âm IPA — kiểm tra hiển thị đúng `ɪ ə ʊ ʃ ʒ θ ð ŋ ˈ ˌ`.
- Thang chữ (rem): 0.8125 / 0.9375 / 1.0625 (body) / 1.3125 / 1.75 / 2.5 / 4 (từ trên thẻ ôn, chữ Hán dùng 5).
- Từ vựng trên thẻ ôn là phần tử hình ảnh chính: rất lớn, nằm trên **một đường kẻ dòng** như chữ viết trên vở.
- Tránh: chữ IN HOA cho nhãn, nhãn nhỏ thừa phía trên tiêu đề, tô màu riêng một chữ trong tiêu đề.

### 12.4 Bố cục
- **Mobile**: thanh điều hướng dưới với 4 mục: Hôm nay · Bộ từ · Luyện tập · Nhóm. Nút nổi "＋ Thêm từ" (FAB) ở góc phải dưới trên các trang danh sách. Cài đặt/Thống kê vào qua avatar góc trên.
- **Desktop (≥ 1024px)**: thanh bên trái cố định, nội dung tối đa 960px, căn trái.
- Thẻ từ: nền `--surface`, viền `--rule` 1px, **đường lề đỏ 2px** cách mép trái 20px, bo góc 12px. Không đổ bóng mặc định; chỉ thẻ đang lật trong phiên ôn có bóng nhẹ.
- Danh sách từ: hàng có đường kẻ ngang `--rule` như dòng vở, không bọc từng hàng thành thẻ riêng.
- Phân cấp bo góc: nút 10px, thẻ 12px, sheet/dialog 20px (không bo đều một số cho mọi thứ).

```
Mobile – thẻ ôn (mặt trước)
┌──────────────────────────┐
│ ✕   ▓▓▓▓▓▓░░░░  12/40    │
│  ┃                       │
│  ┃      🌱 (ảnh)          │
│  ┃                       │
│  ┃   resilient           │  ← chữ 4rem, ngồi trên đường kẻ
│  ┃ ──────────────────    │
│  ┃   /rɪˈzɪliənt/  🔊    │
│  ┃                       │
│  ┃   Chạm để lật thẻ      │
│  ┃                       │
├──────────────────────────┤
│ [Quên] [Khó] [Nhớ] [Dễ]  │  ← hiện sau khi lật
└──────────────────────────┘
```

### 12.5 Chuyển động
- Chỉ một khoảnh khắc chuyển động đáng chú ý: **lật thẻ** (≈ 300ms) và hiệu ứng "gạch dạ quang" chạy qua con số "cần ôn hôm nay" khi vào trang Hôm nay lần đầu trong ngày.
- Các phản hồi hành động (mở sheet, xác nhận đúng/sai) ngắn gọn. Tôn trọng `prefers-reduced-motion` (bỏ lật 3D, dùng fade).
- Không thêm hiệu ứng trượt vào cho từng section, không hover-animation trên mọi thẻ.

### 12.6 Lời văn giao diện
- Tiếng Việt, câu ngắn, động từ rõ ràng, viết hoa chữ đầu câu.
- Nút nói đúng hành động: "Lưu từ", "Bắt đầu ôn", "Tạo nhóm", "Sao chép về bộ của tôi". Toast dùng lại đúng động từ đó: "Đã lưu từ", "Đã tạo nhóm".
- Lỗi nói rõ chuyện gì và cách sửa, không xin lỗi: "Không kết nối được. Kết quả ôn sẽ tự gửi lại khi có mạng."
- Trạng thái trống là lời mời hành động.

### 12.7 Chất lượng tối thiểu
Responsive từ 360px, focus bàn phím nhìn rõ (viền `--ink-blue` 2px), mọi nút icon có `aria-label`, vùng chạm ≥ 44px, chế độ tối theo hệ thống + công tắc thủ công, Lighthouse Accessibility ≥ 95.

---

## 13. Biến môi trường

`.env.example` (commit file này, **không** commit `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # chỉ dùng phía server
ANTHROPIC_API_KEY=
AI_MODEL=claude-haiku-5-5
AI_VISION_MODEL=claude-sonnet-5-5   # cho nhập từ ảnh chụp (Phase 6)
AI_DAILY_LIMIT_PER_USER=100
AI_GLOBAL_DAILY_LIMIT=3000
PEXELS_API_KEY=
UNSPLASH_ACCESS_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Validate env bằng zod khi khởi động (`lib/env.ts`), thiếu biến → báo lỗi rõ ràng.

---

## 14. Các giai đoạn triển khai

### Phase 0 — Khởi tạo dự án
- Tạo Next.js + TS + Tailwind + shadcn/ui, ESLint/Prettier, vitest, cấu trúc thư mục mục 4.
- Cấu hình font, CSS variables, theme sáng/tối (mục 12).
- Tạo `CLAUDE.md`, `docs/PLAN.md`, `.env.example`, `lib/env.ts`.
- Khởi tạo Supabase CLI (`supabase init`), chạy local bằng `supabase start`.

**Hoàn thành khi**: `pnpm dev` chạy, trang mẫu hiển thị đúng font/màu cả 2 chế độ, `pnpm lint` và `pnpm test` qua.

### Phase 1 — Database & đăng nhập
- Migration đầy đủ mục 5 (enum, bảng, index, extension `pg_trgm`, trigger, hàm RPC, RLS, Storage buckets + policy).
- Sinh type TS từ schema.
- Supabase Auth (Google + magic link), middleware, trang `/login`, callback, màn hình chào mừng, trang Cài đặt cơ bản.
- Test RLS (mục 5.4).

**Hoàn thành khi**: đăng ký/đăng nhập/đăng xuất được; profile tự tạo; test RLS chứng minh người dùng không đọc/sửa được dữ liệu riêng tư của nhau.

### Phase 2 — Deck & từ vựng (nhập tay)
- CRUD deck, trang danh sách deck, trang deck (tìm kiếm, lọc, sắp xếp, phân trang).
- Form thêm/sửa từ (không AI), kiểm tra trùng, luồng thêm liên tục.
- Trang chi tiết từ; `PronounceButton` (TTS); `PinyinText` tô màu thanh điệu; chuẩn hóa từ (`lib/lang/normalize.ts`: EN lowercase + trim + gộp khoảng trắng; ZH chuyển phồn → giản bằng opencc, bỏ khoảng trắng) có unit test.
- Upload ảnh tự chọn lên Storage.

**Hoàn thành khi**: thêm/sửa/xóa/tìm từ tiếng Anh và tiếng Trung trên điện thoại mượt; phát âm cả 2 ngôn ngữ chạy trên Chrome Android và Safari iOS.

### Phase 3 — AI tự điền & ảnh
- `lib/ai` (schema, prompt, enrich), cache `dictionary_cache`, hạn mức `ai_usage`, xử lý `did_you_mean`, chọn nghĩa khi nhiều nghĩa.
- Kiểm tra lại pinyin/phồn thể bằng `pinyin-pro`/`opencc-js`.
- API tìm ảnh Pexels/Unsplash, `ImagePicker`, ghi nguồn.
- Nhập hàng loạt (parser + preview + batch enrich + tiến độ).

**Hoàn thành khi**: gõ "resilient" hoặc "坚强" → trong ≤ 5 giây form điền đủ các trường + 8 ảnh gợi ý; tra lại cùng từ lấy từ cache (không tốn lượt); dán 30 dòng từ tập → nhập thành công, nghĩa người dùng ghi được giữ nguyên; parser có test cho mọi định dạng mục 7.7.

### Phase 4 — Ôn tập & luyện tập
- `lib/srs` (ts-fsrs, queue) + test; RPC `get_due_cards`, `record_review`, `ensure_user_cards`.
- Trang Hôm nay, phiên ôn, tóm tắt phiên, hàng đợi gửi lại khi mất mạng.
- Các chế độ luyện: quiz, typing, listening, cloze; riêng ZH: writing (hanzi-writer), tones.
- XP, streak, `daily_stats`, trang Thống kê (biểu đồ số lượt ôn 30 ngày, tỉ lệ nhớ, phân bố trạng thái thẻ, lịch nhiệt).

**Hoàn thành khi**: ôn 20 thẻ bằng bàn phím và cảm ứng không lỗi; lịch ôn tiếp theo hiển thị đúng dưới mỗi nút; tắt mạng giữa phiên rồi bật lại → kết quả vẫn được lưu; streak và XP đúng theo giờ Việt Nam (mốc 4:00 sáng).

### Phase 5 — Dùng chung với bạn bè
- Link chia sẻ deck, subscribe, clone.
- Nhóm: tạo, mã mời + QR, `/join/[code]`, deck nhóm, quyền sửa của thành viên, bảng xếp hạng tuần, hoạt động gần đây.
- Trang Khám phá deck công khai.

**Hoàn thành khi**: 2 tài khoản thử nghiệm: A tạo nhóm, B vào bằng link, B học được deck nhóm với tiến độ riêng, bảng xếp hạng hiển thị cả 2; B không xem được deck riêng tư của A.

### Phase 6 — Hoàn thiện & mở rộng
- PWA: manifest, icon, cài lên màn hình chính, service worker cache khung app.
- Nhập từ ảnh chụp trang vở (AI có thị giác).
- Xuất dữ liệu (CSV/JSON), xóa tài khoản.
- (Tùy chọn) TTS server chất lượng cao; nhắc ôn bằng Web Push.
- Kiểm tra Lighthouse (Performance ≥ 85 mobile, Accessibility ≥ 95), E2E Playwright cho 3 luồng: đăng nhập → thêm từ bằng AI → ôn tập.

### Phase 7 — Deploy lên Vercel
1. Tạo project Supabase (Cloud, region Singapore `ap-southeast-1` cho gần Việt Nam), chạy `supabase db push` để áp migration.
2. Supabase Auth: thêm Site URL và Redirect URLs (`https://<domain>/auth/callback`, cả domain preview của Vercel dạng wildcard). Bật Google provider (tạo OAuth Client trên Google Cloud Console, redirect URI là URL callback của Supabase).
3. Import repo GitHub vào Vercel, framework Next.js, region function **Singapore (`sin1`)**.
4. Khai báo toàn bộ biến môi trường mục 13 cho Production và Preview.
5. Tạo API key Pexels (pexels.com/api) và Unsplash (unsplash.com/developers).
6. Đặt hạn mức chi tiêu (spend limit) trên Anthropic Console.
7. Deploy, chạy checklist smoke test: đăng nhập Google, magic link, thêm từ có AI, tìm ảnh, ôn 5 thẻ, tạo nhóm, mở link mời bằng tài khoản khác.
8. Viết `docs/DEPLOY.md` hướng dẫn lại các bước trên cho chủ dự án (tiếng Việt, kèm ảnh chụp màn hình vị trí các nút cài đặt nếu có thể).

---

## 15. Bảo mật & vận hành

- RLS bật cho mọi bảng; `service_role` chỉ dùng trong code server (`server-only` package).
- Validate mọi input Server Action/API bằng zod; giới hạn độ dài (term ≤ 80 ký tự, ghi chú ≤ 1000).
- Chống lạm dụng: hạn mức AI, giới hạn tìm ảnh 60 lần/giờ/người, giới hạn tạo nhóm 10/người.
- Nội dung người dùng hiển thị bằng React (tự escape), không dùng `dangerouslySetInnerHTML`.
- Ảnh tải lên: kiểm tra MIME + kích thước phía server/policy.
- Header bảo mật cơ bản trong `next.config` (CSP cho phép domain Supabase, Pexels, Unsplash, Google Fonts, jsDelivr nếu `hanzi-writer` tải dữ liệu nét từ CDN — hoặc tự host dữ liệu nét trong `/public`).
- Sao lưu: Supabase có backup hằng ngày ở gói trả phí; ở gói miễn phí, thêm nút "Xuất toàn bộ dữ liệu" để người dùng tự lưu.

---

## 16. Mở rộng ngôn ngữ sau này

`lib/lang/registry.ts` định nghĩa mỗi ngôn ngữ một object: `{ code, label, flag, ttsLang, normalize(), readingLabel ('Phiên âm' | 'Pinyin'), enrichSchema, promptBuilder, extraFields component, practiceModes[] }`. UI và API đọc từ registry thay vì `if (lang === 'zh')` rải rác — thêm tiếng Nhật/Hàn chỉ cần thêm một mục registry + giá trị enum.

---

## 17. Checklist chấp nhận cuối cùng

- [ ] Đăng nhập Google & magic link chạy trên domain Vercel
- [ ] Thêm từ EN/ZH bằng AI, có câu ví dụ + dịch, loại từ, ảnh gợi ý, emoji
- [ ] Tiếng Trung có pinyin tô màu, phồn thể, Hán Việt, HSK, lượng từ, thứ tự nét
- [ ] Nhập hàng loạt từ văn bản dán vào
- [ ] Ôn tập FSRS, 4 mức đánh giá, hoạt động offline tạm thời
- [ ] Đủ chế độ luyện: quiz, typing, listening, cloze, writing (zh), tones (zh)
- [ ] Streak, XP, thống kê
- [ ] Chia sẻ deck bằng link, nhóm học có mã mời, bảng xếp hạng tuần
- [ ] RLS được kiểm thử
- [ ] Giao diện theo mục 12, mobile-first, chế độ tối, đạt Accessibility ≥ 95
- [ ] `docs/DEPLOY.md` đầy đủ
