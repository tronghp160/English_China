# Sổ Từ — V3 "Sống Động": Bin biết chơi, học như chơi game

> Plan cho Claude Code (Sonnet 5.5, effort high). Tiếp nối V2 (`docs/redesign-v2/REDESIGN_V2.md`, đã xong).
> V2 cho app **màu sắc**. V3 làm app **sống động**: có chuyển động, âm thanh, phần thưởng, Bin biết làm trò và tương tác được, các chế độ học có cảm giác như chơi game, trang đăng nhập/đăng ký làm lại hoàn toàn, mọi kích thước màn hình đều to, rõ, không lỗi.
> Giữ nguyên token màu, font, component primitives của V2. Không đổi schema DB, không thêm migration. Không đổi logic SRS/FSRS, server actions, route.

---

## 0. Cách làm việc (đọc trước — bắt buộc)

1. **Mỗi phiên làm đúng một phase** (§12). Đầu phase: đọc lại mục plan của phase đó và **mọi file được liệt kê** trước khi sửa. Cuối phase: dừng lại, báo cáo.
2. **Không tự "đơn giản hóa"** hay bỏ bước. Nếu một bước không làm được (thiếu dữ liệu, xung đột E2E), ghi rõ lý do vào báo cáo cuối phase và đề xuất cách khác — không lặng lẽ bỏ qua.
3. Sau mỗi phase chạy: `pnpm lint && pnpm typecheck && pnpm test`. Phase có nhãn **[E2E]** chạy thêm `pnpm test:e2e`.
4. Chụp ảnh (390px + 1280px, sáng + tối) các màn đã sửa bằng `scripts/screenshot.mjs`, lưu vào `docs/redesign-v3/after/`, tự xem lại bằng Read, sửa lỗi nhìn thấy được rồi mới commit.
5. Commit mỗi phase: `feat(v3): P<n> <tên phase>`.
6. Chuỗi trong `docs/redesign/e2e-strings.md` và cấu trúc ARIA ở đó **giữ nguyên**. Unit test `tests/unit/mascot.test.ts` phải pass (được thêm test mới, không được đổi tên mood hay hành vi `say()`).
7. Mọi animation phải tắt hoặc thu về trạng thái cuối khi `prefers-reduced-motion: reduce`. Mọi âm thanh tắt được.
8. Ký hiệu trong khung bố cục ASCII của plan (🔥 ⭐ 🔊 ✉ 🔒 👁 [✓]) chỉ là chỗ giữ cho icon lucide tương ứng (`Flame`, `Star`, `Volume2`, `Mail`, `Lock`, `Eye`, `Check`). **Không dùng emoji trong UI.**
9. Không hex thô trong component. Token mới thêm vào `app/globals.css` (cả light và dark), cặp chữ/nền mới thêm vào `scripts/contrast.mjs`.

---

### 0.1 Mockup tham chiếu (xem trước khi code phase liên quan)

`docs/redesign-v3/mockups/` có 6 màn, mỗi màn một `.png` (xem bằng Read) và một `.html` (màu, kích thước, bo góc chính xác):

| File | Màn | Phase |
|---|---|---|
| `01-login-desktop` | Đăng nhập desktop, Bin che mắt khi gõ mật khẩu | P5 |
| `02-signup-mobile` | Đăng ký mobile, Bin hé một mắt khi hiện mật khẩu, thanh độ mạnh | P5 |
| `03-answer-combo` | Trả lời đúng: combo, XP bay, sheet phản hồi có Bin | P6 |
| `04-learn-path` | Học: bản đồ chặng | P8 |
| `05-match` | Ghép thẻ đang chơi: đồng hồ, +1s, ô chọn/đúng/sai | P10 |
| `06-bin-home` | Góc của Bin: cảnh, tâm trạng, hành động, trang phục | P3 |

Kết quả phải trông giống mockup; khi plan và mockup lệch nhau về giao diện, theo mockup. Số liệu là dữ liệu mẫu. Không copy HTML vào app: dịch sang token và component. Hình Bin trong mockup là hướng dẫn tư thế (che mắt, hé mắt, nhảy, đeo kính) — vẽ lại trong `pup.tsx` theo §4.

## 1. Hiện trạng: các vấn đề cần sửa

Ghi lại từ ảnh `docs/redesign-v2/after/*`:

| # | Vấn đề | Màn | File |
|---|---|---|---|
| 1 | Panel xanh bên trái trống trơn, chỉ có 4 chip chữ rải rác, Bin nhỏ ở góc; form nhỏ, lọt thỏm giữa nền xám | Đăng nhập/đăng ký desktop | `components/auth/auth-card.tsx` |
| 2 | Nửa trên màn trống, form trơn, không có điểm nhấn | Đăng nhập/đăng ký mobile | như trên |
| 3 | Câu hỏi + 4 nút trắng, nửa trên màn trống, không phản hồi gì ngoài đổi màu | Học (learn) | `components/practice/learn-session.tsx`, `question-parts.tsx` |
| 4 | Một trang cuộn dài 10 câu; thanh "0/10 · Nộp bài" đè lên nội dung; không biết mình đang ở câu nào | Kiểm tra (test) | `components/practice/test-session.tsx` |
| 5 | Màn mở đầu trống trơn; thanh header bị thu hẹp lệch (khối nền nhạt chỉ rộng ~670px) | Ghép thẻ (match) | `components/practice/match-game.tsx` |
| 6 | Màn "đã ôn xong" trống, nhỏ | Ôn tập | `components/review/review-session.tsx` |
| 7 | Bin chỉ chớp mắt và vẫy đuôi; xoa đầu chỉ hiện 3 trái tim nhỏ | Toàn app | `components/mascot/*` |
| 8 | Hàng lọc bị tràn ngang, bị cắt chữ ("Mọi…"); nút FAB "Thêm từ" đè lên ô tìm kiếm và hàng lọc | Chi tiết bộ từ mobile | `app/(app)/decks/[deckId]/page.tsx`, `components/deck/deck-words.tsx`, `components/app-shell/fab.tsx` |
| 9 | Ô heatmap "ngày nghỉ" có gạch chéo trông như lỗi hiển thị | Hôm nay, Thống kê | `components/stats/heatmap.tsx` |
| 10 | Ô kỹ năng (Trắc nghiệm, Gõ từ, Nghe, Điền từ) nhỏ, chỉ có tên, nhìn chán | Luyện tập | `components/practice/practice-setup.tsx` |
| 11 | Chữ phụ 12–13px nhiều chỗ, trên desktop nhìn nhỏ; nội dung desktop chưa tận dụng chiều rộng | Toàn app | `app/globals.css`, các page |
| 12 | Bìa bộ từ ở trang chi tiết chỉ là một chữ cái "Đ" | Chi tiết bộ từ | `components/deck/deck-art.tsx` |

---

## 2. Mục tiêu V3

1. **Bin sống thật**: thở, nhìn theo con trỏ, ngáp, ngủ, nhảy, xoay vòng, nhảy múa, che mắt, ăn, bắt bóng, lăn ra cho gãi bụng. Có "Góc của Bin" để chơi, cho ăn, thay trang phục.
2. **Học như chơi game**: âm thanh, rung, combo, XP bay lên, cấp độ, nhiệm vụ hằng ngày, phần thưởng (xương cho Bin), màn kết thúc có từng bước "mở quà".
3. **Từng chế độ học có cá tính riêng**: Học có bản đồ chặng, Kiểm tra có điều hướng câu và bảng điểm, Ghép thẻ có đếm ngược, combo, huy chương, Lật thẻ/Ôn tập có chồng thẻ vuốt được.
4. **Đăng nhập/đăng ký đẹp và vui**: Bin che mắt khi gõ mật khẩu, nhìn theo khi gõ email, vui khi đăng nhập thành công.
5. **To, rõ, không lỗi** ở mọi kích thước: 320px → 1920px. Có test tự động chống tràn ngang.

---

## 3. Nền tảng kỹ thuật

### 3.1 Thư viện mới

- `motion` (thư viện motion.dev, trước đây là framer-motion; import từ `motion/react`). Dùng cho: kéo-vuốt thẻ, chuyển cảnh giữa câu hỏi (`AnimatePresence`), số đếm, hạt XP bay, chỉ báo tab trượt (`layoutId`).
  - Bọc app trong `<LazyMotion features={domMax} strict>` ở `components/providers.tsx`, dùng component `m.div` thay vì `motion.div` để giảm bundle.
  - `MotionConfig reducedMotion="user"` ở cùng chỗ.
- `canvas-confetti` đã có. Không thêm thư viện animation nào khác (không Lottie, không Rive).

### 3.2 Âm thanh — `lib/sfx.ts` (mới)

Tổng hợp bằng Web Audio API, **không dùng file âm thanh** (không lo bản quyền, không tải thêm).

```ts
type Sfx = "correct" | "wrong" | "combo" | "flip" | "pop" | "complete" | "levelUp" | "boop" | "bark" | "tick" | "whoosh" | "chomp";
export function playSfx(name: Sfx, opts?: { combo?: number }): void;
export function setSfxEnabled(on: boolean): void;   // đọc từ prefs
```
- Một `AudioContext` dùng chung, tạo lười ở lần tương tác đầu tiên (`pointerdown`/`keydown`), resume nếu bị suspend.
- Master gain 0.5. Envelope: attack 5ms, decay theo âm.
- Thiết kế âm:
  | Tên | Âm |
  |---|---|
  | correct | sine 660Hz 70ms rồi 990Hz 110ms (2 nốt đi lên, "ting-ting") |
  | wrong | triangle 240Hz trượt xuống 150Hz trong 200ms, gain thấp |
  | combo | arpeggio C5–E5–G5, combo ≥10 thêm C6; mỗi nốt 60ms |
  | flip | noise ngắn 40ms qua bandpass 1800Hz, gain 0.06 (tiếng lật giấy) |
  | pop | sine 500→900Hz 60ms |
  | complete | triangle C5 E5 G5 C6, mỗi nốt 110ms, nốt cuối ngân 300ms |
  | levelUp | complete + shimmer (sine 1568Hz rung nhẹ 400ms) |
  | boop | sine 420→620Hz 80ms (xoa đầu Bin) |
  | bark | 2 xung square 330→220Hz 70ms qua lowpass 1400Hz, cách nhau 90ms ("gâu gâu" dễ thương) |
  | tick | sine 1200Hz 20ms (đếm ngược) |
  | whoosh | noise 180ms bandpass quét 600→2400Hz (thẻ bay đi) |
  | chomp | 3 xung noise lowpass 400Hz 50ms (Bin ăn) |
- Tắt hẳn khi `navigator.webdriver === true` (để E2E yên lặng) hoặc pref `sound` = false.

### 3.3 Rung — `lib/haptics.ts` (mới)
`haptic("light" | "success" | "error" | "heavy")` → `navigator.vibrate?.(…)` (10 / [12,40,12] / [30,50,30] / 35). Chỉ chạy khi pref `haptics` bật và trình duyệt hỗ trợ.

### 3.4 Prefs mới (`lib/validation.ts` → `prefsSchema`, `DEFAULT_PREFS`)
```ts
sound: z.boolean().optional(),              // default true
haptics: z.boolean().optional(),            // default true
bin_outfit: z.string().max(20).optional(),  // default "none"
bin_treats_fed: z.number().int().min(0).optional(), // default 0, số xương đã cho ăn (tích lũy)
bin_last_fed: z.string().optional(),        // ngày học (YYYY-MM-DD) lần cho ăn gần nhất
quests_claimed: z.record(z.string(), z.array(z.string())).optional(), // { "2026-10-24": ["due","correct20"] }, chỉ giữ 7 ngày gần nhất khi ghi
```
Settings → mục "Âm thanh & rung" (2 switch, nút "Nghe thử"). Settings → "Linh vật": thêm chọn trang phục (lưới), giữ phần tên và bật/tắt.
Nhớ: `updatePrefs` chỉ lưu các key người dùng đặt (theo CLAUDE.md).

### 3.5 Tiến độ & phần thưởng — `lib/progress.ts` (mới, thuần, có unit test)

Dữ liệu lấy từ `daily_stats` (đã có cột `reviews`, `correct`, `new_learned`, `xp`). **Không migration.**

```ts
export function levelFromXp(totalXp: number): { level: number; xpInLevel: number; xpForNext: number; progress: number };
// Ngưỡng tích lũy: T(L) = 25 * L * (L - 1)  → L1:0, L2:50, L3:150, L4:300, L5:500, L10:2250, L20:9500

export function bonesAvailable(input: { totalCorrect: number; questsClaimedTotal: number; treatsFed: number }): number;
// earned = floor(totalCorrect / 10) + 2 * questsClaimedTotal; available = max(0, earned - treatsFed)

export type QuestId = "due" | "correct20" | "new5";
export function dailyQuests(today: { reviews: number; correct: number; new_learned: number; dueLeft: number }): Array<{ id: QuestId; title: string; progress: number; target: number; done: boolean }>;
// due:       "Ôn hết từ đến hạn"   done khi dueLeft === 0 && reviews > 0   (progress = reviews, target = reviews + dueLeft)
// correct20: "Trả lời đúng 20 câu" progress = correct, target 20
// new5:      "Học 5 từ mới"        progress = new_learned, target 5

export const OUTFITS: Array<{ id: string; name: string; unlock: { kind: "streak" | "level"; value: number } }>;
// none (luôn có) · scarf "Khăn quàng" streak 3 · bow "Nơ hồng" level 3 · glasses "Kính râm" streak 7
// cap "Mũ lưỡi trai" level 5 · party "Mũ tiệc" streak 14 · wizard "Mũ phù thủy" level 10 · crown "Vương miện" streak 30
export function unlockedOutfits(input: { longestStreak: number; level: number }): string[];

export const TRICKS: Array<{ id: BinAction; name: string; level: number }>;
// sit "Ngồi" 1 · spin "Xoay vòng" 2 · rollOver "Lăn tròn" 4 · dance "Nhảy múa" 6 · highFive "Đập tay" 8
```
- Server: thêm hàm đọc tổng (`sum(xp)`, `sum(correct)`) và hôm nay của user hiện tại vào `lib/data/` (dùng RLS client có sẵn). Tính streak dài nhất bằng `lib/srs/streak.ts` nếu đã có hàm; nếu chưa, viết thêm hàm thuần + test.
- Server action `claimQuest(id)`: kiểm tra lại điều kiện ở server rồi ghi `quests_claimed` vào prefs. Server action `feedBin()`: kiểm tra `bonesAvailable > 0` rồi tăng `bin_treats_fed`, đặt `bin_last_fed`. Validate input bằng zod.
- Unit test `tests/unit/progress.test.ts`: biên level (0, 49, 50, 149, 150, 2250), bones không âm, quests đủ 3 loại, unlock outfits.

### 3.6 Thành phần hiệu ứng dùng chung — `components/fx/*` (mới)

| Component | Việc |
|---|---|
| `CountUp` | Số đếm từ giá trị cũ → mới (600ms, ease-out); reduced motion → hiện ngay |
| `XpBurst` | "+1 XP" bay lên từ vị trí nút đáp án tới bộ đếm XP ở thanh trên (motion, 650ms), rồi bộ đếm nảy nhẹ |
| `ComboBadge` | Huy hiệu "Combo ×3" có ngọn lửa; xuất hiện ở 3, 5, 10, 15, 20…; nảy vào (spring), ở 10+ đổi sang màu `streak` và lửa lớn hơn |
| `Burst` | Vụ nổ hạt nhỏ (8–12 chấm màu palette) tại một điểm, 500ms, CSS thuần |
| `Confetti` | Bọc `canvas-confetti` (load động), preset `small` / `big` / `record` |
| `Shake` | Wrapper rung ngang khi `trigger` đổi |
| `PressScale` | Thêm hiệu ứng nhấn (scale .96 + spring nhả) cho phần tử bất kỳ |
| `Reveal` | Fade-up có stagger cho danh sách con khi mount lần đầu |

### 3.7 Kích thước & khả năng đọc (sửa §1 #11)

Trong `app/globals.css`:
- Mobile giữ base 16px. Từ `lg` (≥1024px) tăng thang chữ: `--text-xs: 0.875rem` (14px), `--text-sm: 1rem`, `--text-base: 1.0625rem`, `--text-lg: 1.25rem`, `--text-xl: 1.625rem`, `--text-2xl: 2.25rem`. Khai báo trong `@media (min-width: 64rem) { :root { … } }`.
- **Không chữ nào nhỏ hơn 13px**, trừ chữ trong badge. Chữ người dùng phải đọc (meta, mô tả) tối thiểu `text-sm`.
- Nút mặc định mobile 48px (`h-12`), desktop 44px. Nút chính trong màn học: `xl` (56px).
- Màn học trên desktop: cột giữa `max-w-2xl` (thay `max-w-xl`), thẻ và chữ to hơn (từ EN `text-5xl`, chữ Hán `text-7xl`), đáp án dạng lưới 2×2 từ `md`.
- Trang thường trên desktop: `max-w-6xl`, padding `px-8 xl:px-12`. Từ 1536px: `max-w-7xl`.

---

## 4. Bin 2.0 — bộ máy hoạt hình

### 4.1 Viết lại `components/mascot/pup.tsx`

Giữ hình dáng, viewBox `0 0 120 120`, token `--pup-*`, 10 mood và API cũ (`mood`, `size`, `animated`, `className`). Tách SVG thành các **nhóm có class** để animate từng bộ phận:

```
<svg class="bin" data-mood data-action data-outfit>
  <g class="bin-root">                 ← toàn thân (nhảy, xoay, lăn)
    <g class="bin-shadow">             ← bóng hình elip dưới chân (co lại khi nhảy)
    <g class="bin-tail">
    <g class="bin-body">               ← thân + vòng cổ + thẻ tên (thở)
      <g class="bin-paw-back">
    <g class="bin-head">               ← đầu (nghiêng, gật, lắc)
      <g class="bin-ear-l"> <g class="bin-ear-r">
      <g class="bin-face">
        <g class="bin-eyes"> <g class="bin-pupils"> ← con ngươi (nhìn theo)
        <g class="bin-brows">          ← mới: lông mày nhỏ cho biểu cảm
        <g class="bin-nose"> <g class="bin-mouth"> <g class="bin-tongue">
      <g class="bin-outfit-head">      ← mũ, kính, nơ, vương miện
    <g class="bin-outfit-neck">        ← khăn quàng
    <g class="bin-paw-front-l"> <g class="bin-paw-front-r"> ← mới: 2 chân trước (che mắt, đập tay, vẫy)
  <g class="bin-props">                ← xương, bóng, Zzz, tim, dấu ?, !
```
- Mỗi nhóm cần `transform-box: fill-box; transform-origin:` đúng điểm xoay (đầu: cổ; tai: gốc tai; đuôi: gốc đuôi; chân trước: vai).
- Nét viền tính theo size như cũ.
- Prop mới: `action?: BinAction`, `outfit?: string`, `look?: { x: number; y: number }` (−1..1), `onActionEnd?: () => void`.
- Export `BIN_ACTIONS` từ `lib/mascot/lines.ts` (giữ `PUP_MOODS`).

### 4.2 Trạng thái nghỉ (idle) — tự động khi `animated`

Đặt trong CSS (`app/globals.css`, nhóm `/* Bin */`):
| Chuyển động | Chi tiết |
|---|---|
| Thở | `.bin-body` scaleY 1 → 1.025, 3.2s, vô hạn |
| Chớp mắt | giữ `pup-blink` hiện có |
| Vẫy đuôi | giữ `pup-tail`, nhanh hơn khi vui |
| Vi chuyển động ngẫu nhiên | hook `useBinIdle` chọn ngẫu nhiên mỗi 6–14s một trong: giật tai (`ear-twitch` 400ms), nghiêng đầu (`head-tilt` 900ms), đánh hơi (`sniff` 600ms), ngáp (`yawn` 1.2s, chỉ sau 21h hoặc khi mood `sleepy`) |
| Ngủ | mood `sleepy` > 20s không tương tác → nhắm mắt, thở chậm 5s, chữ "z" bay lên lặp lại |

Chỉ chạy idle khi Bin đang trong viewport (`IntersectionObserver`) và tab đang hiện (`visibilitychange`), để không tốn pin.

### 4.3 Hành động (một lần) — `data-action`

Mỗi hành động là một keyframes CSS áp lên nhóm tương ứng, kích hoạt bằng `data-action` trên `<svg>`. Hook `useBinAction()` trả về `{ action, play(action), clear }`, tự xóa action ở `animationend` của `.bin-root` (hoặc theo timeout = thời lượng). Reduced motion: bỏ qua chuyển động, chỉ đổi mood tương ứng 800ms.

| BinAction | Thời lượng | Mô tả chuyển động | Mood đi kèm |
|---|---|---|---|
| `jump` | 600ms | root: lún xuống (scaleY .9) → bật lên −18 → rơi xuống, nảy (scaleY .92) → về; bóng co lại khi ở trên | cheer |
| `spin` | 700ms | root xoay 360° quanh tâm, có nhảy nhẹ | cheer |
| `dance` | 1.4s | root nghiêng trái phải ±10° ×4, đầu lắc lư ngược pha, đuôi vẫy nhanh, chân trước đưa lên xuống | cheer |
| `nod` | 500ms | đầu gật 2 lần (rotate 0→7→0) | happy |
| `shakeHead` | 520ms | đầu lắc ±9° ×3 | think |
| `droop` | 800ms | đầu cúi 4px, tai cụp xuống, giữ đến khi action khác | sad |
| `wave` | 900ms | chân trước phải đưa lên vẫy 3 lần | wave |
| `coverEyes` | 300ms rồi giữ | hai chân trước đưa lên che mắt; giữ nguyên tới khi đổi action | happy (má hồng đậm hơn) |
| `peek` | 300ms rồi giữ | từ `coverEyes`, chân trước phải hạ một nửa, lộ một mắt | wink |
| `eat` | 1.3s | cúi đầu, miệng nhai 3 lần (mouth scaleY), vụn xương rơi (`Burst` nhỏ màu kem), `playSfx("chomp")` | love |
| `catch` | 900ms | nhảy lên, miệng há, quả bóng (props) bay vào miệng, rơi xuống | cheer |
| `rollOver` | 1.4s | root xoay −90° nằm nghiêng, chân đạp đạp, rồi bật dậy | love |
| `sit` | 600ms | thân hạ 4px, đuôi quét đất | happy |
| `highFive` | 800ms | chân trước phải đưa thẳng lên, "bốp" (`Burst` vàng) | cheer |
| `surprised` | 450ms | nhảy nhỏ, tai dựng, mắt to | surprised |
| `bark` | 500ms | miệng mở 2 lần, bong bóng "Gâu!" nhỏ bay ra, `playSfx("bark")` | happy |
| `sniff` | 600ms | mũi nhấp nhô 4 lần | think |
| `yawn` | 1.2s | miệng mở to dần, mắt nhắm, đầu ngả | sleepy |

### 4.4 Nhìn theo — `useBinLook(ref)`
Trên thiết bị có chuột (`matchMedia("(pointer: fine)")`): theo `pointermove` (throttle bằng rAF), tính hướng từ tâm Bin tới con trỏ, dịch `.bin-pupils` tối đa 2.5 đơn vị viewBox, đầu nghiêng theo tối đa 4°. Trên cảm ứng: nhìn về phía điểm chạm cuối cùng 1.5s rồi về giữa. Có thể truyền `look` từ ngoài (ví dụ nhìn theo ô input ở trang đăng nhập).

### 4.5 Trang phục — lớp SVG chồng lên
Vẽ trong viewBox 120: `scarf` (khăn đỏ `c-coral` quanh cổ, có đuôi khăn bay nhẹ khi idle), `bow` (nơ hồng trên tai trái), `glasses` (kính râm đen gọng tròn trên mắt — khi đeo, mood `cool`), `cap` (mũ lưỡi trai xanh `primary`, lệch nhẹ), `party` (mũ chóp sọc vàng hồng), `wizard` (mũ tím có sao), `crown` (vương miện vàng `c-sun`, viền đậm). Mỗi món là component nhỏ trong `components/mascot/outfits.tsx`.

### 4.6 Màn xem trước cho dev
Trang `/_dev/bin` (chỉ khi `NODE_ENV !== "production"`): lưới tất cả mood × size 96, nút bấm cho từng action, chọn trang phục, bật/tắt reduced motion giả lập. Dùng để chụp ảnh kiểm tra.

### 4.7 Test
Giữ `tests/unit/mascot.test.ts`. Thêm `tests/unit/bin-actions.test.ts`: `BIN_ACTIONS` chứa đủ các action ở §4.3; mỗi action có thời lượng và mood map.

---

## 5. Tương tác với Bin

### 5.1 `PettablePup` nâng cấp (`components/mascot/pettable-pup.tsx`)
| Cử chỉ | Phản ứng |
|---|---|
| Chạm/click | `boop`, tim bay lên (giữ), mood love + action ngẫu nhiên nhẹ (`nod` / `wave` / `bark`), câu thoại từ `LINES.pet` |
| Chạm liên tục 5 lần trong 3s | `spin` + câu "Chóng mặt quá…" |
| Chạm 10 lần | `dance` + `Confetti small` + câu "Bạn là người bạn tốt nhất của {name}!" (một lần mỗi phiên) |
| Nhấn giữ 600ms (mobile) / giữ chuột | `rollOver` (gãi bụng), `boop` liên tục nhỏ |
| Rê chuột vào (desktop) | đầu nghiêng về phía con trỏ, đuôi vẫy nhanh hơn |
| Không tương tác 30s trên Today | `yawn` rồi ngủ (`sleepy`) đến khi có tương tác → `surprised` thức dậy |
Thêm câu thoại mới vào `lib/mascot/lines.ts` (không emoji): `spin`, `dance`, `wake`, `feed`, `noBone`, `play`, `outfit`, `trick`, `questDone`, `levelUp`, `combo`, `wrongComfort`, `idleSession`.

### 5.2 "Góc của Bin" (mới) — `components/mascot/bin-home.tsx`
Mở bằng: chạm Bin trên Today rồi chọn "Chơi với {name}" trong bong bóng, nút "Góc của {name}" ở thẻ Bin trên sidebar, mục trong user menu. Là `Sheet` từ dưới (mobile) / `Dialog` lớn (desktop), load động (`next/dynamic`).

Bố cục:
```
┌──────────────────────────────────────────┐
│ Góc của Bin                     [x]      │
│ Cấp 4  ▓▓▓▓▓▓░░░  120/150 XP             │
│                                          │
│   [nền: sàn gỗ + tấm thảm tròn màu       │
│    primary-soft, cửa sổ, bát ăn]         │
│            BIN (size 180, idle)          │
│                                          │
│ Tâm trạng: Vui vẻ ●●●●○                 │
│ Xương: 7                                 │
│ ┌────────┬────────┬────────┬────────┐   │
│ │Cho ăn  │Ném bóng│Làm trò │Trang   │   │
│ │(xương) │        │        │phục    │   │
│ └────────┴────────┴────────┴────────┘   │
└──────────────────────────────────────────┘
```
- **Cảnh nền**: SVG/CSS đơn giản, màu token (sàn `surface-2`, thảm `primary-soft`, cửa sổ `c-blue-soft`, bát `c-coral`). Ban đêm (sau 19h) cửa sổ chuyển màu tối có trăng.
- **Tâm trạng** (5 chấm, tính ở client): +2 nếu hôm nay đã học (`reviews > 0`), +1 nếu streak ≥ 3, +1 nếu đã cho ăn hôm nay, +1 nếu hoàn thành ≥ 2 nhiệm vụ. Mood Bin theo điểm: 0–1 sad, 2 sleepy (nếu tối) / think, 3 happy, 4–5 cheer.
- **Cho ăn**: desktop kéo khúc xương (`m.div drag`) thả vào Bin; mobile chạm nút. Còn xương → gọi `feedBin()` (optimistic), action `eat`, `+1 tâm trạng`, câu `LINES.feed`. Hết xương → Bin `droop` + câu "Học thêm 10 câu đúng để có xương nhé" + nút "Đi học".
- **Ném bóng**: chạm → quả bóng bay theo đường cong (motion keyframes) tới Bin, Bin `catch`; 20% trượt → Bin chạy theo ra khỏi khung rồi quay lại ngậm bóng (vui). Không cần xương.
- **Làm trò**: danh sách `TRICKS`; trò chưa đủ cấp hiện ổ khóa + "Mở ở cấp N". Chọn trò → Bin diễn.
- **Trang phục**: lưới các món; món khóa hiện điều kiện mở ("Chuỗi 7 ngày"). Chọn → lưu `bin_outfit`, Bin `spin` + câu khen. Trang phục hiện ở mọi nơi có Bin.

### 5.3 Bin trong phiên học (xem §7.1)

---

## 6. Hôm nay & khung app

### 6.1 Today (`app/(app)/today/page.tsx`)
- **Thanh cấp độ** dưới lời chào: chip "Cấp 4" (`xp-soft`), thanh XP mảnh `xp`, "120/150 XP". Chạm → mở Góc của Bin.
- **Hero**: Bin to hơn (desktop 120px, mobile 88px), tương tác được (PettablePup), mặc trang phục. Bong bóng thoại cạnh Bin đổi câu mỗi 15s nếu đang nhìn (fade), câu theo ngữ cảnh (`LINES.due`, `dueMany`, `done`…).
- **Nhiệm vụ hôm nay** (thẻ mới, cạnh streak trên desktop, dưới hero trên mobile), thay khối "Mục tiêu" nếu có:
  ```
  Nhiệm vụ hôm nay                     2/3
  [✓] Ôn hết từ đến hạn        ▓▓▓▓▓▓ xong
  [ ] Trả lời đúng 20 câu      ▓▓▓░░░ 12/20
  [ ] Học 5 từ mới             ▓░░░░░ 1/5
  [Rương: Nhận 2 xương]  ← nút hiện khi một nhiệm vụ xong mà chưa nhận
  ```
  Nhận thưởng: rương mở (scale + rung), xương bay vào chip "Xương" của Bin, `playSfx("levelUp")`, `Confetti small`. Gọi `claimQuest`.
- **Streak**: khi hôm nay đã học, ngọn lửa có hiệu ứng "bùng" một lần lúc tải trang (scale 1→1.25→1, lửa đổi sang vàng cam); ngày hôm nay có vòng sáng.
- **Heatmap** (§1 #9): bỏ ô gạch chéo; ngày nghỉ miễn phí hiện chấm tròn nhỏ `streak` giữa ô `surface-2`. Ô có tooltip "T6, 23/10: 34 lượt ôn".
- Thẻ bộ từ: hover nghiêng nhẹ 3D (rotateX/Y ≤ 4°, chỉ pointer fine), nút "Ôn" nhỏ hiện khi hover.
- Các khối bento dùng `Reveal` (stagger 50ms) lần đầu tải.

### 6.2 App shell
- Sidebar + bottom nav: chỉ báo tab active trượt bằng `layoutId` (spring), icon tab active nảy nhẹ khi chọn.
- Bottom nav: nút giữa "Ôn" nổi tròn 56px `primary` có badge số từ đến hạn (thay FAB ở các trang không có "Thêm từ" riêng). Không đè nội dung: mọi trang `(app)` có `pb-32` trên mobile.
- `fab.tsx` (§1 #8): chỉ hiện trên trang danh sách bộ từ và chi tiết bộ từ, đặt `bottom: calc(88px + env(safe-area-inset-bottom))`, **thu nhỏ thành nút tròn icon khi cuộn xuống** và ẩn khi bàn phím mở (`visualViewport` resize). Không bao giờ che ô tìm kiếm: ô tìm kiếm và hàng lọc nằm trong vùng có `scroll-margin` đủ.
- Sidebar: thẻ Bin ở đáy dùng `PettablePup` + nút "Góc của {name}" (ghost nhỏ) dưới nút "Ôn ngay".
- Chuyển trang: nội dung `main` fade-up 160ms (CSS `@starting-style` hoặc motion), tắt khi reduced motion.

### 6.3 Chi tiết bộ từ (§1 #8, #12)
- `deck-art.tsx`: thay chữ cái bằng **từ đầu tiên của bộ** (chữ Hán hoặc từ tiếng Anh) cỡ lớn màu `c-{color}-fg` trên nền `c-{color}-soft`, kèm 2–3 hình trang trí đơn giản (chấm tròn, vòng cung) màu cùng tông ở góc. Nếu bộ trống: icon `BookOpen`.
- Hàng lọc: một dòng cuộn ngang (`overflow-x-auto snap-x`), có fade mờ ở mép phải khi còn nội dung, các select thành chip `rounded-full h-10`; không bao giờ cắt chữ.
- Danh sách từ: hàng có hover, nút loa nhỏ phát âm ngay trong hàng, trạng thái thẻ dạng chip màu có chữ (Mới / Đang học / Đã thuộc / Hay quên) thay chấm tròn khó hiểu; legend ở cuối bỏ đi.

---

## 7. Phiên học: HUD chung

### 7.1 Thanh phiên (`components/review/session-bar.tsx`, dùng cho mọi mode)
```
[x]  ▓▓▓▓▓▓▓▓░░░░░░░░ (Bin chạy trên đầu thanh)   🔥×4   ⭐ 23   [🔊]
```
- Progress bar `h-3.5` với các **mốc** (25/50/75%): đi qua mốc → mốc lóe sáng + `pop`.
- Bin trên đầu thanh: idle thì chạy tại chỗ (chân nhấp nháy), đúng → `jump` nhỏ, sai → `droop` 1s.
- **Combo** (đúng liên tiếp): chip lửa `ComboBadge`, hiện từ 3. Mốc 5/10/20: banner "Combo ×5! Tuyệt vời" trượt xuống 1.2s, Bin `dance`, `playSfx("combo")`. Sai → combo về 0 (chip vỡ nhẹ).
- **XP**: ngôi sao + số `CountUp`; mỗi câu đúng `XpBurst` bay vào.
- Nút âm thanh bật/tắt (lưu pref `sound`).
- Desktop: hiện phím tắt nhỏ ở góc dưới (`Space` lật, `1–4` chọn, `Enter` tiếp tục).
- Phiên lâu không tương tác 25s → Bin `yawn` + câu `LINES.idleSession` ("Còn đó không? {name} chờ nè").

### 7.2 Đáp án & phản hồi (`components/practice/question-parts.tsx`)
- Nút đáp án: `min-h-14 md:min-h-16`, chữ `text-lg`, có phím số (A/B/C/D hoặc 1–4) trong ô vuông bên trái; dạng pressable trung tính (viền đáy `border-strong`); hover nâng 2px.
- Chọn đúng: nút chuyển `success` (nền `success-soft`, viền `success`), icon check **pop** vào, `Burst` xanh lá tại nút, `playSfx("correct")`, `haptic("success")`, `XpBurst`.
- Chọn sai: nút `danger` + `Shake`, nút đúng đồng thời sáng viền `success` nhấp nháy 2 lần, `playSfx("wrong")`, `haptic("error")`.
- Câu hỏi đổi: `AnimatePresence` — câu cũ trượt trái + mờ, câu mới trượt từ phải (220ms). Reduced motion: đổi tức thì.
- **Sheet phản hồi** (giữ "Đúng rồi!", "Tiếp tục"): nền `success-soft`/`danger-soft` trượt lên spring; bên trái Bin 64px (đúng: `jump`, sai: `droop`); lời khen ngẫu nhiên khi đúng (bổ sung vào `lib/mascot/lines.ts`, không emoji): "Chuẩn luôn!", "Giỏi quá!", "Nhớ dai ghê!", "Quá đỉnh!", "Đúng rồi đó!" — dòng tiêu đề vẫn là "Đúng rồi!" (E2E), lời khen là dòng phụ. Khi sai: hiện đáp án đúng to, nút loa, câu an ủi (`LINES.wrongComfort`: "Không sao, lần sau nhớ nha"). Nút "Tiếp tục" pressable theo tone, phím `Enter`.

### 7.3 Màn kết thúc chung — `session-summary.tsx` + `celebration.tsx`
"Mở quà" theo từng bước (mỗi bước ~400ms, bấm bất kỳ đâu để tua nhanh; reduced motion → hiện tất cả ngay):
1. Bin nhảy vào từ dưới (`jump`), tiêu đề "Xong phiên rồi!" (giữ).
2. Vòng % đúng đầy dần + `CountUp`; ≥90% → 3 sao, ≥70% → 2 sao, còn lại 1 sao. Ba ngôi sao bật ra từng cái (`pop` + scale spring).
3. Ô số liệu lần lượt: số từ, XP (`+28` đếm lên), combo cao nhất, thời gian.
4. Thanh cấp độ chạy từ XP cũ đến mới; nếu lên cấp → **modal "Lên cấp N!"**: Bin `dance` đội vương miện tạm, `Confetti big`, `playSfx("levelUp")`, nếu mở khóa trang phục/trò mới thì hiện thẻ "Mở khóa: Kính râm" có nút "Mặc thử".
5. Streak: nếu hôm nay là lần đầu học → lửa bùng, "Chuỗi 3 ngày" và lịch 7 chấm.
6. Xương kiếm được trong phiên: "+2 xương cho {name}" với icon xương bay vào Bin.
7. Nút (giữ text E2E): "Học tiếp"/"Làm tiếp"…, "Về trang chủ".
Màn "đã ôn xong" khi vào `/review` mà không còn thẻ (§1 #6): Bin `sit` mặc trang phục, tiêu đề lớn, 3 thẻ gợi ý có màu (Luyện tập thêm / Học từ mới / Ghép thẻ tính giờ), và nhiệm vụ hôm nay còn lại.

---

## 8. Từng chế độ học

### 8.1 Ôn tập SRS (`components/review/flashcard.tsx`, `review-session.tsx`) **[E2E]**
- **Chồng thẻ**: sau thẻ hiện tại có 2 thẻ mờ lệch xuống (scale .96 / .92, translateY 10/20px) tạo cảm giác bộ bài.
- Lật thẻ: spring 3D (motion, stiffness 260, damping 22), `playSfx("flip")`. Mặt trước có gợi ý nhấp nháy "Chạm để lật" (fade 2 lần rồi đứng yên).
- Sau khi chấm: thẻ **bay đi** theo hướng (Quên → trái + xoay −12°, Khó → xuống, Nhớ → phải, Dễ → lên + xoay 8°) 320ms + `whoosh`; thẻ sau trồi lên thay chỗ.
- Desktop: kéo/vuốt thẻ sau khi lật: trái = Quên, phải = Nhớ, lên = Dễ; nền phía hướng kéo sáng màu tương ứng và hiện nhãn; thả quá ngưỡng 120px mới chấm. Nút đánh giá vẫn có (E2E dùng nút).
- Âm thanh phát âm tự động khi lật (nếu bật pref có sẵn), nút loa có sóng âm động khi đang đọc.

### 8.2 Lật thẻ tự do (`components/practice/flashcard-deck.tsx`)
- Chồng thẻ như 8.1; vuốt trái "Chưa thuộc" (cam), phải "Đã thuộc" (xanh lá) bằng `m.div drag="x"`, thẻ nghiêng theo độ kéo (rotate = dx/20), nhãn "Đã thuộc"/"Chưa thuộc" hiện mờ dần trên thẻ theo độ kéo.
- Bộ đếm hai bên: "Chưa thuộc 3" (trái, cam) và "Đã thuộc 7" (phải, xanh) nảy khi tăng.
- Hết bộ: màn kết quả với vòng tròn, nút "Học lại 3 thẻ chưa thuộc".

### 8.3 Học (`components/practice/learn-session.tsx`) **[E2E]** (§1 #3)
- **Bản đồ chặng** (đầu phiên và giữa các vòng): đường đi uốn lượn kiểu "con đường" với các nút tròn 64px: chặng đã xong (`success` + 1–3 sao), chặng hiện tại (`primary`, vòng sáng nhấp nháy chậm, Bin đứng cạnh), chặng sau (`surface-3` có khóa). Mỗi chặng = một vòng của logic hiện có (không đổi thuật toán). Nút "Bắt đầu chặng N" pressable.
- **Mỗi từ có thanh thuộc 3 nấc** (chấm nhỏ dưới từ: mới → đang học → thuộc), nấc tăng có hiệu ứng pop.
- Câu hỏi: thẻ câu hỏi `rounded-xl bg-surface shadow-md` chiếm nửa trên (không còn khoảng trống), nhãn "Từ mới"/"Ôn lại" dạng chip màu, chữ to (§3.7), nút loa. Đáp án 2×2 từ `md`.
- Lần đầu gặp từ mới: hiện **thẻ giới thiệu** (từ, nghĩa, ảnh/emoji, ví dụ, nút loa) với Bin `sniff` + câu "Từ mới nè!", nút "Đã hiểu" → rồi mới hỏi.
- Giữa vòng (giữ "Hết vòng", "Tiếp tục học?", "Học tiếp", "Bạn đã thuộc hết N từ"): màn tổng kết vòng có danh sách từ với nấc thuộc, số từ đã thuộc tăng (`CountUp`), Bin `jump`, rồi quay lại bản đồ, chặng vừa xong nhận sao (pop từng sao).

### 8.4 Kiểm tra (`components/practice/test-session.tsx`) **[E2E]** (§1 #4)
Giữ dạng cuộn (E2E đọc mọi `section[aria-labelledby]`), nhưng:
- **Header dính** gọn, không đè: hàng 1 "Đã làm 3/10" + vòng tiến độ nhỏ + nút "Nộp bài"; hàng 2 **dãy chấm điều hướng** 10 chấm (đã làm `primary`, chưa làm `surface-3`, câu đang xem viền đậm), chạm chấm → cuộn tới câu (`scrollIntoView` smooth, `scroll-margin-top` = chiều cao header). Header dùng `sticky top-0` có nền `canvas/90 backdrop-blur` và `shadow-sm` khi cuộn — **không dùng fixed ở giữa màn**.
- Mỗi câu là thẻ `rounded-xl` có số thứ tự lớn trong vòng tròn màu theo dạng câu (Gõ từ = pink, Đúng/Sai = teal, Trắc nghiệm = mint); giữ chữ "Câu 1:".
- Trả lời xong → thẻ câu thu nhẹ, có dấu "đã làm" ở góc, **tự cuộn sang câu tiếp** sau 350ms (tắt được bằng toggle nhỏ "Tự chuyển câu").
- Ô gõ: `h-14 text-xl`, viền đậm khi focus, nút "Bỏ qua".
- Nộp bài: nếu còn câu chưa làm → alertdialog giữ "Còn 2 câu chưa làm". Sau nộp → **bảng điểm**: điểm lớn "8/10" (giữ "Đúng 8/10") trong vòng tròn, xếp loại chữ (A ≥ 90%, B ≥ 75%, C ≥ 60%, D còn lại) trong huy hiệu màu, Bin phản ứng theo điểm, rồi danh sách từng câu (đúng xanh / sai đỏ, hiện đáp án đúng), nút "Làm lại câu sai" (giữ).

### 8.5 Ghép thẻ (`components/practice/match-game.tsx`) **[E2E]** (§1 #5)
- **Sửa lỗi header**: thanh trên full-width của cột nội dung, cùng `SessionBar`.
- **Màn mở đầu**: thẻ lớn giữa màn với minh họa 6 ô úp nghiêng xếp chồng, tiêu đề "Ghép thẻ", luật chơi một dòng, **kỷ lục hiện tại** (chip `streak` "Kỷ lục 18,4 giây") nếu có, Bin cầm đồng hồ bấm giờ (props). Nút "Bắt đầu" (giữ) → **đếm ngược 3–2–1** to giữa màn (mỗi số scale 1.4→1 + `tick`), rồi các ô **lật mở lần lượt** (stagger 40ms).
- Trong game: đồng hồ lớn `tabular-nums` trên cùng; ô `min-h-20 md:min-h-24 rounded-lg text-lg`; chọn ô → nâng lên + viền `primary`; ghép đúng → hai ô sáng xanh, `Burst`, bay về phía nhau rồi biến mất (giữ `tile-gone`), `correct`; ghép sai → hai ô đỏ + `Shake`, chữ "+1s" đỏ bay lên từ đồng hồ (giữ "lần ghép sai"). Combo ghép đúng liên tiếp ×3 → đồng hồ lóe xanh.
- Kết thúc: thời gian lớn, **huy chương** so với kỷ lục: vàng (phá kỷ lục — giữ "Kỷ lục đầu tiên!" khi chưa có kỷ lục), bạc (≤ kỷ lục +20%), đồng (còn lại). Phá kỷ lục → `Confetti record` + Bin `dance`. Nút "Chơi lại" (đếm ngược lại ngay), "Bảng 1/1" giữ.

### 8.6 Các kỹ năng (`practice-session.tsx`, `question-parts.tsx`)
- **Trắc nghiệm** (mint): như §7.2.
- **Gõ từ** (pink): ô gõ lớn căn giữa; khi nộp, **so từng ký tự**: ký tự đúng xanh, sai đỏ gạch dưới, thiếu hiện ô trống; nút "Gợi ý" (Bin `sniff`) hiện thêm 1 ký tự (trừ XP câu đó). Gõ đúng hoàn toàn → các ký tự nảy lần lượt (stagger 30ms).
- **Nghe** (sun): nút loa tròn 96px `c-sun` có vòng sóng lan ra khi phát; tự phát khi vào câu; nút "Nghe chậm" (rate 0.7) nếu Web Speech hỗ trợ.
- **Điền từ** (coral): câu ví dụ lớn, chỗ trống là chip nét đứt nhấp nháy viền; chọn đáp án → từ **bay vào chỗ trống** (motion `layoutId`) rồi đổi màu đúng/sai.
- **Tập viết chữ Hán** (`writing-pad.tsx`): nét đúng → lóe sáng ngắn; xong chữ → `Burst` + sao; viết sai 3 lần → Bin `think` và hiện gợi ý nét.

### 8.7 Màn chọn luyện tập (`components/practice/practice-setup.tsx`) (§1 #10)
- 4 chế độ chính là **thẻ game** lớn: `min-h-44`, nửa trên là **minh họa SVG nhỏ** riêng mỗi mode (Học: con đường 3 chặng; Kiểm tra: tờ giấy có điểm A+; Ghép thẻ: 2 ô nối bằng tia sét; Lật thẻ: chồng 3 thẻ nghiêng), nền `c-{mode}-soft`; nửa dưới tên + mô tả + **thông tin cá nhân**: Học "Đã thuộc 60%" (thanh tiến độ), Kiểm tra "Điểm gần nhất 8/10" nếu có, Ghép thẻ "Kỷ lục 18,4s" (từ IndexedDB `game-store`), Lật thẻ "10 thẻ".
- Chip **"Gợi ý cho bạn"** (`streak`) trên 1 mode: có từ đến hạn → nhắc "Ôn tập" trước; có từ hay quên → "Từ hay quên"; còn lại → Học.
- 4 kỹ năng: ô lớn hơn (`min-h-32`) có icon tile, tên **và mô tả một dòng**, trạng thái chọn giống mode chính.
- Hover thẻ: nâng + minh họa chuyển động nhẹ (ví dụ thẻ trong chồng xòe ra). Chọn: viền 2px + dấu check pop.
- Nút "Bắt đầu luyện" (giữ) dính đáy trên mobile, ghi rõ "Bắt đầu luyện · Học · 10 từ" ở dòng phụ.

---

## 9. Đăng nhập / Đăng ký / Quên mật khẩu / Onboarding **[E2E]** (§1 #1, #2)

Giữ mọi label và text E2E: "Email", "Mật khẩu", "Mật khẩu mới", "Nhập lại mật khẩu mới", "Tên của bạn", "Đăng nhập" (exact), "Tạo tài khoản", "Hiện mật khẩu" (aria-label nút mắt), "Gửi link đặt lại mật khẩu", "Lưu mật khẩu", "Quên mật khẩu?", các thông báo lỗi, onboarding "Tiếp tục", "Bắt đầu học", switch "Thêm bộ từ mẫu", radio "Tiếng Anh".

### 9.1 Bố cục desktop (≥1024px) — `components/auth/auth-card.tsx` viết lại
```
┌───────────────────────────────┬───────────────────────────────┐
│  PANEL CẢNH (bg primary,      │                               │
│  rounded-[32px] m-4)          │    ┌─────────────────────┐    │
│                               │    │ [Đăng nhập|Đăng ký] │    │
│   thẻ từ trôi chậm:           │    │  (segmented, trượt) │    │
│   ┌hello┐      ┌坚强 jiānqiáng┐│    │                     │    │
│        ┌resilient /rɪˈzɪl/┐   │    │ Chào mừng trở lại!  │    │
│                               │    │ Email [✉ ________]  │    │
│        BIN 220px (tương tác,  │    │ Mật khẩu [🔒 ___ 👁]│    │
│        nhìn theo form)        │    │        Quên mật khẩu?│    │
│                               │    │ [  Đăng nhập  ]     │    │
│  "Mỗi ngày ôn đúng những từ   │    │                     │    │
│   sắp quên."                  │    └─────────────────────┘    │
│  ● ○ ○  (3 slide tính năng)   │                               │
└───────────────────────────────┴───────────────────────────────┘
```
- Hai cột `grid-cols-[1.1fr_1fr]`, cao `min-h-dvh`.
- **Panel cảnh**: nền `primary` với các hình tròn lớn mờ cùng tông (primary sáng hơn 10–15%, **không gradient tím-hồng, không blur blob**), 5–6 **thẻ từ trắng thật** (giống flashcard thu nhỏ: từ + phiên âm/pinyin màu + nghĩa nhỏ), nghiêng ±6°, **trôi chậm** lên xuống 6px chu kỳ 6–9s lệch pha (được phép vì là cảnh trang trí; tắt khi reduced motion), di chuột → parallax nhẹ (thẻ xa dịch ít, gần dịch nhiều, tối đa 10px).
- Bin 200–240px đứng giữa dưới, trên một "tấm thảm" elip `primary-hover`.
- Dưới cùng: carousel 3 slide tự chuyển 5s (dừng khi hover): "Mỗi ngày ôn đúng những từ sắp quên." / "8 cách luyện, vui như chơi game." / "Học cùng bạn bè, đua bảng xếp hạng." Chữ trắng 800 `text-3xl`, chấm điều hướng.
- **Cột form**: thẻ `max-w-md w-full` căn giữa dọc, `bg-surface rounded-xl shadow-lg p-8` (desktop), logo nhỏ phía trên thẻ.

### 9.2 Bố cục mobile (<1024px)
```
┌──────────────────────────┐
│ BAND primary cao ~38dvh   │
│  logo trắng               │
│  thẻ từ nhỏ trôi (3 cái)  │
│      BIN 140px            │
│ ╭────────────────────────╮│ ← form card trồi lên, -mt-8,
│ │[Đăng nhập | Đăng ký]   ││   rounded-t-[28px] bg-surface
│ │ Chào mừng trở lại!     ││
│ │ Email ...              ││
│ │ Mật khẩu ...           ││
│ │ [ Đăng nhập ]          ││
│ ╰────────────────────────╯│
└──────────────────────────┘
```
- Band dùng `min-h-[38dvh]`; khi bàn phím mở (`visualViewport.height` giảm > 150px) band thu còn 120px (Bin nhỏ lại 72px, thẻ từ ẩn) có transition, để form luôn thấy.
- Không còn khoảng trống phía trên.

### 9.3 Form
- Segmented "Đăng nhập | Đăng ký" là **2 link** (`/login`, `/signup`) trong một track `surface-2 rounded-full`, pill trắng trượt (`layoutId`). Trang quên/đặt lại mật khẩu thay segmented bằng nút quay lại.
- Tiêu đề động: đăng nhập "Chào mừng trở lại!", đăng ký "Tạo sổ từ miễn phí", quên mật khẩu "Quên mật khẩu à? Không sao". Lời chào phụ có tên Bin: "{name} nhớ bạn lắm đó." (đăng nhập).
- Input `h-13` (52px), **icon trái** (Mail, Lock, User), placeholder rõ, label phía trên giữ đúng text. Nút mắt `aria-label="Hiện mật khẩu"` / "Ẩn mật khẩu".
- Validate khi blur: lỗi → viền `danger` + icon cảnh báo + dòng lỗi trượt xuống; hợp lệ → icon check `success` nhỏ bên phải.
- **Đăng ký**: thanh độ mạnh mật khẩu 4 đoạn (đỏ/cam/vàng/xanh) + checklist "Ít nhất 8 ký tự", "Có chữ và số" tích dần theo gõ.
- Nút submit pressable `xl` full-width: đang gửi → spinner + "Đang đăng nhập…" (aria-live, giữ accessible name chứa "Đăng nhập" để E2E `exact` vẫn khớp khi chưa gửi); thành công → icon check + Bin `jump`, chuyển trang sau 500ms; lỗi → form `Shake`, Bin `droop`.

### 9.4 Bin phản ứng với form (`components/auth/auth-bin.tsx`, mới)
State dùng chung qua context giữa form và panel:
| Sự kiện | Bin |
|---|---|
| Mở trang | `wave` + `bark` nhẹ (không phát âm thanh trước tương tác đầu tiên) |
| Focus ô email/tên, đang gõ | nhìn xuống ô (`look.y = 0.6`), con ngươi dịch ngang theo độ dài chuỗi (0 ký tự → trái, 30+ → phải) |
| Email hợp lệ khi blur | `nod` |
| Focus ô mật khẩu | `coverEyes` (che mắt, má hồng) |
| Bấm "Hiện mật khẩu" | `peek` (hé một mắt) |
| Rời ô mật khẩu | bỏ che mắt, `happy` |
| Lỗi đăng nhập | `droop` + bong bóng "Hình như sai rồi…" |
| Thành công | `jump` → `spin` |
| Rảnh 20s | `yawn` |
Desktop: Bin ở panel trái. Mobile: Bin ở band trên. Reduced motion: chỉ đổi mood.

### 9.5 Onboarding `(onboarding)/welcome` — `components/auth/welcome-form.tsx`
Ba bước, có thanh tiến độ 3 đoạn trên cùng, chuyển bước trượt ngang:
1. **Làm quen**: Bin `wave` to, bong bóng "Chào {tên}! Mình là Bin, sẽ học cùng bạn." Ô **đặt tên cho bạn chó** (pref `mascot_name`, mặc định "Bin"); gõ tên → Bin `nod` mỗi 600ms gõ. Nút "Tiếp tục" (giữ).
2. **Chọn ngôn ngữ**: 2 thẻ lớn (EN `en-soft` có chữ "Hello" to; 中 `zh-soft` có "你好" to), chọn → thẻ nảy + check; giữ radio "Tiếng Anh" (thẻ là label của radio). Switch "Thêm bộ từ mẫu" (giữ).
3. **Sẵn sàng**: tóm tắt lựa chọn, Bin `dance`, nút "Bắt đầu học" (giữ) → `Confetti big` rồi chuyển trang.

---

## 10. To, rõ, không lỗi — rà soát responsive

### 10.1 Ma trận kích thước
Kiểm tra mọi màn ở: **320, 360, 390, 430** (điện thoại), **768, 834** (tablet dọc), **1024, 1280, 1440, 1920** (laptop/desktop), và **điện thoại xoay ngang 844×390**. Cả sáng và tối.

### 10.2 Quy tắc
- Không tràn ngang ở bất kỳ kích thước nào. Chữ dài (tên bộ từ, từ tiếng Anh dài, câu ví dụ) dùng `break-words`/`hyphens-auto`, tên trong thẻ `line-clamp-2`.
- Mọi hàng chip/lọc/tab có thể dài: cuộn ngang, có fade mép.
- Không phần tử fixed/sticky đè nội dung: bottom nav, FAB, thanh nộp bài, sheet phản hồi đều có padding bù tương ứng.
- Safe area iOS: `env(safe-area-inset-*)` cho bottom nav, sheet, màn học.
- Màn học xoay ngang (chiều cao < 500px): thẻ thu chiều cao, đáp án 2×2, Bin trên thanh ẩn.
- Tablet 768–1023: dùng bottom nav (như mobile) nhưng nội dung 2 cột ở Today và lưới bộ từ 2 cột.
- Desktop ≥1920: nội dung `max-w-7xl` căn giữa trong cột phải sidebar, không kéo dài vô hạn.
- Vùng chạm ≥ 44px; focus ring rõ trên mọi phần tử tương tác mới (thẻ game, chấm điều hướng, nút Bin).
- Dark mode: kiểm tra Bin (lông, viền), cảnh Góc của Bin, panel auth, confetti trên nền tối.

### 10.3 Test tự động chống lỗi bố cục — `tests/e2e/layout.spec.ts` (mới) **[E2E]**
- Đăng nhập tài khoản demo (dùng helper sẵn có trong `tests/e2e/helpers.ts`).
- Với mỗi route: `/`, `/login`, `/signup`, `/today`, `/decks`, `/decks/<id đầu tiên>`, `/practice`, `/stats`, `/groups`, `/chat`, `/settings`, `/explore`, `/hard-words`, `/review`, `/practice/learn`, `/practice/test`, `/practice/match`
- Ở mỗi viewport 320×640, 390×844, 768×1024, 1280×800, 1920×1080:
  - Assert `document.documentElement.scrollWidth <= window.innerWidth`.
  - Assert không phần tử có chữ nào bị cắt bởi `overflow:hidden` với `scrollWidth > clientWidth + 1` trong các vùng `[data-check-overflow]` (gắn thuộc tính này vào hàng lọc, tiêu đề thẻ, nút).
  - Assert mọi `button, a` hiển thị có kích thước ≥ 40×40 (bỏ qua link nội dòng trong đoạn văn, đánh dấu `data-inline-link`).
- `playwright.config.ts`: thêm `use: { reducedMotion: "reduce" }` cho toàn bộ E2E để animation không làm test chập chờn.

---

## 11. Hiệu năng & khả năng truy cập
- Bin: một SVG, CSS animation (GPU transform); idle chỉ chạy khi trong viewport và tab hiện. Không quá 3 Bin cùng animate idle trên một màn.
- `motion` qua `LazyMotion` + `m.*`; Góc của Bin, Confetti, modal Lên cấp load động.
- Âm thanh không tạo `AudioContext` trước tương tác đầu tiên.
- Mọi hiệu ứng có ý nghĩa đều có tương đương văn bản (ví dụ combo có `aria-live="polite"` "Combo 5"; lên cấp có dialog với tiêu đề). Bin vẫn `aria-hidden`, nút Bin có `aria-label` ("Xoa đầu Bin", "Góc của Bin").
- Lighthouse mobile trên `/today` và `/login`: Performance không tụt quá 5 điểm so với trước V3 (ghi số trước/sau vào báo cáo P14).

---

## 12. Các phase (mỗi phase = một phiên Claude Code, một commit)

**P0 — Chuẩn bị**
- Branch `v3-lively`. Copy plan vào `docs/redesign-v3/REDESIGN_V3.md`.
- `pnpm add motion`. Thêm `LazyMotion` + `MotionConfig` vào `components/providers.tsx`.
- `playwright.config.ts`: `reducedMotion: "reduce"`.
- Viết `tests/e2e/layout.spec.ts` (§10.3), chạy, **ghi lại danh sách lỗi hiện có** vào `docs/redesign-v3/layout-baseline.md` (chưa sửa).
- Chụp before: `node scripts/screenshot.mjs --all docs/redesign-v3/before` (+ `--dark`).
- Đọc: `components/mascot/*`, `lib/mascot/lines.ts`, `components/practice/*`, `components/review/*`, `components/auth/*`, `lib/validation.ts`, `components/providers.tsx`.

**P1 — Nền tảng hiệu ứng**
- `lib/sfx.ts`, `lib/haptics.ts`, prefs mới (§3.4) + mục Settings "Âm thanh & rung".
- `components/fx/*` (§3.6).
- Thang chữ responsive và kích thước nút (§3.7).
- `lib/progress.ts` + server data helpers + `tests/unit/progress.test.ts` (§3.5). Chưa gắn UI.

**P2 — Bin 2.0 (bộ máy)**
- Viết lại `pup.tsx` theo §4.1, CSS idle §4.2, actions §4.3, `useBinAction`, `useBinIdle`, `useBinLook`, trang phục §4.5, trang `/_dev/bin` §4.6, test §4.7.
- Rà mọi nơi đang dùng `<Pup>` vẫn hiển thị đúng (sidebar, Today, session bar, feedback, end screens, settings).
- Chụp `/_dev/bin` sáng/tối.

**P3 — Tương tác với Bin**
- `PettablePup` §5.1, câu thoại mới, Góc của Bin §5.2 (cảnh, tâm trạng, cho ăn kéo-thả, ném bóng, làm trò, trang phục), server actions `feedBin`.
- Điểm vào Góc của Bin: Today, sidebar, user menu. Settings → Linh vật: chọn trang phục.

**P4 — Today & khung app** **[E2E]**
- §6.1 (cấp độ, hero Bin, nhiệm vụ + `claimQuest`, streak, heatmap), §6.2 (nav indicator, nút Ôn giữa bottom nav, FAB, chuyển trang), §6.3 (deck art, hàng lọc, danh sách từ).

**P5 — Đăng nhập, đăng ký, quên/đặt lại mật khẩu, onboarding** **[E2E]**
- §9 toàn bộ. Chụp cả 4 trang auth + 3 bước onboarding ở 390/768/1280, sáng/tối, kèm trạng thái: focus mật khẩu (Bin che mắt), lỗi, đăng ký với thanh độ mạnh.

**P6 — HUD phiên học dùng chung** **[E2E]**
- §7.1, §7.2 (session bar, combo, XP, âm thanh, đáp án, sheet phản hồi, chuyển câu). Áp vào mọi mode đang dùng `question-parts`.

**P7 — Ôn tập & Lật thẻ** **[E2E]**
- §8.1, §8.2.

**P8 — Học** **[E2E]**
- §8.3.

**P9 — Kiểm tra** **[E2E]**
- §8.4.

**P10 — Ghép thẻ** **[E2E]**
- §8.5.

**P11 — Kỹ năng riêng** **[E2E]**
- §8.6.

**P12 — Màn kết thúc & lên cấp** **[E2E]**
- §7.3 cho mọi mode (review, learn, test, match, flashcard, kỹ năng), modal "Lên cấp", màn "đã ôn xong".

**P13 — Màn chọn luyện tập & study strip** **[E2E]**
- §8.7; áp cùng kiểu thẻ game cho `study-strip.tsx` ở trang bộ từ.

**P14 — Rà soát responsive, hiệu năng, tài liệu** **[E2E]**
- §10: sửa hết lỗi trong `layout-baseline.md` và mọi lỗi mới; `layout.spec.ts` xanh ở mọi viewport.
- §11: kiểm tra hiệu năng, ghi số.
- Chụp after đầy đủ: `node scripts/screenshot.mjs --all docs/redesign-v3/after` (+ `--dark`), thêm ảnh 768px cho Today, Bộ từ, Luyện tập, Đăng nhập.
- Cập nhật `CLAUDE.md`: mục mascot (Bin 2.0, actions, outfits, Góc của Bin, prefs), mục V3 (sfx, haptics, progress/levels/quests/bones, fx components, layout test), quy tắc animation (được phép: idle Bin, thẻ trôi ở auth, các hiệu ứng phản hồi; luôn tôn trọng reduced motion).

---

## 13. Checklist nghiệm thu cuối

- [ ] Trang đăng nhập/đăng ký: không còn khoảng trống chết; Bin che mắt khi gõ mật khẩu, hé mắt khi hiện mật khẩu, nhìn theo khi gõ email; thanh độ mạnh mật khẩu; đẹp ở 390 / 768 / 1280 / 1920.
- [ ] Bin: thở, chớp mắt, nhìn theo chuột, vi chuyển động ngẫu nhiên, ngủ khi rảnh; đủ 18 hành động; 8 trang phục hiện đúng mọi nơi.
- [ ] Góc của Bin: cho ăn (kéo thả trên desktop), ném bóng, làm trò theo cấp, thay trang phục; xương tính đúng, không âm.
- [ ] Today: cấp độ, nhiệm vụ hôm nay nhận thưởng được, streak bùng lửa, heatmap không còn ô gạch chéo.
- [ ] Mọi phiên học: âm thanh (tắt được), rung (Android), combo, XP bay, Bin phản ứng đúng/sai, chuyển câu mượt.
- [ ] Học có bản đồ chặng và thẻ giới thiệu từ mới; Kiểm tra có chấm điều hướng và bảng điểm xếp loại; Ghép thẻ có đếm ngược, combo, huy chương; Ôn tập/Lật thẻ có chồng thẻ và vuốt.
- [ ] Màn kết thúc "mở quà" từng bước, sao, lên cấp, mở khóa.
- [ ] Màn chọn luyện tập: thẻ game có minh họa và thông tin cá nhân, gợi ý cho bạn.
- [ ] `layout.spec.ts` xanh ở 5 viewport; không tràn ngang; không phần tử đè nhau; chữ ≥ 13px.
- [ ] Reduced motion: không có chuyển động lặp, mọi màn vẫn dùng được.
- [ ] Dark mode đẹp ngang light ở mọi màn mới.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` xanh; `scripts/contrast.mjs` pass.
