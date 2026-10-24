# Sổ Từ — Redesign V2 "Sáng Màu"

> Plan cho Claude Code. Thay thế hoàn toàn design system "Vở mực tím" (`docs/redesign/REDESIGN_PLAN.md`).
> Đọc hết file này trước khi sửa code. Làm theo từng Phase (§10), commit sau mỗi phase, chụp ảnh kiểm tra.
> UI text vẫn tiếng Việt; code/comment tiếng Anh. Không đổi logic, data, route, server action — chỉ đổi giao diện.

---

## 0. Bối cảnh & lý do làm lại

Chủ app đánh giá giao diện hiện tại **xấu toàn diện**, không hợp xu hướng. Bản "Vở mực tím" đã đi quá xa theo hướng "đừng giống AI": cấm màu trang trí, cấm shadow, cấm gradient, mọi thứ phẳng xám + một màu tím mực. Kết quả là app trông như bản wireframe/tài liệu nội bộ.

### 0.1 Chẩn đoán cụ thể (nhìn từ ảnh `docs/redesign/after/*`)

| Vấn đề | Ở đâu | Hậu quả |
|---|---|---|
| Kẻ dòng vở (`.ruled-paper`), đường lề đỏ (`.margin-line`, cột đỏ cạnh sidebar), ô 田字格 trên mọi chữ Hán | Today hero, flashcard, word page, landing, auth, sidebar | Rối mắt, cũ kỹ, trông như lỗi render |
| Gần như không có màu: nền xám `#f5f6fa`, card trắng viền 1px, một màu tím `#3b2e8c` tối | Toàn app | Nhạt, buồn, không có điểm nhấn, không "vui để học" |
| Font serif Literata cho số và tiêu đề trộn với sans | Today ("23 từ đến hạn ôn"), landing | Lệch tông, cảm giác báo giấy |
| Card không có chiều sâu, không phân cấp: mọi khối đều trắng viền xám như nhau | Today, Bộ từ, Luyện tập | Không biết nhìn vào đâu trước, CTA chính không nổi |
| Bìa bộ từ là ô màu tối nhỏ có nhãn chữ nhét chữ bé (`DeckCover`) | Bộ từ, Today | Chữ không đọc được, màu tối u ám |
| Bottom nav dính sát đáy, chỉ báo active là gạch 2px | Mobile | Lỗi thời, khó thấy tab hiện tại |
| Heatmap/streak một màu tím, ô vuông nhỏ | Today, Stats | Đơn điệu |
| Màn chọn chế độ luyện tập là lưới ô trắng giống nhau, icon nét mảnh | Luyện tập | Không có cá tính, khó phân biệt mode |
| Linh vật Bin là nét vẽ tím mảnh, không màu | Khắp nơi | Không dễ thương, chìm |
| Con dấu đỏ (`SealStamp`) là "khoảnh khắc ăn mừng" duy nhất | Cuối phiên | Không có cảm giác thành tựu |

### 0.1b Mockup tham chiếu (BẮT BUỘC xem trước khi code)

Thư mục `docs/redesign-v2/mockups/` có 5 màn đã chốt, mỗi màn gồm một ảnh `.png` (xem bằng Read) và một file `.html` (mã nguồn với màu, kích thước, bo góc, shadow chính xác):

| File | Màn | Phase |
|---|---|---|
| `01-today-desktop` | Hôm nay, 1280px | 3, 4 |
| `02-today-mobile` | Hôm nay, 390px + bottom nav nổi | 3, 4 |
| `03-review` | Ôn thẻ (mặt sau + 4 nút đánh giá) | 7 |
| `04-practice` | Chọn chế độ luyện tập | 7 |
| `05-summary` | Xong phiên | 7 |

Quy tắc: kết quả phải trông giống mockup. Khi plan và mockup lệch nhau về giao diện, **theo mockup**. Số liệu trong mockup là dữ liệu mẫu, dùng dữ liệu thật của app. Không copy HTML vào app: dịch sang Tailwind token và component của §3–§5. Đầu mỗi phase liên quan, mở ảnh mockup ra xem lại; cuối phase, so ảnh chụp của app với mockup.

### 0.2 Mục tiêu

1. **Có màu, tươi, hiện đại** — cảm giác như Duolingo / Quizlet (2024+) / Speak / Apple Fitness: màu bão hòa, khối màu pastel, bo góc lớn, phân cấp rõ.
2. **Không "AI generic"** — nhưng hiểu đúng: cái "AI" là *gradient tím-hồng tràn lan, blob mờ, glassmorphism khắp nơi, emoji ở tiêu đề, chữ gradient*. Màu sắc, shadow mềm, bo góc, minh họa **không** phải là AI.
3. **Bỏ hoàn toàn ẩn dụ "cuốn vở"**: không kẻ dòng, không lề đỏ, không ô ly, không con dấu.
4. Giữ khả năng truy cập: AA contrast, touch target ≥ 44px, `prefers-reduced-motion`, dark mode đầy đủ.

---

## 1. Tham khảo & những gì lấy từ mỗi nơi

| Tham khảo | Lấy gì |
|---|---|
| **Duolingo** | Màu bão hòa theo ngữ nghĩa (xanh lá = đúng, đỏ = sai, vàng = streak), nút "nhấn được" có viền đáy, linh vật có màu và cảm xúc, màn kết thúc phiên ăn mừng rõ ràng. |
| **Quizlet (rebrand 2024)** | Thẻ học to, bo tròn, nền trắng nổi trên nền xám nhạt; mỗi chế độ học có màu/icon riêng; progress bar dày. |
| **Speak / Busuu / Mochi** | Typography sans đậm, số liệu to, hero card màu đặc với CTA trắng. |
| **Apple Fitness / Health, iOS 26** | Vòng tiến độ (ring) màu đặc; bottom bar nổi dạng "pill" mờ kính (chỉ cho thanh điều hướng). |
| **Linear / Raycast / Notion Calendar** | Sidebar gọn, item active là pill nền nhạt; quick search Ctrl+K kiểu command palette; khoảng trắng hào phóng. |
| **Bento grid (xu hướng dashboard 2025–26)** | Today là lưới các khối kích thước khác nhau, mỗi khối một màu nhạt khác nhau → nhìn là biết thông tin nào ở đâu. |

Từ khóa moodboard: *bright, friendly, chunky, rounded, confident, playful-but-clean*.

---

## 2. Nguyên tắc thiết kế mới (thay "anti-AI checklist" cũ)

**NÊN**
- Dùng màu để **nhóm và phân biệt**: mỗi bộ từ, mỗi chế độ luyện, mỗi loại số liệu có màu riêng (từ bảng màu §3.2).
- Khối màu nhạt (`*-soft`) + chữ đậm cùng tông (`*-fg`) là pattern chính tạo màu sắc.
- Một **hero** màu đặc mỗi màn (tối đa 1): Today = khối "Ôn hôm nay" xanh primary.
- Shadow mềm nhiều lớp cho card nổi; hover nâng nhẹ.
- Bo góc lớn: card 20px, hero/flashcard 28px, nút 14px, chip full.
- Số to, sans đậm 800, `tabular-nums`.
- Icon lucide `strokeWidth={2}`; icon tính năng đặt trong ô vuông bo tròn có màu.
- Ăn mừng khi xong phiên (ring đầy + Bin vui + confetti ngắn).

**KHÔNG**
- Không kẻ dòng vở, lề đỏ, ô ly, texture giấy, con dấu.
- Không gradient tím→hồng, không chữ gradient, không blob mờ nền, không glassmorphism trên card (chỉ bottom nav/top bar được blur).
- Không emoji trong UI chrome (tiêu đề, nút, nav). Emoji do người dùng nhập cho từ vẫn hiển thị.
- Không dùng serif. Bỏ hẳn Literata.
- Không hex thô trong component — chỉ dùng token.
- Không animation lặp vô hạn ngoài Bin (chớp mắt, vẫy đuôi).

Gradient **được phép** duy nhất: gradient cùng tông rất nhẹ trên hero (`primary` → `primary` sáng hơn 8%), và trên ảnh minh họa landing.

---

## 3. Design tokens

### 3.1 Font

- **Be Vietnam Pro** cho mọi thứ (hỗ trợ tiếng Việt tốt nhất). Load weight `400, 500, 600, 700, 800` (thêm 800 cho số/hero).
- Xóa `Literata` khỏi `app/layout.tsx`, xóa `--font-display` serif. `font-display` giờ = Be Vietnam Pro 800, `letter-spacing: -0.03em`.
- Chữ Hán: mặc định **Noto Sans SC** (`font-hanzi` trỏ sang sans) — hiện đại hơn serif. Giữ `Noto Serif SC` chỉ nếu có pref người dùng (không cần làm thêm pref; cứ bỏ serif khỏi mặc định).
- Xóa `public/fonts/hero-hanzi.woff2` subset serif nếu landing không còn dùng; nếu landing cần 2 chữ Hán mẫu thì tạo subset Noto Sans SC tương tự.
- IPA giữ `IPA Sans`.

Type scale (giữ tên token cũ để ít sửa):
```
--text-xs: 0.8125rem / 1.4
--text-sm: 0.9375rem / 1.5
--text-base: 1rem / 1.6           (đổi từ 1.0625)
--text-lg: 1.1875rem / 1.4
--text-xl: 1.5rem / 1.25
--text-2xl: 2rem / 1.15
--text-3xl: 2.75rem / 1.05        (mới: số hero)
--text-display: clamp(2.25rem, 5.5vw, 4rem) / 1.05
--text-word: clamp(2.5rem, 8vw, 3.75rem) / 1.1
--text-hanzi: clamp(3.5rem, 13vw, 5.5rem) / 1.1
```
Heading: h1 800 `-0.025em`, h2 700 `-0.02em`, h3 600.

### 3.2 Màu — viết lại toàn bộ `:root` / `.dark` trong `app/globals.css`

Primary = **xanh "bút bi"** (gợi cây bút bi xanh của học sinh VN, không phải tím AI).

**Light**
```css
:root, .light {
  /* Neutrals */
  --canvas: #f4f5f9;        /* nền trang */
  --surface: #ffffff;       /* card */
  --surface-2: #eef0f6;     /* input, hàng hover, ô trống */
  --surface-3: #e4e7f0;     /* track progress, skeleton */
  --border: #e3e6ef;
  --border-strong: #cdd2df;
  --fg: #12131a;
  --fg-muted: #565b6e;
  --fg-subtle: #9097a8;     /* placeholder/disabled */

  /* Primary (blue ballpoint) */
  --primary: #3557f5;
  --primary-hover: #2a47d6;
  --primary-press: #1f36a8; /* viền đáy nút pressable */
  --primary-soft: #e6ecff;
  --primary-fg: #2443c7;    /* chữ trên primary-soft */
  --on-primary: #ffffff;

  /* Palette: solid / soft / fg  (fg đạt AA trên soft và trên trắng) */
  --c-blue: #3d63ff;   --c-blue-soft: #e6ecff;   --c-blue-fg: #2443c7;
  --c-coral: #ff5c4d;  --c-coral-soft: #ffe7e3;  --c-coral-fg: #c7311f;
  --c-mint: #12b886;   --c-mint-soft: #ddf6ec;   --c-mint-fg: #08724f;
  --c-sun: #ffc23d;    --c-sun-soft: #fff2cc;    --c-sun-fg: #855400;
  --c-grape: #8e5cff;  --c-grape-soft: #efe7ff;  --c-grape-fg: #5b2fcc;
  --c-pink: #ff5fa8;   --c-pink-soft: #ffe5f1;   --c-pink-fg: #b3246a;
  --c-orange: #ff8a2b; --c-orange-soft: #ffebd9; --c-orange-fg: #a84a00;
  --c-teal: #14b8c4;   --c-teal-soft: #daf5f7;   --c-teal-fg: #0b6f78;
  --c-red: #e5484d;    --c-red-soft: #ffe5e5;    --c-red-fg: #b4232a;

  /* Semantic aliases (component dùng cái này, KHÔNG dùng --c-* trực tiếp trừ deck/mode colors) */
  --en: var(--c-blue);     --en-soft: var(--c-blue-soft);     --en-fg: var(--c-blue-fg);
  --zh: var(--c-coral);    --zh-soft: var(--c-coral-soft);    --zh-fg: var(--c-coral-fg);
  --success: var(--c-mint);--success-soft: var(--c-mint-soft);--success-fg: var(--c-mint-fg);
  --danger: var(--c-red);  --danger-soft: var(--c-red-soft);  --danger-fg: var(--c-red-fg);
  --due: var(--c-orange);  --due-soft: var(--c-orange-soft);  --due-fg: var(--c-orange-fg);
  --streak: var(--c-sun);  --streak-soft: var(--c-sun-soft);  --streak-fg: var(--c-sun-fg);
  --xp: var(--c-grape);    --xp-soft: var(--c-grape-soft);    --xp-fg: var(--c-grape-fg);

  /* Pinyin tones (giữ nguyên ý nghĩa, chỉnh cho hợp palette) */
  --tone-1: #d92d20; --tone-2: #c25e00; --tone-3: #13804f; --tone-4: #2f55d4; --tone-5: var(--fg-muted);

  /* Elevation */
  --shadow-xs: 0 1px 2px rgb(16 24 40 / 0.05);
  --shadow-sm: 0 1px 3px rgb(16 24 40 / 0.06), 0 1px 2px rgb(16 24 40 / 0.04);
  --shadow-md: 0 6px 16px -4px rgb(16 24 40 / 0.08), 0 2px 4px -1px rgb(16 24 40 / 0.04);
  --shadow-lg: 0 20px 40px -12px rgb(16 24 40 / 0.18), 0 4px 8px -2px rgb(16 24 40 / 0.05);
  --shadow-primary: 0 8px 24px -8px color-mix(in oklab, var(--primary) 55%, transparent);

  /* Motion */
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --dur-fast: 120ms; --dur-base: 200ms; --dur-slow: 320ms; --dur-flip: 450ms;
}
```

**Dark** (nền trung tính xanh đen, không tím)
```css
.dark {
  --canvas: #0b0d12; --surface: #151821; --surface-2: #1c202b; --surface-3: #252a37;
  --border: #272c3a; --border-strong: #343a4b;
  --fg: #f3f5f9; --fg-muted: #a0a7b8; --fg-subtle: #6b7286;

  --primary: #6f8bff; --primary-hover: #8aa1ff; --primary-press: #4b66d9;
  --primary-soft: #1b2347; --primary-fg: #a9baff; --on-primary: #0b0d12;

  --c-blue: #6f8bff;   --c-blue-fg: #a9baff;
  --c-coral: #ff7a6b;  --c-coral-fg: #ffb0a6;
  --c-mint: #3dd6a0;   --c-mint-fg: #8cebc6;
  --c-sun: #ffd05c;    --c-sun-fg: #ffe08f;
  --c-grape: #a98bff;  --c-grape-fg: #cdbbff;
  --c-pink: #ff7db8;   --c-pink-fg: #ffb3d6;
  --c-orange: #ffa25c; --c-orange-fg: #ffc594;
  --c-teal: #3ccfd9;   --c-teal-fg: #8fe6ec;
  --c-red: #ff6b6f;    --c-red-fg: #ffa8aa;
  /* soft = 18% màu trên surface */
  --c-blue-soft: color-mix(in oklab, var(--c-blue) 18%, var(--surface));
  /* ...lặp tương tự cho coral, mint, sun, grape, pink, orange, teal, red */

  --tone-1: #ff7070; --tone-2: #ffab4a; --tone-3: #4cd38a; --tone-4: #82a0ff;

  --shadow-xs: 0 1px 2px rgb(0 0 0 / 0.4);
  --shadow-sm: 0 1px 3px rgb(0 0 0 / 0.45);
  --shadow-md: 0 6px 16px -4px rgb(0 0 0 / 0.55);
  --shadow-lg: 0 20px 40px -12px rgb(0 0 0 / 0.7);
}
```
Dark mode: card dùng `border` 1px (shadow kém hiệu quả trên nền tối) + `surface`; hero vẫn primary đặc.

**Map sang shadcn** (giữ để component shadcn chạy): `--background: var(--canvas)`, `--foreground: var(--fg)`, `--card: var(--surface)`, `--primary: var(--primary)`, `--primary-foreground: var(--on-primary)`, `--secondary: var(--primary-soft)`, `--secondary-foreground: var(--primary-fg)`, `--muted: var(--surface-2)`, `--muted-foreground: var(--fg-muted)`, `--accent: var(--surface-2)`, `--destructive: var(--danger)`, `--border: var(--border)`, `--input: var(--border-strong)`, `--ring: var(--primary)`, `--chart-1..5: blue, mint, sun, coral, grape`.

Khai báo tất cả trong `@theme inline` dạng `--color-<name>: var(--<name>)` để có class `bg-c-mint-soft`, `text-success-fg`, `bg-canvas`, `text-fg-muted`, …

`themeColor` trong `app/layout.tsx`: light `#F4F5F9`, dark `#0B0D12`. Manifest `theme_color`/`background_color` cập nhật theo.

### 3.3 Bảng màu cho bộ từ & chế độ

`lib/deck-colors.ts` viết lại:
```ts
export const DECK_COLORS = ["blue", "coral", "mint", "sun", "grape", "pink", "orange", "teal"] as const;
export type DeckColor = (typeof DECK_COLORS)[number];
export function deckColor(id: string): DeckColor  // hash ổn định như cũ
export function deckColorClasses(c: DeckColor): { solid: string; soft: string; fg: string; bar: string }
```
Dùng class tĩnh đầy đủ (Tailwind cần thấy chuỗi), ví dụ `{ solid: "bg-c-mint", soft: "bg-c-mint-soft", fg: "text-c-mint-fg", bar: "bg-c-mint" }`. Xóa `deckTone`, `cover-*`. (Không cần migration DB; nếu sau này muốn cho người dùng chọn màu thì để phase sau.)

Màu chế độ luyện (`components/practice/mode-look.tsx`):
| Mode | Màu | Icon lucide |
|---|---|---|
| learn (Học) | blue | `GraduationCap` |
| test (Kiểm tra) | grape | `ClipboardCheck` |
| match (Ghép thẻ) | orange | `Puzzle` |
| flashcard (Lật thẻ) | teal | `Layers` |
| quiz (Trắc nghiệm) | mint | `ListChecks` |
| typing (Gõ từ) | pink | `Keyboard` |
| listen (Nghe) | sun | `Headphones` |
| cloze (Điền từ) | coral | `TextCursorInput` |

### 3.4 Bo góc, spacing, elevation

```
--radius-xs: 8px    (badge vuông, ô heatmap)
--radius-sm: 10px   (nút sm, input sm)
--radius-md: 14px   (nút, input, item nav)
--radius-lg: 20px   (card)
--radius-xl: 28px   (hero, flashcard, sheet, dialog)
--radius-full: 9999px (chip, avatar, progress)
```
Đổi tên token cũ: `rounded-btn` → `rounded-md`, `rounded-card` → `rounded-lg`, `rounded-sheet` → `rounded-xl`, `rounded-chip` → `rounded-full`. Xóa token cũ sau khi thay hết.

Spacing: card padding `p-5` (mobile) / `p-6` (desktop); khoảng cách giữa khối bento `gap-4` / `lg:gap-5`; section `space-y-8`.

---

## 4. Xóa bỏ (bắt buộc)

Trong `app/globals.css` xóa: `.sheet`, `.sheet-lift`, `.ruled-paper`, `.margin-line`, `.ruled-word`, `.ruled-list`, `.highlighter`, `.highlighter-animate` + keyframes, `stamp-in`, `ink-draw`, `.qr-paper`, `.cover-radius`, các class `heat-*` cũ (viết lại), mọi token: `paper, surface-sunk, ink, ink-soft, ink-faint, rule, rule-strong, ruling, margin, ink-violet*, tint-*, seal*, on-seal, leaf*, turmeric*, highlighter, cover-*`.

Component:
- `components/review/seal-stamp.tsx` → xóa, thay bằng `components/review/celebration.tsx` (§6.7).
- `InkFigure` (trong `empty-state.tsx`) → xóa, thay minh họa mới (§5.10).
- Sidebar: xóa `<div ... border-margin ...>` (cột đỏ, `app-nav.tsx` dòng ~149).
- `word-specimen.tsx`: bỏ `Paper` (giấy kẻ) và `HanziCell` (ô 田字格) khỏi hiển thị thường. **Ngoại lệ duy nhất**: lưới hướng dẫn trong `components/practice/writing-pad.tsx` / `components/zh/stroke-order.tsx` (tập viết chữ Hán) — ở đó lưới có chức năng, giữ nhưng vẽ bằng nét `--border` đứt mảnh, không đỏ.
- `components/marketing/hero-specimen.tsx`: viết lại (§6.13).

Kiểm tra cuối: lệnh sau phải trả về rỗng (trừ comment lịch sử trong docs):
```bash
rg -n "ruled-|margin-line|highlighter|sheet-lift|\bsheet\b|ink-violet|tint-(violet|seal|leaf|turmeric)|seal-text|\bseal\b|leaf-text|turmeric|cover-(indigo|moss|plum|brick|ochre|slate)|surface-sunk|ink-soft|ink-faint|rule-strong|\bbg-paper\b|font-display.*serif|Literata|SealStamp|InkFigure|HanziCell|rounded-(btn|card|sheet|chip)" app components lib
```

### 4.1 Bảng chuyển token (codemod rồi rà tay)

| Cũ | Mới | Ghi chú |
|---|---|---|
| `bg-paper` | `bg-canvas` | |
| `bg-surface` | `bg-surface` | giữ |
| `bg-surface-sunk` | `bg-surface-2` | |
| `text-ink` | `text-fg` | |
| `text-ink-soft` | `text-fg-muted` | |
| `text-ink-faint` | `text-fg-subtle` | |
| `border-rule` | `border-border` | |
| `border-rule-strong` | `border-border-strong` | |
| `*-ink-violet` | `*-primary` | |
| `*-ink-violet-hover` | `*-primary-hover` | |
| `bg-tint-violet` | `bg-primary-soft` | chữ trên nó: `text-primary-fg` |
| `*-seal*` / `tint-seal` | **rà từng chỗ**: tiếng Trung → `zh`, đến hạn → `due`, lỗi/xóa → `danger` | không replace mù |
| `*-leaf*` / `tint-leaf` | `success` / `success-soft` / `success-fg` | |
| `*-turmeric*` / `tint-turmeric` | `streak` / `streak-soft` / `streak-fg` | |
| `text-on-seal` | `text-white` (trên danger/zh solid) | |
| `.sheet` | `<Card>` hoặc `rounded-lg bg-surface shadow-sm border border-border/60` | |
| `.sheet-lift` | `shadow-lg` | |
| `.ruled-list` | `divide-y divide-border` hoặc list card (§5.6) | |
| `font-display` (serif) | `font-display` (giờ là sans 800) | rà lại size |
| `rounded-btn/card/sheet/chip` | `rounded-md/lg/xl/full` | |

`scripts/contrast.mjs`: thay danh sách cặp màu bằng các cặp mới (fg trên canvas/surface/surface-2; `*-fg` trên `*-soft` và trên surface; `on-primary` trên primary; trắng trên `c-red`, `c-coral`(chữ lớn), `c-mint`(chữ lớn)) cho cả light/dark. Mọi cặp chữ thường phải ≥ 4.5, chữ lớn/icon ≥ 3.

---

## 5. Component primitives (`components/ui/*`)

### 5.1 Button (`button.tsx`)
```
base: rounded-md font-semibold transition-[background,box-shadow,transform] active:scale-[0.97]
      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
variant:
  default   bg-primary text-on-primary hover:bg-primary-hover shadow-sm
  pressable bg-primary text-on-primary shadow-[0_4px_0_0_var(--primary-press)]
            active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--primary-press)]   ← CTA học (Bắt đầu ôn, Lật thẻ, Kiểm tra, Tiếp tục)
  secondary bg-primary-soft text-primary-fg hover:brightness-[0.97]
  outline   bg-surface border border-border-strong text-fg hover:bg-surface-2
  ghost     text-fg hover:bg-surface-2
  soft      (nhận prop `tone`: blue|mint|...): bg-c-{tone}-soft text-c-{tone}-fg
  destructive bg-danger-soft text-danger-fg; confirm xóa: bg-danger text-white
  white     bg-white text-primary-fg hover:bg-white/90 shadow-md   ← dùng trên hero xanh
  link      text-primary underline-offset-4 hover:underline
size: xs h-8 | sm h-9 rounded-sm | default h-11 | lg h-13 text-base rounded-lg | xl h-14 text-lg rounded-lg (CTA full-width màn học)
```
Thêm biến thể `pressable` theo tone cho nút đánh giá (§6.7).

### 5.2 Card (mới: `components/ui/card.tsx`)
```tsx
<Card variant="default|soft|solid|outline" tone="blue|coral|..." interactive? />
```
- default: `bg-surface rounded-lg shadow-sm border border-border/60 dark:border-border`
- soft: `bg-c-{tone}-soft rounded-lg` (không viền)
- solid: `bg-c-{tone} text-white rounded-xl shadow-md` (hero)
- interactive: `transition hover:-translate-y-0.5 hover:shadow-md`
Kèm `CardHeader`, `CardTitle`, `CardContent`. Thay toàn bộ `.sheet`.

### 5.3 IconTile (mới)
Ô vuông bo `rounded-md` size 40/48 chứa icon, `bg-c-{tone}-soft text-c-{tone}-fg` (hoặc solid + trắng). Dùng ở quick actions, mode tiles, settings rows, empty states, stats KPI.

### 5.4 Badge / Chip
`rounded-full px-2.5 h-6 text-xs font-semibold`; tones như Card. Badge "5 cần ôn" = `due`. Badge "Đã ôn xong" = `success` + icon check.

### 5.5 Input / Textarea / Select / InputGroup
`h-12 rounded-md bg-surface-2 border border-transparent px-4 text-base placeholder:text-fg-subtle
 hover:border-border-strong focus:bg-surface focus:border-primary focus:ring-4 focus:ring-primary/15`.
Label `text-sm font-semibold text-fg mb-1.5`. Lỗi: `border-danger ring-danger/15` + text `danger-fg`.

### 5.6 List rows
Thay `.ruled-list`: list nằm trong 1 Card, hàng `px-4 py-3.5 flex items-center gap-3`, ngăn cách `divide-y divide-border`, hover `bg-surface-2`, hàng cuối có chevron. Kiểu "grouped list" iOS.

### 5.7 Tabs / Segmented / SegmentedRadio / ToggleGroup
Track `bg-surface-2 rounded-full p-1`; item active `bg-surface shadow-sm text-fg font-semibold rounded-full`; inactive `text-fg-muted`. Animate indicator trượt (CSS `transition` trên pseudo/absolute pill) nếu dễ, không bắt buộc.

### 5.8 Progress
- Bar: `h-2.5 rounded-full bg-surface-3`, fill `rounded-full` màu theo ngữ cảnh (deck color / primary), transition width 400ms ease-spring.
- `ProgressRing` (`components/stats/progress-ring.tsx`): stroke 10–14 tròn đầu (`stroke-linecap="round"`), track `--surface-3` (hoặc trắng 25% trên hero), có prop `tone`. Số ở giữa sans 800.

### 5.9 Switch, Checkbox, Radio
Switch `h-7 w-12`, on = `bg-primary`, thumb trắng shadow-sm. Checkbox `rounded-[6px]` size 20, on = primary + check trắng.

### 5.10 EmptyState
Bố cục: IconTile lớn (72px, tone theo ngữ cảnh) hoặc Bin (nếu bật linh vật) + tiêu đề `text-lg font-bold` + mô tả `text-fg-muted` + nút. Nền `Card variant="soft"`. Xóa `InkFigure`.

### 5.11 Dialog / Sheet / Popover / DropdownMenu / Command
`rounded-xl bg-surface shadow-lg border border-border/60`; overlay `bg-black/40 backdrop-blur-sm`. Sheet mobile: kéo từ dưới, `rounded-t-xl`, có grabber `h-1.5 w-10 rounded-full bg-surface-3`. Dropdown item `rounded-sm h-10 px-3`.

### 5.12 Toast (sonner)
Theme theo token: `bg-surface shadow-lg rounded-lg border`, icon có màu (success mint, error red).

### 5.13 Avatar
Initials trên nền màu ổn định theo user id (palette §3.3, soft + fg), `rounded-full`, font 700.

### 5.14 LangMark
`EN` → chip `bg-en-soft text-en-fg`; `中` → chip `bg-zh-soft text-zh-fg`. `rounded-sm h-6 px-1.5 text-xs font-bold`.

### 5.15 Logo (`components/brand/logo.tsx`) + icon app
Mark mới: ô vuông `rounded-[10px]` nền `primary`, chữ "S" trắng 800, góc trên phải 1 chấm tròn `c-sun`. Wordmark "Sổ Từ" 800 `-0.03em`. Chạy lại `node scripts/gen-icons.mjs` (sửa script theo mark mới), favicon, apple-icon, maskable icon.

### 5.16 Linh vật Bin (`components/mascot/pup.tsx`)
Giữ nguyên hình dáng, 10 mood, animation, API (`PUP_MOODS` và unit test `tests/unit/mascot.test.ts` không đổi). Chỉ đổi màu sang **có màu đặc**:
```
--pup-ink: #2b2d3a (dark: #e9ebf2)    nét viền, stroke 2.5
--pup-fur: #ffffff (dark: #f3efe8)
--pup-ear: #c98b5a (dark: #b97a4c)    tai nâu đặc
--pup-muzzle: #f6e7d6
--pup-blush: color-mix(in oklab, var(--c-pink) 55%, transparent)
--pup-collar: var(--primary)          (thêm vòng cổ xanh + thẻ tên vàng c-sun nếu SVG cho phép)
```
`MascotSay`: lời thoại trong **bong bóng chat** (`bg-surface rounded-lg shadow-sm px-3.5 py-2.5` có đuôi nhỏ) thay vì "ghi chú lề".

---

## 6. Thiết kế từng màn

Mọi màn: chụp 390px và 1280px, light + dark (`scripts/screenshot.mjs`). Nền trang `bg-canvas`.

### 6.1 App shell (`components/app-shell/*`)

**Sidebar desktop (`app-nav.tsx`)**
- Rộng 248px, nền `canvas`, không viền phải, **không cột đỏ**.
- Trên: Logo. Bỏ dòng "Sổ từ vựng Anh – Trung" (chuyển vào tooltip/landing).
- Item: `h-10 rounded-md px-3 gap-3 text-[15px] font-medium text-fg-muted hover:bg-surface-2 hover:text-fg`. Active: `bg-surface shadow-sm text-fg font-semibold`, icon active `text-primary` strokeWidth 2.25. Bỏ gạch dọc 2px.
- Nhãn nhóm "Học" / "Khác": `text-xs font-semibold text-fg-subtle px-3`.
- Đáy: Card soft `primary-soft` chứa Bin (44px) + bong bóng câu thoại + nút `pressable` full-width "Ôn ngay" (giữ text), nếu có từ đến hạn thì hiện badge số `due`.

**Top bar**: sticky, `h-16`, `bg-canvas/80 backdrop-blur-xl`, border-b chỉ hiện khi đã cuộn (`data-scrolled`). Quick search trigger: `h-10 w-80 rounded-full bg-surface border border-border shadow-xs` + kbd `Ctrl K` chip. Phải: theme switch (ghost icon), avatar màu.

**Bottom nav mobile**: thanh nổi
```
fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] h-16 rounded-full
bg-surface/85 backdrop-blur-xl border border-border/60 shadow-lg
```
5 tab; tab active: icon nằm trong pill `bg-primary-soft text-primary-fg h-8 w-14 rounded-full` + label `font-semibold text-primary-fg`; inactive `text-fg-muted`. Nội dung trang cần `pb-28` để không bị che.

**FAB** (`fab.tsx`): tròn 56px `bg-primary text-white shadow-primary`, đặt trên bottom nav (bottom 92px) ở mobile.

**Quick search (Command)**: dialog `rounded-xl` top 15vh, input lớn `h-14 text-lg`, kết quả là hàng có LangMark + nghĩa, hàng active `bg-primary-soft`.

**User menu**: dropdown có header (avatar + tên + email), các mục có icon.

### 6.2 Today (`app/(app)/today/page.tsx`) — bento

Mobile (1 cột) / desktop (`lg:grid-cols-12`, max-w-6xl):
```
┌──────────────────────────────────────────────┬──────────────────┐
│ Thứ Bảy, 24 tháng 10 (text-sm muted)         │                  │
│ Chào buổi sáng, Demo!  (h1 800, giữ text E2E)│                  │
├──────────────────────────────────────────────┤  STREAK  (sun)   │
│ HERO  bg-primary, rounded-xl, p-6/p-8        │  🔥icon tile     │
│  ┌ ring trắng ┐  33                          │  2  ngày (800)   │
│  │  23/33     │  từ cần ôn hôm nay           │  ● ● ● ● ● ◉ ○   │
│  └────────────┘  [EN 10 ôn·10 mới][中 13 ôn] │  T2 … CN         │
│  [ ▶ Bắt đầu ôn ] (white, lg)  khoảng 11 phút│ Còn 1 ngày nghỉ… │
│                         Bin (cheer) góc phải ├──────────────────┤
│                                               │ MỤC TIÊU (mint)  │
│                                               │ ring 12/20 từ    │
├───────────────┬───────────────┬──────────────┴──────────────────┤
│ + Thêm từ     │ ✎ Luyện tập   │ ◎ Khám phá        (3 tile soft  │
│ (mint)        │ (grape)       │ (orange)           có IconTile) │
├───────────────┴───────────────┴─────────────────────────────────┤
│ Bộ từ đang học                                 Tất cả >          │
│ [deck card][deck card][deck card] → cuộn ngang mobile, grid lg  │
├──────────────────────────────────────────────────────────────────┤
│ 12 tuần gần đây (heatmap card)                Xem thống kê >     │
└──────────────────────────────────────────────────────────────────┘
```
- Hero: số tổng 800 `text-3xl` trắng; chip EN/中 trên nền `white/15` chữ trắng; nút `white` size `lg` text "Bắt đầu ôn" (giữ — E2E). Khi 0 từ đến hạn: hero chuyển `success` solid, Bin `cheer`, text "Hôm nay ôn xong rồi" + nút white "Luyện thêm" + gợi ý "Học từ mới".
- Bin + lời thoại: bong bóng nằm cạnh lời chào (mobile) hoặc Bin đứng trên mép hero (desktop).
- Streak: ngày đã học = chấm tròn 32px `bg-streak` có check trắng; hôm nay chưa học = viền đứt `border-streak`; ngày nghỉ miễn phí = `bg-streak-soft` icon snowflake. Giữ text "Chuỗi ngày" và số streak đứng riêng (E2E `getByText(/^1$/)`).
- Mục tiêu ngày: nếu đã có dữ liệu daily goal thì hiện ring mint; nếu chưa có thì bỏ khối này (không thêm logic mới) — streak card chiếm cả cột.
- Footer liên hệ: thu nhỏ thành 1 hàng `text-sm` + 2 nút ghost icon, cuối trang.
- Số liệu đếm lên (count-up 600ms) khi tải lần đầu; tắt khi reduced motion.

### 6.3 Thống kê (`stats/page.tsx`, `components/stats/*`)
- Hàng KPI: 4 Card soft (blue: tổng từ, mint: đã thuộc, sun: streak dài nhất, grape: XP), mỗi card IconTile + số 800 + nhãn.
- `reviews-chart.tsx` (recharts): bar bo đầu `radius={[8,8,0,0]}`, màu primary; lưới ngang `--border` đứt; tooltip là Card.
- `heatmap.tsx`: ô 14px `rounded-[4px]` gap 3px; thang 5 mức từ `surface-2` → `primary` (dùng `color-mix` 20/40/65/100%); hôm nay có ring `fg`. Viết lại `.heat-*`.
- `streak-week.tsx`: như §6.2.
- Phân bố theo trạng thái thẻ (mới/đang học/thuộc): stacked bar ngang dày 14px bo tròn, 3 màu (sun/blue/mint) + legend chip.

### 6.4 Bộ từ (`decks/page.tsx`, `components/deck/*`)
- Header: h1 "Bộ từ" + nút `default` "Tạo bộ từ". Filter segmented (§5.7).
- **DeckCard mới** (thay `DeckCover` + `deck-list.tsx`):
```
┌─────────────────────────────┐
│ [soft color block h-24     ]│  ← bg-c-{color}-soft, bo trên rounded-lg
│  LangMark      🔒/👥 icon   │     giữa block: emoji/ảnh của từ đầu tiên hoặc
│  "Đồ ăn Trung Hoa" (fg 700) │     chữ Hán/chữ cái đầu cỡ lớn màu c-{color}-fg
├─────────────────────────────┤
│ 10 từ · Minh Anh            │  (meta: text-sm muted)
│ ▓▓▓▓▓▓░░░░  60% đã học      │  bar màu c-{color}
│ [5 cần ôn] (badge due)      │  hoặc [✓ Đã ôn xong] success
└─────────────────────────────┘
```
  Grid `sm:grid-cols-2 xl:grid-cols-3 gap-4`, card `interactive`. Link card giữ accessible name chứa tên bộ (E2E `/Từ vựng tiếng Anh của tôi/`).
- `deck-cover.tsx` → `deck-art.tsx` (block màu ở trên), dùng lại ở Today, Explore, public deck.
- Section "Bộ từ của nhóm" giống, thêm avatar nhóm nhỏ.
- Empty: EmptyState + "Thêm bộ từ mẫu" (`sample-decks-button.tsx`).

### 6.5 Chi tiết bộ từ (`decks/[deckId]/page.tsx`)
- Header card soft màu bộ: DeckArt lớn trái (desktop), tên h1, meta, actions menu (`deck-actions-menu.tsx`) icon button.
- `study-strip.tsx`: hàng 4 nút mode lớn dạng tile màu (Học/Kiểm tra/Ghép thẻ/Lật thẻ theo §3.3) + 1 nút `pressable` "Ôn N từ đến hạn" nếu có.
- Danh sách từ (`deck-words.tsx`): grouped list (§5.6). Mỗi hàng: thumbnail 44px (ảnh/emoji trong `rounded-md bg-surface-2`), từ (700) + phiên âm/pinyin (muted), nghĩa (muted, truncate), status dot màu (mới sun / đang học blue / thuộc mint / tạm dừng subtle). Thanh tìm + lọc phía trên.
- Settings / import / new: form trong Card, input §5.5, nút lưu sticky đáy mobile.

### 6.6 Từ: thêm/sửa/chi tiết (`components/word/*`)
- **`word-specimen.tsx`** viết lại thành `WordHero`: Card `rounded-xl` không kẻ dòng; nền `bg-en-soft` hoặc `bg-zh-soft` rất nhạt (hoặc surface + dải màu ngôn ngữ 4px trên cùng). Từ tiếng Anh `text-word font-bold`; chữ Hán `font-hanzi-sans text-hanzi` với pinyin màu thanh điệu bên dưới từng chữ (không ô). IPA `font-ipa text-fg-muted`. Nút phát âm: tròn 44px `bg-surface shadow-sm`.
- Word detail: WordHero + các khối Card: Nghĩa (lớn), Ví dụ (mỗi câu một hàng có nút loa; từ đích **in đậm màu primary**, không highlighter), Ảnh (bo `rounded-lg`), Từ liên quan (chips), Ghi chú; với chữ Hán có khối "Thứ tự nét" (`stroke-order.tsx`). Nút "Hỏi gia sư" `soft tone=grape`.
- Word form: giữ cấu trúc tối giản hiện có (theo CLAUDE.md). Ô "Từ" lớn `h-14 text-xl` + nút `Gợi ý` `secondary` với icon Sparkles. Panel gợi ý AI: Card soft `primary-soft`, sense chips chọn được (`rounded-full`, selected = `bg-primary text-white`). Các hàng thu gọn "Thêm chi tiết" = accordion trong grouped list. Image picker: grid ảnh `rounded-md`, ảnh chọn có ring primary + check.
- `pos-badge.tsx`: chip tone grape.

### 6.7 Ôn tập (`(study)/review`, `components/review/*`)
- Nền màn: `canvas`. Top: nút đóng ghost, **progress bar dày `h-3`** màu primary bo tròn, Bin 28px trượt theo đầu bar (giữ), bộ đếm `0/33` tabular bên phải.
- **Flashcard** (`flashcard.tsx`): `rounded-xl bg-surface shadow-lg`, max-w 520, min-h 440; dải màu ngôn ngữ 6px ở mép trên (blue EN / coral 中). Mặt trước: ảnh/emoji trong khối `rounded-lg bg-surface-2` 120px → từ (EN `text-word font-bold`, 中 `text-hanzi font-hanzi-sans`) → pinyin/IPA → nút loa tròn → hint "Chạm để lật" `text-fg-subtle text-sm`. **Không 田字格, không kẻ dòng.** Mặt sau: nghĩa tiếng Việt `text-2xl font-bold`, POS chip, ví dụ trong khối `surface-2 rounded-lg`, "Xem chi tiết" link. Flip 3D 450ms.
- CTA: nút `pressable xl` full width "Lật thẻ" (giữ text).
- **Rating** (group "Bạn nhớ từ này thế nào?" giữ nguyên): 4 nút `pressable` theo tone, mỗi nút 2 dòng (nhãn 700 + khoảng thời gian `text-xs opacity-80`):
  Quên = `#e5484d` (viền đáy `#b4232a`) · Khó = `#c25e00` (viền `#8a4300`) · Nhớ = `primary` (viền `primary-press`) · Dễ = `#08845a` (viền `#055c3e`); chữ trắng. Khó/Dễ dùng sắc đậm hơn palette để chữ trắng đạt AA — thêm 4 màu này thành token `--rate-again/hard/good/easy` (+ `-press`, bản dark tự chọn sao cho đạt AA). Phím tắt 1–4 hiện kbd nhỏ trên desktop. Xem `mockups/03-review.png`.
- **Celebration** (`components/review/celebration.tsx`, thay `SealStamp`) + `session-summary.tsx`:
  - Ring lớn 160px fill đến % đúng (animate), số ở giữa; Bin `cheer` cạnh ring.
  - Tiêu đề "Xong phiên rồi!" (giữ), 3 KPI chip: số từ (blue), đúng % (mint), XP (grape), streak (sun nếu tăng: "Chuỗi 3 ngày" với icon flame nảy 1 lần).
  - Confetti 1 lần ~1.2s: dùng `canvas-confetti` (thêm dependency, ~6KB, load dynamic) với màu palette; tắt khi `prefers-reduced-motion`.
  - Nút: `pressable` "Học tiếp"/"Làm tiếp" (giữ text E2E) + `outline` "Về trang chủ".

### 6.8 Luyện tập (`practice/page.tsx`, `components/practice/*`)
- **Picker** (`practice-setup.tsx`): mỗi mode là tile:
```
┌──────────────────────┐
│ [IconTile solid c-x] │  ← 48px, icon trắng
│ Học (700)            │
│ Học theo vòng tới…   │  (muted, 2 dòng)
└──────────────────────┘
```
  Tile nền `surface`, hover viền `c-x`; **selected** = nền `c-x-soft`, ring 2px `c-x`, badge check tròn góc phải. Hai nhóm "Học bộ từ" (4 tile, `grid-cols-2 lg:grid-cols-4`) và "Luyện riêng từng kỹ năng" (4 tile). Phía dưới: Card cài đặt (bộ từ select, số từ segmented, nguồn từ segmented, switch "Tính vào ôn tập") rồi nút `pressable xl` "Bắt đầu luyện" sticky đáy mobile.
- **Câu hỏi** (`question-parts.tsx`): prompt trong Card `rounded-xl`; đáp án là nút lớn `h-14 rounded-lg bg-surface border-2 border-border shadow-[0_3px_0_0_var(--border)]` (pressable trung tính) có số thứ tự kbd bên trái. Chọn đúng: `bg-success-soft border-success text-success-fg` + check pop; sai: `bg-danger-soft border-danger` + shake. Giữ group "Các đáp án", "Đúng hay sai?".
- **Feedback sheet**: trượt từ dưới, nền `success-soft` (đúng, tiêu đề "Đúng rồi!" màu success-fg + Bin happy 40px) hoặc `danger-soft` (sai, hiện đáp án đúng); nút `pressable` theo tone "Tiếp tục".
- **Test** (`test-session.tsx`): mỗi câu `section[aria-labelledby]` (giữ), header "Câu 1:" chip; thanh "Đã làm x/y" sticky; kết quả: ring + danh sách câu sai trong grouped list; "Làm lại câu sai".
- **Learn** (`learn-session.tsx`): progress chia 3 chặng màu (mới sun → đang học blue → thuộc mint).
- **Match** (`match-game.tsx`): ô `rounded-lg h-20 bg-surface shadow-sm border-2`; đang chọn ring primary; ghép đúng → `success-soft` rồi thu nhỏ biến mất (`tile-gone` giữ); sai → `danger` shake. Đồng hồ chip lớn tabular. Kỷ lục: Card sun.
- **Lật thẻ** (`flashcard-deck.tsx`): dùng lại Flashcard §6.7; 2 nút "Chưa thuộc" (orange soft) / "Đã thuộc" (mint soft); swipe giữ.
- **Gõ từ / Nghe / Điền**: input lớn `h-14 text-xl text-center`; nút loa to 72px tròn `bg-c-sun` cho mode Nghe.
- **Writing pad** (`writing-pad.tsx`): giữ lưới hướng dẫn (ngoại lệ §4) nhưng nét `--border` đứt, nền `surface`, `rounded-xl`.
- `mode-look.tsx` là nguồn duy nhất của màu/icon/nhãn mode (§3.3).

### 6.9 Từ hay quên (`hard-words`)
Header + segmented ngôn ngữ; grouped list từ với chip "quên N lần" (danger soft); thanh hành động trên cùng: `pressable` "Luyện các từ này", `soft grape` "Hỏi gia sư".

### 6.10 Khám phá / bộ từ công khai / tham gia (`explore`, `(public)/d/[slug]`, `(public)/join/[code]`)
- Explore: ô search lớn bo tròn full; chip lọc ngôn ngữ/chủ đề cuộn ngang; grid DeckCard (§6.4) có số người theo dõi + nút "Theo dõi" (`subscribe-button.tsx`, secondary → khi đã theo dõi: outline + check).
- Public deck: hero soft màu bộ + DeckArt lớn, CTA `pressable` "Thêm vào …" (giữ text E2E `Thêm vào <deck name>`), list từ.
- Join: Card giữa màn, avatar nhóm lớn, nút `pressable`.

### 6.11 Nhóm (`groups/*`, `components/group/*`)
- List nhóm: Card có `group-avatar` (tròn, màu theo id, initials 800) + tên + số thành viên + avatar stack 3 người.
- Group page: header soft; tabs (Bảng xếp hạng / Hoạt động / Bộ từ / Thành viên).
- **Leaderboard**: top 3 là podium (3 cột cao khác nhau, màu sun/blue-ish silver (surface-3)/orange, avatar trên đỉnh, huy hiệu số), phần còn lại grouped list; hàng của mình `bg-primary-soft` + "(bạn)". XP chip grape.
- Activity feed: timeline đơn giản, avatar + câu + thời gian muted; streak dùng flame sun.
- Invite panel: Card có mã mời lớn tabular + nút copy + QR (bỏ `.qr-paper`, QR trong khung `rounded-lg bg-white p-3`).

### 6.12 Gia sư (`chat/*`, `components/chat/*`)
- List thread: grouped list, mỗi thread có IconTile grape `MessageCircle`. Giữ `listitem` chứa nút xóa.
- Chat view: tin người dùng = bubble phải `bg-primary text-white rounded-2xl rounded-br-md`; tin gia sư = bubble trái `bg-surface shadow-sm rounded-2xl rounded-bl-md` với avatar Bin 32px (giữ prefix sr-only "Gia sư:"). Composer dính đáy: `rounded-full bg-surface shadow-lg` input + nút gửi tròn primary. `suggest-word-card.tsx`: Card soft blue với từ + nút "Thêm từ".
- New chat: gợi ý câu hỏi dạng chip lớn nhiều màu.

### 6.13 Landing (`app/(marketing)/page.tsx`, `components/marketing/*`)
Viết lại hoàn toàn:
1. **Nav**: logo trái; phải "Đăng nhập" (ghost) + "Đăng ký" (default). Sticky blur.
2. **Hero** (2 cột desktop): trái — tiêu đề 800 `text-display` (VD: "Học từ vựng Anh – Trung, nhớ lâu mà nhẹ nhàng"), mô tả `text-lg muted`, CTA `pressable lg` "Tạo sổ miễn phí" + link "Tôi đã có tài khoản". Phải — bố cục minh họa: khối nền `primary-soft rounded-[40px]`, bên trong 1 flashcard thật (từ "resilient") nghiêng nhẹ -3°, 1 card chữ Hán 坚强 + pinyin màu, chip "Streak 14 ngày" (sun), chip "+20 XP" (grape), Bin `wave` đứng góc. Tất cả là component thật (không ảnh), không blob.
3. **Logo/social proof strip** (tùy chọn): "Dùng được trên điện thoại, cài như app" + icon.
4. **Tính năng — bento grid** 3 cột × 2 hàng: (a) Gợi ý AI khi thêm từ (blue, rộng 2 cột, mini UI form), (b) Ôn đúng lúc sắp quên — FSRS (mint, mini rating buttons), (c) 8 cách luyện (orange, lưới icon mode), (d) Chữ Hán: pinyin màu + thứ tự nét (coral), (e) Học cùng bạn bè (grape, mini leaderboard), (f) Offline/PWA (teal).
5. **Cách hoạt động**: 3 bước có số tròn lớn màu + ảnh chụp app thật trong khung điện thoại (cập nhật `scripts/landing-shots.mjs` để chụp lại sau redesign).
6. **FAQ**: accordion trong Card, item `rounded-lg`.
7. **CTA cuối**: band `bg-primary rounded-xl` chữ trắng + Bin + nút `white`.
8. **Footer**: logo, link Liên hệ, Facebook/Zalo.

### 6.14 Auth & Onboarding (`(auth)/*`, `(onboarding)/welcome`, `components/auth/*`)
- Desktop: split 2 cột. Trái (`lg:` only): panel `bg-primary rounded-xl m-3` chữ trắng, tiêu đề lớn, Bin `wave` lớn, vài chip từ vựng trôi tĩnh (không animation lặp). Phải: form max-w-sm.
- Mobile: logo + Bin nhỏ trên cùng, form bên dưới, không card viền.
- `auth-card.tsx` bỏ ruled paper. Input §5.5; nút `pressable lg` full width. Giữ mọi label/text E2E (Email, Mật khẩu, Đăng nhập, Tạo tài khoản, Hiện mật khẩu, …).
- Welcome: stepper 2 bước có progress dots; chọn ngôn ngữ = 2 tile lớn (EN blue soft / 中 coral soft, radio /Tiếng Anh/ giữ), switch "Thêm bộ từ mẫu" giữ, nút "Tiếp tục"/"Bắt đầu học".

### 6.15 Cài đặt (`settings/*`)
Kiểu iOS: các nhóm grouped list trong Card; mỗi hàng có IconTile 32px màu riêng (Hồ sơ blue, Học tập mint, Giao diện grape, Linh vật sun, Nhắc nhở orange, Mật khẩu teal, Dữ liệu blue, Liên hệ pink, Xóa tài khoản red). Desktop: `settings-nav.tsx` là sidebar trái dạng pill. Theme chọn bằng 3 tile preview mini (Sáng/Tối/Theo máy).

### 6.16 Liên hệ, Offline, 404
- Liên hệ: Card giữa, Bin `wave`, 2 nút lớn Facebook (blue soft) / Zalo (teal soft).
- Offline: EmptyState với IconTile `WifiOff` sun + "Bạn đang offline" (giữ) + "Thử lại".
- 404: Bin `surprised` + "Không tìm thấy trang" + nút về Hôm nay.

---

## 7. Motion

| Khoảnh khắc | Hiệu ứng |
|---|---|
| Vào trang (lần đầu) | Các khối bento fade-up 8px, stagger 40ms, 260ms (`@starting-style` hoặc class + `animation-delay`) |
| Hover card interactive | translateY(-2px) + shadow-md, 200ms |
| Nhấn nút | scale .97 / pressable lún 3px |
| Lật thẻ | rotateY 450ms ease-out |
| Đáp án đúng | nền chuyển success-soft + icon check scale 0→1.15→1 (ease-spring) |
| Đáp án sai | shake 240ms (giữ `--animate-shake`) |
| Progress bar | width transition 400ms ease-spring |
| Số liệu Today/summary | count-up 600ms |
| Xong phiên | ring fill 800ms + confetti 1 lần |
| Streak tăng | flame bounce 1 lần |
| Bin | giữ blink + tail; mood marks fade 1 lần |

Tất cả tắt/giảm trong `@media (prefers-reduced-motion: reduce)`.

---

## 8. Ràng buộc kỹ thuật (không được phá)

- Mọi chuỗi trong `docs/redesign/e2e-strings.md` và cấu trúc ARIA ở đó giữ nguyên. Nếu buộc phải đổi, sửa test cùng commit và ghi lý do.
- `tests/unit/mascot.test.ts` phải pass (không đổi tên mood / `say()`).
- Không đổi server actions, schema, route, logic SRS/practice.
- Touch target ≥ 44px; icon button có `aria-label`; focus ring rõ (`outline-primary`).
- Contrast AA: chạy `node scripts/contrast.mjs` (đã cập nhật) phải pass.
- Không hex thô trong `components/` và `app/` ngoài `globals.css`, `layout.tsx` (themeColor), `manifest.ts`, script icon.
- CSP: `canvas-confetti` bundle cục bộ qua npm (không CDN) nên không cần sửa CSP.
- Performance: không thêm font mới ngoài weight 800 của Be Vietnam Pro; xóa Literata giúp nhẹ hơn. Confetti load bằng `import()` động.
- Dark mode phải đẹp ngang light — kiểm tra mọi màn.

---

## 9. Cập nhật tài liệu

- Tạo `docs/redesign-v2/` chứa bản plan này (copy file này vào `docs/redesign-v2/REDESIGN_V2.md`), `before/` và `after/` screenshots.
- `docs/redesign/REDESIGN_PLAN.md`: thêm dòng đầu "Superseded by docs/redesign-v2/REDESIGN_V2.md".
- `CLAUDE.md`:
  - Thay đoạn "Design system 'Vở mực tím' …" trong Conventions bằng tóm tắt V2: tokens (`canvas`, `surface`, `surface-2/3`, `fg`, `fg-muted`, `fg-subtle`, `border`, `primary*`, semantic `en/zh/success/danger/due/streak/xp` với `-soft`/`-fg`, palette `c-*`), primitives (`Card`, `IconTile`, `Button` variants incl. `pressable`/`white`/`soft`, `DeckArt`, `WordHero`, `Celebration`, `ProgressRing`, `LangMark`), radius (`rounded-md/lg/xl/full`), font (Be Vietnam Pro only + Noto Sans SC), motion rules.
  - Thay mục "anti-AI checklist" trong Deviations bằng NÊN/KHÔNG của §2.
  - Cập nhật đoạn mascot (màu mới, bong bóng thoại).

---

## 10. Các phase (mỗi phase 1 commit, chạy `pnpm lint && pnpm typecheck && pnpm test` trước commit)

**Phase 0 — Chuẩn bị**
- Tạo branch `redesign-v2`. Copy plan vào `docs/redesign-v2/`.
- Chụp before: `node scripts/screenshot.mjs --all docs/redesign-v2/before` (cần `pnpm dev --port 3100` + `pnpm db:seed`).
- Đọc: `app/globals.css`, `components/ui/*`, `components/app-shell/*`, `app/(app)/today/page.tsx`, `components/review/flashcard.tsx`, `components/word/word-specimen.tsx`.

**Phase 1 — Tokens & nền móng**
- Viết lại `globals.css` theo §3 + xóa §4. Font: bỏ Literata, thêm weight 800. `themeColor`, manifest.
- Codemod token theo §4.1 (sed cho cặp 1-1; `seal` rà tay). Đổi radius class.
- Cập nhật `scripts/contrast.mjs`, chạy pass.
- Tiêu chí: build chạy, không còn token cũ (lệnh rg §4 rỗng, trừ những file sẽ viết lại ở phase sau — ghi TODO), app chưa đẹp cũng được nhưng không vỡ.

**Phase 2 — Primitives**
- Button, Card (mới), IconTile (mới), Badge, Input/Textarea/Select/InputGroup, Tabs/Segmented/SegmentedRadio/ToggleGroup, Switch/Checkbox/Radio, Progress, ProgressRing, Dialog/AlertDialog/Sheet/Popover/Dropdown/Command, Tooltip, Toast, Skeleton, Avatar, EmptyState, LangMark, Logo, Pup recolor, MascotSay bubble.
- Tạo trang dev ẩn `app/(app)/_ui-kit/page.tsx` (hoặc `/dev/ui`, chỉ bật khi `NODE_ENV !== "production"`) hiển thị mọi primitive ở cả 2 theme để chụp kiểm tra.

**Phase 3 — App shell**: sidebar, top bar, bottom nav nổi, FAB, quick search, user menu, back link, theme switch. Padding đáy nội dung.

**Phase 4 — Today + Stats** (§6.2, §6.3), `deck-colors.ts` mới, heatmap, streak-week, charts.

**Phase 5 — Bộ từ** (§6.4, §6.5): DeckArt, DeckCard, deck detail, study strip, deck words list, new/settings/import/add.

**Phase 6 — Từ** (§6.6): WordHero, word detail, word form, AI suggest panel, image picker, list editors.

**Phase 7 — Học & luyện** (§6.7, §6.8): review, flashcard, session bar, rating, celebration (+ `canvas-confetti`), summary, practice picker, question parts, feedback sheet, test/learn/match/flashcard/typing/listen/cloze, writing pad.

**Phase 8 — Xã hội & khám phá** (§6.10, §6.11): explore, public deck, join, groups list/detail/settings, leaderboard podium, activity, invite.

**Phase 9 — Còn lại** (§6.9, §6.12, §6.15, §6.16, §6.14 onboarding): hard words, chat, settings, liên hệ, offline, 404, welcome.

**Phase 10 — Landing & auth** (§6.13, §6.14), icon app mới (`gen-icons.mjs`), `landing-shots.mjs` chụp lại ảnh landing.

**Phase 11 — Dọn dẹp & nghiệm thu**
- Lệnh rg §4 trả về rỗng. Xóa CSS/asset không dùng (hero-hanzi serif, `.qr-paper`, …).
- `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e` pass.
- Chụp after: `node scripts/screenshot.mjs --all docs/redesign-v2/after` (+ `--dark`).
- Cập nhật tài liệu §9.

---

## 11. Checklist nghiệm thu (tự soát từng màn, light + dark, 390px + 1280px)

- [ ] Không còn kẻ dòng, lề đỏ, ô ly (trừ writing pad), con dấu, serif.
- [ ] Mỗi màn có ít nhất 2–3 màu từ palette, có một điểm nhấn rõ (hero hoặc CTA).
- [ ] Today nhìn 1 giây biết: cần ôn bao nhiêu, nút bấm ở đâu, streak bao nhiêu.
- [ ] Bộ từ phân biệt được bằng màu; chữ trên bìa đọc được.
- [ ] Màn chọn luyện tập: 8 mode 8 màu, trạng thái chọn rõ.
- [ ] Flashcard to, sạch, nút đánh giá 4 màu.
- [ ] Xong phiên có ăn mừng (ring + Bin + confetti), tắt khi reduced motion.
- [ ] Bottom nav nổi, tab active rõ; nội dung không bị che.
- [ ] Bin có màu, lời thoại trong bong bóng.
- [ ] Dark mode: không màu tím, nền trung tính, màu palette sáng hơn, chữ đủ tương phản.
- [ ] Contrast script pass; E2E pass; không hex thô trong component.
- [ ] So ảnh before/after: khác biệt rõ rệt, trông như app học ngôn ngữ 2026 chứ không phải tài liệu.
