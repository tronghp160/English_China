# Sổ Từ — Kế hoạch thiết kế lại toàn bộ giao diện ("Vở mực tím")

> File này viết cho **Claude Code**. Đọc hết một lượt trước khi sửa code, rồi làm theo từng giai đoạn ở §9.
> Repo: `tronghp160/English_China` (Next.js 16, React 19, Tailwind v4, shadcn/ui `radix-nova`, Supabase).
> Plan viết dựa trên commit `d7802e3` (đã có linh vật Bin, 3 chế độ Học / Kiểm tra / Ghép thẻ, công tắc sáng/tối ở header, trang Thống kê mới). Nếu repo đã đi xa hơn commit này, đọc `git log d7802e3..HEAD` và mục "Deviations" trong `CLAUDE.md` trước, rồi áp dụng plan cho phần mới theo cùng tinh thần.
> Mục tiêu duy nhất: giao diện **đẹp, hiện đại, có cá tính riêng**, và **không ai nhìn vào mà nói "giao diện AI quá"**.
> Chỉ đổi giao diện. **Không** đổi logic, server action, schema, route, tên field form, hay hành vi SRS.

### Quyết định của chủ repo — phải giữ
Các điều sau do chủ repo chủ động chọn (ghi trong `CLAUDE.md`). Plan này **thiết kế lại cách chúng trông**, không xóa chúng:
1. **Linh vật Bin** (chó con, 10 biểu cảm, vuốt ve được, đổi tên được, tắt được trong Cài đặt). Giữ nguyên tính năng, vẽ lại theo §5.8.
2. **Trang Hôm nay không có thẻ "Mục tiêu ngày"** (vòng tiến độ + XP). Không thêm lại. XP, mục tiêu ngày vẫn tồn tại ở Cài đặt, tổng kết phiên, bảng xếp hạng nhóm.
3. **Thống kê** dùng chữ dễ hiểu: "Từ đã nhớ / Lượt ôn / Nhớ đúng / Ngày có học"; thanh phân bố theo từng ngôn ngữ "Chưa học / Đang tập nhớ / Đã nhớ / Nhớ chắc"; mỗi mục có một dòng giải thích. Giữ chữ, đổi trình bày.
4. **Công tắc sáng/tối một chạm** ở header (`theme-switch.tsx`), ngoài lựa chọn 3 chế độ trong Cài đặt.
5. **3 chế độ học kiểu Quizlet** (Học, Kiểm tra, Ghép thẻ) đứng đầu danh sách chế độ và có nút nhanh trên trang bộ từ.
6. Sidebar desktop có thẻ Bin + nút "Ôn ngay" ở cuối và chia nhóm "Học" / "Khác".

---

## 0. Đọc trước khi làm

1. Đọc `CLAUDE.md`, `AGENTS.md` (Next 16 khác bản bạn biết — đọc `node_modules/next/dist/docs/` khi đụng API), `app/globals.css`, `components/ui/button.tsx`, `components/app-shell/*`.
2. **Test E2E bám vào chữ trên giao diện.** Trước khi đổi bất kỳ câu chữ nào (nút, tiêu đề, aria-label), chạy
   `rg -n "getByRole|getByText|getByLabel|name:" tests/e2e` và giữ nguyên những chuỗi test đang dùng. Danh sách chuỗi bị khóa ở thời điểm viết plan nằm ở §8.1 — **không đổi** các chuỗi đó. `tests/unit/mascot.test.ts` cũng khóa tên mood (`cool/cheer/happy/sad…`) và hành vi `say()`.
3. Sau mỗi giai đoạn: `pnpm lint && pnpm typecheck && pnpm test`, rồi chụp màn hình 390px và 1280px, sáng và tối:
   `MSYS_NO_PATHCONV=1 BASE_URL=http://localhost:3100 node scripts/screenshot.mjs /today today [--dark]`.
   **Tự xem ảnh chụp** và sửa trước khi sang giai đoạn kế. Đăng nhập bằng tài khoản demo (`pnpm db:seed`, `demo@example.com` / `sotu1234`).
4. Mỗi giai đoạn một commit. Cập nhật mục "Conventions" trong `CLAUDE.md` ở giai đoạn cuối (§9, P8).

---

## 1. Hiện trạng và vì sao nó "trông như AI"

Giao diện hiện tại ("Vở màu") làm tốt phần kỹ thuật (token, AA contrast, mobile-first, reduced motion), nhưng gần như mọi lựa chọn thị giác đều là **mặc định của trang do AI sinh ra**:

| Dấu hiệu hiện có | Ở đâu | Vì sao bị nhận ra |
|---|---|---|
| Gradient tím → hồng → xanh (`.hero-gradient`) cho mọi thẻ CTA | landing, auth, Today, CTA cuối trang | Gradient tím là "chữ ký" số 1 của UI do AI tạo |
| 3 đốm màu mờ cố định sau nền (`body` radial-gradient) | toàn app | Trang trí không mang thông tin |
| Emoji trang trí khắp nơi (🧠 🎉 🚀 📚 🔥 👋 🦊…) + `animate-float` | Today, landing, empty state, summary, nhóm | Emoji lơ lửng = template |
| Một từ trong tiêu đề được tô highlighter ("vui như chơi game") | landing H1 | Lỗi typographic "tô một từ" kinh điển |
| Nunito 900 bo tròn cho mọi heading | toàn app | Nhìn như app trẻ em/game chung chung |
| Nút 3D dày (`.btn-3d`) ở mọi nơi | toàn app | Bắt chước Duolingo |
| Mỗi mục điều hướng một màu kẹo (sun/sky/grape/pink/jade) | nav, mode card, feature card | Cầu vồng không mã hóa thông tin |
| Thẻ trắng bo 20px + bóng tím giống hệt nhau cho mọi thứ | toàn app | "SaaS card kit" |
| Chuỗi meta nối bằng `·` ("Tiếng Anh · 24 từ · của Minh") | deck card, word page, nhóm | Template chrome |
| Mọi card `hover:-translate-y-0.5` | deck list, explore, nhóm | Hover chung chung |
| Confetti khi xong phiên | review summary | Ăn mừng kiểu template |
| Thẻ "số to + nhãn nhỏ + gradient" | Today (số từ cần ôn), stats | Bố cục hero mặc định |
| Bin vẽ kiểu sticker phẳng tô màu kem, kèm lấp lánh vàng, tim hồng, chữ "z z" Nunito, nhún nhảy liên tục | `components/mascot/pup.tsx` | Trông như một linh vật app học ngôn ngữ nào cũng có; chuyển động không ngừng làm rối mắt |
| Lời Bin chứa emoji (🐾 💜 🦴 🔥 🏆 🎉) và bong bóng thoại có bóng | `lib/mascot/lines.ts`, `mascot-say.tsx` | Vừa có linh vật vừa có emoji = trang trí chồng trang trí |
| Mỗi chế độ luyện một ô icon màu kẹo (`MODE_LOOK`) | chọn chế độ, nút nhanh trang bộ từ | Cầu vồng không mang nghĩa |
| Sidebar: hàng active tô nền màu riêng, icon nghiêng khi hover, hàng trượt khi hover | `SideNav` | Hiệu ứng hover trên mọi thứ |
| Ô số liệu có emoji góc (🧠 🃏 🎯 📅) | `/stats` | Lưới ô số giống mọi dashboard |

**Kết luận:** giữ nguyên cấu trúc tốt (route, component, token *tên*), thay **toàn bộ ngôn ngữ thị giác**.

---

## 2. Skill thiết kế cần dùng (cài trước khi bắt đầu)

Dùng skill như **công cụ kiểm tra và kỷ luật**, không để skill nào tự chọn phong cách — phong cách đã được chốt ở §3. Lệnh cài có thể đổi theo thời gian: **mở README của từng repo để lấy lệnh đúng** trước khi chạy, và đọc SKILL.md trước khi cài skill bên thứ ba.

| Skill | Nguồn | Dùng để | Khi nào |
|---|---|---|---|
| **frontend-design** (Anthropic) | `anthropics/claude-code` (plugin `frontend-design`) | Kỷ luật chống "AI slop": typography có chủ đích, không template chrome, một điểm nhấn duy nhất | Đọc ngay từ đầu, áp dụng mọi giai đoạn |
| **Web Interface Guidelines** (Vercel) | `vercel-labs/agent-skills` | Audit a11y, focus, form, hiệu năng React | Cuối mỗi giai đoạn: chạy audit trên file vừa sửa |
| **Emil Kowalski motion** | `emilkowalski/skill` | Chuyển động tinh tế: easing, thời lượng, spring cho flip/stamp/sheet | P4 (review/practice) và P6 |
| **Refactoring UI** | `LovroPodobnik/refactoring-ui-skill` | Audit phân cấp, khoảng cách, màu, bóng | Review ảnh chụp sau P3, P5 |
| **UI/UX Pro Max** | `nextlevelbuilder/ui-ux-pro-max-skill` | Chỉ dùng phần checklist UX/a11y. **Không** dùng nó sinh design system/palette — sẽ ra phong cách generic | Tùy chọn, P8 |
| **Taste Skill** | `Leonxlnx/taste-skill` | Đặt độ "đậm/nhạt" (variance thấp, motion thấp, density vừa) | Tùy chọn |

Thiết lập cho Taste Skill nếu dùng: `variance: low-medium`, `motion: low`, `density: medium`.

> Ưu tiên khi xung đột: **file này > frontend-design > các skill khác**.

---

## 3. Hướng thiết kế: "Vở mực tím"

### 3.1 Ý tưởng gốc
Người dùng là người Việt học tiếng Anh và tiếng Trung. Hình ảnh quen thuộc nhất của việc "ghi từ" với người Việt là:
- **Vở ô ly** — giấy trắng, dòng kẻ tím nhạt, **đường lề đỏ** bên trái.
- **Mực tím** — màu mực học trò viết bài.
- **Nhãn vở** — miếng nhãn trắng dán trên bìa vở màu.
- **Giấy ô 田字格 (điền tự cách)** — ô vuông có chữ thập để tập viết chữ Hán.
- **Con dấu son đỏ** (印章) — dấu đỏ của thầy cô / dấu triện chữ Hán.
- **Bút dạ quang vàng** — đánh dấu chỗ cần nhớ.

Giao diện mới lấy **chính những vật liệu này** làm ngôn ngữ thị giác. Không gradient, không đốm màu, không emoji trang trí. Màu tím vẫn còn, nhưng là **mực tím đậm, phẳng**, không phải gradient neon.

### 3.2 Nguyên tắc (thuộc lòng)
1. **Chữ là nhân vật chính.** Từ vựng được trình bày như "mẫu chữ" (specimen) trên dòng kẻ / ô 田字格. Đây là điểm nhấn duy nhất của cả app — mọi thứ xung quanh yên lặng.
2. **Màu mang nghĩa, không trang trí.** Mực tím = hành động chính & tiếng Anh. Son đỏ = tiếng Trung, "đến hạn", lỗi. Lá = đúng/đã thuộc. Nghệ = chuỗi ngày, cảnh báo. Ngoài ra chỉ có đen, xám, giấy.
3. **Phẳng và sắc.** Viền 1px, bóng gần như không có, bo góc có thứ bậc. Không nút 3D.
4. **Một khoảnh khắc chuyển động cho mỗi màn**, và chỉ khi người dùng làm gì đó (lật thẻ, đóng dấu, mở ngăn). Không có gì lơ lửng.
5. **Gamification điềm tĩnh.** XP, chuỗi ngày, bảng xếp hạng vẫn còn, nhưng trình bày như **sổ điểm**, không như máy đánh bạc.
6. **Câu chữ ngắn, thật, của người dùng** (§8). Không slogan.
7. **Bin là hình vẽ nguệch ngoạc bên lề vở.** Học trò Việt Nam ai cũng từng vẽ một con vật nhỏ bên lề vở. Bin được vẽ lại đúng như vậy: nét mực tím, không tô màu kín, đứng ở lề. Bin là nhân vật duy nhất được phép dễ thương; mọi thứ xung quanh vẫn điềm tĩnh. Bin không xuất hiện ở trang nào làm việc nghiêm túc (form, cài đặt ngoài mục Linh vật, danh sách từ).

### 3.3 Danh sách CẤM (anti-AI checklist — kiểm tra ở mỗi PR)
- [ ] Không `linear-gradient`/`radial-gradient` nào để trang trí (chỉ được dùng cho highlighter và đường kẻ vở).
- [ ] Không emoji trong chrome của UI (tiêu đề, nút, empty state, toast, nav) và trong lời Bin. Emoji **do người dùng nhập** (`word.emoji`) vẫn hiển thị. Khi Bin bị tắt, chỗ của Bin hiện **hình nét mực tĩnh** (hình của `EmptyState`, §5.7) thay vì emoji như hiện tại.
- [ ] Không tô/đổi màu/in nghiêng **một từ** trong tiêu đề.
- [ ] Không nhãn VIẾT HOA, không eyebrow nhỏ phía trên mọi heading.
- [ ] Không nối meta bằng `·` hay ` — `. Dùng nhóm thông tin tách bằng khoảng trắng / chip / dòng riêng.
- [ ] Không thêm `→` vào cuối chữ nút/link.
- [ ] Không `animate-float`, `animate-wiggle`, `animate-bob`, `animate-hop`, confetti, `hover:-translate-y`. Chuyển động lặp vô hạn chỉ còn: Bin chớp mắt và vẫy đuôi (§5.8).
- [ ] Không đánh số 01/02/03 trừ khi nội dung thật sự là trình tự.
- [ ] Không thẻ "số to + nhãn nhỏ + nền màu" lặp lại thành lưới 4 ô giống nhau.
- [ ] Không mọi thứ cùng một radius, cùng một bóng.
- [ ] Không font mono cho số liệu nhỏ. Số dùng `tabular-nums` của font chính.
- [ ] Không nền kem `#F4F1EA`, không cam đất `#D97757`, không nền đen + một màu neon.

---

## 4. Design tokens

### 4.1 Chiến lược đổi token (quan trọng để không vỡ app)
Component đang dùng tên cũ khắp nơi (`text-ink-blue`, `bg-wash-*`, `text-sun-text`…). Làm 3 bước:
1. **P1:** thêm token mới (bảng dưới) vào `:root`/`.dark` + `@theme inline`. **Ánh xạ token cũ sang giá trị mới** để cả app đổi giao diện ngay mà không sửa component.
2. **P2–P7:** khi viết lại từng component, chuyển sang token mới.
3. **P8:** `rg` tìm token cũ; khi còn 0 chỗ dùng thì xóa alias.

Ánh xạ alias ở P1:
```
--ink-blue → var(--ink-violet)      --brand → var(--ink-violet)
--margin-red → var(--seal)          --danger → var(--seal-text)
--jade / --jade-text → var(--leaf) / var(--leaf-text)
--sun / --sun-text → var(--turmeric) / var(--turmeric-text)
--sky, --grape, --pink (+ -text, wash-*) → các màu bìa vở trầm (§4.3) hoặc --ink-violet
--wash-blue → var(--tint-violet)   --wash-red → var(--tint-seal)
--wash-jade → var(--tint-leaf)     --wash-yellow → var(--tint-turmeric)
```

### 4.2 Màu — sáng
| Token | Hex | Vai trò |
|---|---|---|
| `--paper` | `#F5F6FA` | Nền app (trắng lạnh như giấy vở, **không** kem) |
| `--surface` | `#FFFFFF` | Tờ giấy / thẻ |
| `--surface-sunk` | `#EEEFF5` | Ô input, vùng lõm, hàng hover |
| `--ink` | `#1C1B26` | Chữ chính |
| `--ink-soft` | `#5B5A6E` | Chữ phụ (6.2:1 trên paper) |
| `--ink-faint` | `#8E8DA0` | Chỉ cho placeholder/disabled, **không** cho chữ cần đọc |
| `--rule` | `#DCDDEB` | Đường kẻ, viền 1px |
| `--rule-strong` | `#C5C6DA` | Viền input, viền khi hover |
| `--ruling` | `#D9D6F2` | Dòng kẻ vở ô ly (hơi tím) |
| `--margin` | `#E8A3A0` | Đường lề đỏ của vở (chỉ trang trí cấu trúc, không dùng cho chữ) |
| `--ink-violet` | `#3B2E8C` | **Mực tím** — primary, link, tiếng Anh (10.7:1 trên trắng) |
| `--ink-violet-hover` | `#2F2473` | Hover/pressed của primary |
| `--tint-violet` | `#ECEAF7` | Nền nhạt của primary (chip chọn, hàng đang active) |
| `--seal` | `#B8362B` | **Son đỏ** — tiếng Trung, "cần ôn", con dấu (5.8:1 trên trắng) |
| `--seal-text` | `#B8362B` | Chữ lỗi / đến hạn |
| `--tint-seal` | `#FBECEA` | |
| `--leaf` | `#1F6E50` | Đúng, đã thuộc, thành công |
| `--leaf-text` | `#1F6E50` | |
| `--tint-leaf` | `#E6F2EC` | |
| `--turmeric` | `#C98A12` | **Nghệ** — chuỗi ngày, cảnh báo (chỉ dùng làm nền/icon) |
| `--turmeric-text` | `#8A5A00` | Chữ màu nghệ (5.9:1) |
| `--tint-turmeric` | `#FBF1DC` | |
| `--highlighter` | `#F5D547` | Bút dạ quang — chỉ cho nét highlight phía sau chữ |
| tone 1–5 | giữ giá trị AA hiện tại | Màu thanh điệu pinyin — không đổi |

### 4.3 Màu bìa vở (deck cover) — thay 6 màu kẹo
Màu vải bìa trầm, như bìa vở/sổ thật. Chữ trên bìa luôn nằm trên **nhãn trắng**, nên không lo contrast.

| Token | Hex | Tên |
|---|---|---|
| `--cover-indigo` | `#2E3A6B` | Chàm |
| `--cover-moss` | `#47613F` | Rêu |
| `--cover-plum` | `#6A2D49` | Mận |
| `--cover-brick` | `#8E3A2B` | Gạch nung (đậm hơn hẳn cam đất) |
| `--cover-ochre` | `#9A6A0E` | Hoàng thổ |
| `--cover-slate` | `#475161` | Đá |

`lib/deck-colors.ts`: giữ hàm băm `deckTone(id)`, đổi `TONES` sang 6 màu này (`cover`, `bar`, `tint`).

### 4.4 Màu — tối ("trang vở dưới đèn bàn")
| Token | Hex | Ghi chú |
|---|---|---|
| `--paper` | `#16151F` | |
| `--surface` | `#1D1D27` | |
| `--surface-sunk` | `#24242F` | |
| `--ink` | `#ECEBF3` | 15:1 |
| `--ink-soft` | `#A3A1B5` | 6.6:1 trên surface |
| `--rule` | `#2E2E3B` | |
| `--rule-strong` | `#3C3C4C` | |
| `--ruling` | `#2B2940` | |
| `--margin` | `#5A2E33` | |
| `--ink-violet` | `#B4A8FF` | 7.9:1; chữ trên nút primary dùng `#16151F` (8.6:1) |
| `--tint-violet` | `#27234A` | |
| `--seal` | `#FF8A78` | |
| `--tint-seal` | `#3A1F22` | |
| `--leaf` | `#6FD1A6` | |
| `--tint-leaf` | `#16332A` | |
| `--turmeric` / `-text` | `#E9B54A` | |
| `--tint-turmeric` | `#382B14` | |
| `--highlighter` | `#8C7420` | Highlight tối, chữ trên vẫn đọc được |
| Bìa vở | giữ hex sáng, thêm `filter: saturate(.9) brightness(.9)` | |

Đổi `themeColor` trong `app/layout.tsx` và `app/manifest.ts` sang `#F5F6FA` / `#16151F`.

Tất cả cặp chữ/nền ở trên đã kiểm tra ≥ 4.5:1. Nếu thêm cặp mới, kiểm tra lại bằng script contrast nhỏ trong `scripts/`.

### 4.5 Typography
Hai họ chữ, vai trò tách bạch:

| Vai trò | Font | Ghi chú |
|---|---|---|
| UI, nội dung, tiêu đề trang | **Be Vietnam Pro** 400/500/600/700 (giữ) | Font do người Việt thiết kế, dấu tiếng Việt đẹp — giữ lại, đó là lựa chọn có lý do |
| Từ vựng (specimen), số lớn, tiêu đề landing/auth | **Literata** (variable, có trục `opsz`, có subset `vietnamese`) | Serif đọc sách → cảm giác "từ điển". Thay Nunito |
| Chữ Hán | Noto Serif SC (specimen) / Noto Sans SC (UI) — giữ | Serif Hán ăn khớp với Literata |
| IPA | `IPA Sans` subset — giữ | |

- **Xóa Nunito** khỏi `app/layout.tsx`. Thêm `Literata` qua `next/font/google` với `subsets: ["latin","latin-ext","vietnamese"]`, `variable: "--font-literata"`, `axes: ["opsz"]`, `display: "swap"`.
- `--font-heading` → **Be Vietnam Pro** (600/700, `letter-spacing: -0.015em`). `--font-display` (mới) → Literata.
- h1–h3 mặc định dùng Be Vietnam Pro 700/600, **không** 900.
- Không dùng font viết tay.

Thang chữ (giữ tên biến hiện có, đổi giá trị):
| Token | Giá trị | Dùng cho |
|---|---|---|
| `--text-xs` | 0.8125rem / 1.4 | chú thích, chip |
| `--text-sm` | 0.9375rem / 1.5 | chữ phụ |
| `--text-base` | 1.0625rem / 1.6 | nội dung |
| `--text-lg` | 1.25rem / 1.4 | h3 |
| `--text-xl` | 1.625rem / 1.25 | h1 trang trong app |
| `--text-2xl` | 2.25rem / 1.15 | tiêu đề lớn |
| `--text-display` (mới) | clamp(2.5rem, 6vw, 4.25rem) / 1.05 | H1 landing (Literata, opsz cao, weight 600) |
| `--text-word` | clamp(2.75rem, 9vw, 4.5rem) | Từ tiếng Anh trên flashcard (Literata 500) |
| `--text-hanzi` | clamp(4rem, 14vw, 6rem) | Chữ Hán trên flashcard |

Độ dài dòng ≤ 70 ký tự cho đoạn văn (`max-w-[62ch]`).

### 4.6 Khoảng cách, radius, bóng, viền
- Lưới 4px. Khoảng cách giữa các khối trong trang: 24px (mobile) / 32px (desktop). Trong thẻ: 16/20px.
- **Radius có thứ bậc** (thay bộ cũ):
  - `rounded-chip` 999px — chip, segmented
  - `rounded-btn` **10px** — nút, input
  - `rounded-card` **14px** — thẻ, hàng danh sách nhóm
  - `rounded-sheet` **22px** — dialog, sheet, flashcard
  - Bìa vở (`DeckCover`) **4px bên trái, 8px bên phải** — như gáy sổ.
- Bóng: chỉ 2 mức.
  - `--shadow-card`: `0 1px 0 rgb(28 27 38 / .04)` (gần như không thấy) — thẻ thường chỉ dựa vào viền 1px.
  - `--shadow-lift`: `0 1px 2px rgb(28 27 38 / .06), 0 12px 32px -12px rgb(28 27 38 / .18)` — chỉ cho thứ "nổi" (flashcard, dialog, popover, bottom nav).
  - Bỏ bóng tím. Tối: bóng đen, không màu.
- Focus: `outline: 2px solid var(--ink-violet); outline-offset: 2px` — giữ.

### 4.7 Chuyển động
| Token | Giá trị | Dùng cho |
|---|---|---|
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | mặc định |
| `--ease-stamp` | `cubic-bezier(.3,1.4,.5,1)` | con dấu |
| `--dur-fast` | 120ms | hover, pressed |
| `--dur-base` | 200ms | mở menu, chip |
| `--dur-flip` | 420ms | lật thẻ |

Animation mới: `stamp-in` (scale 1.35→1, rotate -12°→-8°, opacity 0→1, 260ms) và `ink-draw` (stroke-dashoffset cho vòng tiến độ, 600ms, chạy 1 lần). Giữ `highlighter-sweep` nhưng **chỉ** dùng 1 chỗ (flashcard mặt sau, dòng nghĩa). Xóa `pop-in`, `float`, `wiggle`, `bob`, `hop`, confetti. Giữ `shake` nhưng giảm biên độ còn 3px, 240ms, và chỉ dùng khi người dùng ghép sai trong Ghép thẻ. Các lớp `.pup-*` xem §5.8. Giữ khối `prefers-reduced-motion`.

### 4.8 Icon
- Giữ `lucide-react`, `strokeWidth={1.75}` toàn app (active trong nav: 2.25). Kích thước 18px trong nút, 20px trong nav.
- Bỏ `.icon-tile` nhiều màu. Icon đứng một mình, màu `ink-soft`, hoặc `ink-violet` khi active.
- Cờ ngôn ngữ (`LangFlag`): giữ SVG nhưng chỉ dùng ở bộ lọc ngôn ngữ và form chọn ngôn ngữ. Trên thẻ/bìa vở thay bằng **dấu ngôn ngữ** (§5.5).

---

## 5. Thành phần đặc trưng (làm ở P1–P2, dùng lại khắp nơi)

### 5.1 `WordSpecimen` — điểm nhấn duy nhất của app
File mới: `components/word/word-specimen.tsx`. Dùng ở flashcard, trang từ, landing, trang deck công khai.

**Tiếng Anh** — từ đặt trên dòng kẻ vở:
```
┌────────────────────────────────────────────┐
│┆                                           │  ┆ = đường lề đỏ (--margin), cách mép 28px
│┆                                           │
│┆   resilient                               │  Literata 500, --text-word
│┆ ──────────────────────────────────────    │  baseline nằm đúng trên một dòng --ruling
│┆   /rɪˈzɪliənt/   ▶                         │  IPA + nút phát âm
│┆ ──────────────────────────────────────    │
└────────────────────────────────────────────┘
```
- Nền: `repeating-linear-gradient(to bottom, transparent 0 calc(var(--line) - 1px), var(--ruling) calc(var(--line) - 1px) var(--line))` với `--line: 2rem`. Đây là gradient **cấu trúc** (dòng kẻ), được phép.
- Đường lề: `border-left` giả bằng `::before` 1px `--margin`, cách trái 28px (20px trên mobile).
- Căn chữ sao cho baseline rơi đúng dòng kẻ (đặt `line-height` = bội số `--line`, kiểm tra bằng ảnh chụp).

**Tiếng Trung** — chữ Hán trong ô 田字格:
```
┌──────────┬──────────┐
│    ╲     ┆     ╱    │   viền ngoài 1.5px --seal ở 55% opacity
│      ╲   ┆   ╱      │   chữ thập + đường chéo: 1px nét đứt --seal 25%
│- - - - 坚 - - - - - │   mỗi chữ một ô, xếp ngang
│      ╱   ┆   ╲      │
│    ╱     ┆     ╲    │
└──────────┴──────────┘
   jiān     qiáng          pinyin tô màu thanh điệu, căn giữa dưới từng ô
```
- Vẽ ô bằng SVG nội tuyến (không ảnh), kích thước theo `--text-hanzi`.
- Chế độ `size="sm" | "md" | "lg"`. Tái dùng cho `components/zh/stroke-order.tsx` và `components/practice/writing-pad.tsx` (cùng một kiểu ô).

### 5.2 `SealStamp` — khoảnh khắc ăn mừng duy nhất
File mới: `components/review/seal-stamp.tsx`. Thay `Confetti`.
- Hình vuông bo 6px, viền đôi son đỏ, chữ trắng trên nền `--seal`, nội dung 2 dòng: **"Đã ôn"** + ngày (`23.10`). Hơi méo mép bằng SVG filter `feTurbulence` nhẹ (scale ≤ 2) cho cảm giác mực in — giữ tinh tế.
- Xoay `-8deg`, xuất hiện bằng `stamp-in` một lần khi màn tổng kết mở. Reduced motion: hiện luôn, không animation.
- Dùng ở: tổng kết phiên ôn/luyện, Today khi xong bài ("Xong bài hôm nay"), nhóm khi đạt top tuần (biến thể "Hạng 1").

### 5.3 Nút (viết lại `components/ui/button.tsx`)
Bỏ `.btn-3d`. Variant:
| Variant | Kiểu |
|---|---|
| `default` (primary) | nền `--ink-violet`, chữ trắng, 600; hover `--ink-violet-hover`; active `translate-y-px` |
| `outline` | nền `--surface`, viền 1px `--rule-strong`, chữ `--ink`; hover nền `--surface-sunk` |
| `secondary` | nền `--tint-violet`, chữ `--ink-violet` |
| `ghost` | trong suốt; hover `--surface-sunk` |
| `destructive` | nền `--tint-seal`, chữ `--seal-text`; nút xác nhận xóa cuối cùng: nền `--seal` chữ trắng |
| `link` | chữ `--ink-violet`, gạch chân 1px khi hover, `underline-offset-4` |

Size: `sm` 36px, `default` **44px** (đạt touch target, bỏ hàng loạt `min-h-11` rải rác), `lg` 52px (CTA chính: "Bắt đầu ôn", "Lưu từ"). `icon` 44×44. Giữ API hiện tại để không vỡ chỗ gọi; sau đó dọn các `className` ghi đè.

### 5.4 Bề mặt
- `.sheet` (thay `.notebook-card`): `bg-surface border border-rule rounded-card`. Không bóng.
- `.sheet-lift`: thêm `--shadow-lift` — chỉ cho flashcard, dialog, popover.
- `.ruled-list`: giữ, nhưng hàng cao ≥ 56px, padding ngang 16px, hover `--surface-sunk`.
- Phân nhóm nội dung bằng **khoảng trắng và tiêu đề**, không phải bằng việc bọc mọi thứ vào thẻ. Quy tắc: một trang tối đa 1 lớp thẻ lồng.

### 5.5 Dấu ngôn ngữ `LangMark`
File mới `components/lang-mark.tsx`: chip nhỏ 22px cao, chữ `EN` hoặc `中`, viền 1px. `EN` màu `--ink-violet` trên `--tint-violet`; `中` màu `--seal` trên `--tint-seal`, font Noto Serif SC. Thay cờ trên deck card, word row, kết quả tìm kiếm.
(Lưu ý: đây là mã ngôn ngữ ngắn, không phải nhãn viết hoa trang trí.)

### 5.6 `DeckCover` → "bìa vở có nhãn"
```
┌─┬──────────────────┐
│▌│                  │  nền --cover-* ; gáy trái 6px tối hơn 15%
│▌│  ┌────────────┐  │  nhãn trắng bo 4px, viền trong 1px --rule
│▌│  │ IELTS Core │  │  tên bộ từ: Be Vietnam Pro 600, 2 dòng tối đa
│▌│  │ ────────── │  │  hai dòng kẻ mảnh như nhãn vở
│▌│  └────────────┘  │
│▌│             中   │  LangMark góc dưới phải
└─┴──────────────────┘
```
- Biến thể: `lg` (trang deck, 120×160), `md` (deck card, 56×72), `sm` (danh sách gọn, 32×40, không nhãn, chỉ màu + gáy).
- Giữ `aria-hidden`.

### 5.7 Điều khiển khác
- **Segmented control** (lọc ngôn ngữ, sắp xếp, chế độ): thanh `--surface-sunk` bo chip, mục chọn nền `--surface` + `--shadow-card` + chữ `--ink`. Thay các pill viền dày hiện tại.
- **Input**: cao 44px, nền `--surface`, viền 1px `--rule-strong`, focus viền `--ink-violet` + ring 3px `--tint-violet`. Label trên, 500, `text-sm`. Lỗi: chữ `--seal-text` dưới input, có icon `AlertCircle` 14px.
- **Switch/Checkbox/Radio**: màu bật `--ink-violet`. Radio card (chọn mode/ngôn ngữ): viền 1px, chọn = viền 2px `--ink-violet` + nền `--tint-violet`, **không** dấu tick bay vào.
- **Progress bar**: cao 6px, nền `--surface-sunk`, thanh `--ink-violet` (phiên ôn) hoặc màu bìa (deck). Không highlight trắng bên trong.
- **ProgressRing**: nét 6px, đầu tròn, màu `--ink-violet`, xong 100% chuyển `--leaf`; vẽ bằng `ink-draw` 1 lần.
- **Heatmap**: 5 mức trộn `--ink-violet` vào `--surface` (giữ cơ chế `color-mix`), ô vuông bo 3px, khoảng cách 3px. Ngày nghỉ: ô có gạch chéo `--rule-strong`.
- **Toast (sonner)**: nền `--ink` chữ `--paper` (đảo màu), bo 10px, không icon màu mè; lỗi có vạch trái 3px `--seal`.
- **Dialog/Sheet**: `rounded-sheet`, `--shadow-lift`, overlay `rgb(22 21 31 / .45)` không blur mạnh (blur 2px). Sheet mobile có tay nắm 36×4.
- **Skeleton**: `--surface-sunk`, shimmer rất nhẹ, tắt khi reduced motion.
- **Empty state**: không emoji. Mẫu chung: một hình minh họa **nét mực** đơn sắc nhỏ (SVG ≤ 96px, nét `--ink-soft` 1.5px: quyển vở mở, ô 田字格 trống, hai người…) + tiêu đề 600 + 1 câu hướng dẫn + 1–2 nút. Gom vào `components/ui/empty-state.tsx`. Vẽ 5 hình: `notebook`, `grid`, `people`, `chat`, `check`. Nếu Bin đang bật, empty state ở Hôm nay, Bộ từ, Nhóm dùng Bin (mood `wave`/`think`) thay cho hình; các trang khác vẫn dùng hình nét.

### 5.8 Linh vật Bin — vẽ lại thành "hình vẽ bên lề vở"
Giữ toàn bộ API và hành vi: `Pup` (`mood`, `size`, `animated`), `PUP_MOODS` (10 mood, đúng tên), `PettablePup`, `MascotSay`, `EndPup`, prefs `mascot` / `mascot_name`, `answerMood`, `summaryMood`, `say()`. Chỉ đổi hình và giọng.

**Hình** (`components/mascot/pup.tsx`):
```
      ╭╮    ╭╮         nét 2.25px --pup-ink, đầu nét tròn, hơi run tay
     ╭╯╰────╯╰╮        (dùng path có độ cong không đều, không hình tròn hoàn hảo)
     │  ●    ●  │       mắt: chấm mực đặc, không có đốm trắng phản chiếu
     │    ᴥ     │       mũi tam giác bo, miệng 1 nét
     │ ˙      ˙ │       má: 2 chấm --pup-blush nhỏ, độ mờ 60%
      ╰─┬────┬─╯
        ╰────╯ ~       đuôi 1 nét cong, vẫy
```
- **Bảng màu Bin** (thay token `--pup-*`): `--pup-ink` = `--ink-violet` (Bin được vẽ bằng mực tím), `--pup-fur` = `--surface` (giấy, không tô kem), `--pup-ear` = `--ink-violet` ở 18% (tai tô nhạt như tô bút chì), `--pup-muzzle` = trong suốt (chỉ có nét viền), `--pup-blush` = `--seal` ở 45%. Tối: nét `#B4A8FF`, nền `--surface`.
- **Phụ kiện theo mood** vẽ lại thành **nét bút** đơn sắc cùng màu mực, không tô màu kín: lấp lánh = dấu `+` nhỏ; tim = tim một nét (riêng mood `love` được tô `--seal`); nước mắt = giọt một nét; "z z" = chữ vẽ bằng path (bỏ `<text>` dùng `--font-nunito` vì Nunito bị xóa ở P1); dấu `?` / `!` = path. Kính râm (`cool`) giữ, tô đặc mực.
- **Chuyển động**: giữ `pup-blink` (chớp mắt) và `pup-tail` (vẫy đuôi). Bỏ `pup-breathe`, `pup-ear-*` lặp, `pup-sparkle`, `pup-z`, `pup-float`, `pup-pulse` lặp vô hạn. Phụ kiện xuất hiện **một lần** khi mood đổi (fade + dịch 2px, 200ms) rồi đứng yên. Khi vuốt ve: tim bay lên một lần (giữ, vì là phản hồi hành động). Reduced motion: tĩnh hoàn toàn (giữ quy tắc hiện có).
- Bỏ `animate-bob` / `animate-hop` trên Bin. Khi xong phiên, Bin dùng mood `cheer` tĩnh, đứng cạnh con dấu `SealStamp`.

**Lời thoại** (`MascotSay`):
- Bỏ bong bóng có bóng và mũi nhọn. Lời Bin là **chữ ghi bên lề**: đặt cạnh Bin, `text-[0.9375rem]` 500 `--ink`, tên Bin `text-xs --ink-soft` phía trên, một **nét gạch ngắn cong** (SVG 16px, màu `--ink-violet` 40%) nối từ miệng Bin tới chữ. Không viền, không nền.
- Khi vuốt ve, lời đổi tại chỗ (crossfade 150ms), không `pop-in`.

**Giọng** (`lib/mascot/lines.ts`): giữ khóa (`dueMany`, `pet`, `empty`, `due`, `allDone`, `streakAtRisk`, `correct`, `close`, `wrong`), giữ placeholder `{name}` / `{n}`, giữ số phần tử ≥ 1 mỗi khóa. Viết lại:
- Bỏ toàn bộ emoji. "Gâu" tối đa 1 lần mỗi khóa. Bỏ "siêu ghê", "giỏi quá trời", "tự hào về bạn lắm".
- Câu ngắn, cụ thể, có thông tin. Ví dụ hướng viết:
  - `due`: "Có {n} từ đến hạn. Ôn xong là nghỉ." / "{n} từ hôm nay, khoảng mười phút."
  - `dueMany`: "{n} từ hơi nhiều. Làm 20 từ trước rồi tính tiếp."
  - `streakAtRisk`: "Chuỗi {n} ngày vẫn còn. Ôn một thẻ là giữ được."
  - `allDone`: "Hôm nay xong bài rồi. Mai gặp lại." / "Xong bài. Muốn luyện thêm thì vào Luyện tập."
  - `correct`: "Đúng rồi." / "Chuẩn." / "Nhớ tốt đó."
  - `close`: "Gần đúng, xem lại chính tả."
  - `wrong`: "Chưa đúng. Từ này sẽ quay lại sớm."
  - `pet`: "Gâu." / "{name} thích được xoa đầu." / "Nhột."
- `summaryMood` giữ ngưỡng và mood (unit test khóa), viết lại `text` như §7.11.

**Nơi xuất hiện** (giữ đúng các chỗ hiện có, chỉnh vị trí):
| Chỗ | Cách hiện |
|---|---|
| Hôm nay, dưới lời chào | Bin 56px + lời bên lề, nằm **ngoài** thẻ "cần ôn", căn trái |
| Thanh tiến độ phiên ôn | Bin 28px ở đầu thanh, đổi mood theo đánh giá (giữ ánh xạ Again/Hard/Good/Easy) — không nhảy |
| Sheet phản hồi khi luyện | Bin 40px bên trái dòng "Đúng rồi!" / "Chưa đúng" |
| Màn kết thúc (`EndPup`) | Bin 96px cạnh `SealStamp` |
| Sidebar desktop | thẻ cuối sidebar (§6.1) |
| Cài đặt → Linh vật | xem trước, bấm để đổi mood (giữ) |
| Thống kê | Bin 48px + một câu tóm tắt 30 ngày (giữ) |

---

## 6. Khung app (P2)

### 6.1 Sidebar desktop (`SideNav`, ≥1024px)
```
┌──────────────┬┆─────────────────────────────────────┐
│ ■ Sổ Từ      │┆  [⌘K Tìm từ…]          ☾    (A)    │ ← top bar trong vùng nội dung
│ Sổ từ vựng   │┆                                     │   ☾ = công tắc sáng/tối
│ Anh – Trung  │┆                                     │
│              │┆                                     │
│ Học          │┆                                     │
│ Hôm nay   24 │┆                                     │
│ Bộ từ        │┆           nội dung                  │
│ Luyện tập    │┆                                     │
│ Gia sư       │┆                                     │
│ Nhóm         │┆                                     │
│              │┆                                     │
│ Khác         │┆                                     │
│ Khám phá     │┆                                     │
│ Thống kê     │┆                                     │
│ Cài đặt      │┆                                     │
│ Liên hệ      │┆                                     │
│              │┆                                     │
│ ╭╮╭╮ Có 24 từ│┆                                     │ ← thẻ Bin cuối sidebar
│ (••) đến hạn.│┆                                     │
│ [ Ôn ngay ]  │┆                                     │
└──────────────┴┆─────────────────────────────────────┘
               └─ mép phải sidebar = đường lề đỏ đôi của vở (2 nét 1px --margin cách nhau 3px)
```
- Rộng 232px, nền `--paper` (không phải surface) — sidebar hòa vào giấy, chỉ ngăn bằng đường lề.
- Logo mới (§6.5) + tagline 1 dòng `text-xs --ink-soft` (giữ ý tagline hiện có, bỏ dấu chấm than nếu có).
- Nhóm "Học" / "Khác" [giữ]: tên nhóm là tiêu đề nhỏ `text-xs` 600 `--ink-soft`, **chữ thường** (không viết hoa), khoảng cách trên 20px.
- Mục: cao 40px, icon 20px + chữ 500 `--ink-soft`. Active: chữ `--ink` 600, nền `--surface`, viền 1px `--rule`, và **vạch mực tím 2px** bên trái (giữ ý "accent bar" hiện có nhưng một màu cho mọi mục). Bỏ `wash`/`solid`/`tone` theo từng mục, bỏ nghiêng icon và trượt hàng khi hover; hover chỉ đổi chữ sang `--ink` và nền `--surface-sunk`.
- "Hôm nay" có số từ cần ôn bên phải (chữ `--seal`, tabular) nếu > 0. Chỉ làm nếu dữ liệu đã có sẵn ở layout/thẻ Bin; **không** thêm query mới.
- **Thẻ Bin cuối sidebar** [giữ]: không viền, không nền màu — chỉ Bin 44px vẽ bên lề + 1 câu + nút `outline` `sm` "Ôn ngay" (`/review`). Khi Bin tắt: chỉ câu chữ + nút. Kiểm tra chữ "Ôn ngay" không bị E2E khóa ở dạng khác.

### 6.2 Top bar
- Mobile: cao 56px, nền `--paper` 92% + blur 8px, viền dưới 1px `--rule` **chỉ hiện khi đã cuộn** (dùng `IntersectionObserver` sentinel nhỏ).
- Desktop: không lặp logo (bỏ `lg:invisible`, chỉ không render). Ô tìm kiếm dạng nút rộng 280px: icon kính lúp + "Tìm từ trong sổ" + phím tắt `⌘K` (hiện `Ctrl K` trên Windows).
- **Công tắc sáng/tối** (`theme-switch.tsx`) [giữ hành vi, giữ cách chọn icon bằng CSS `dark:` để không lệch SSR]: nút `ghost` icon 44×44, icon `Sun`/`Moon` 18px stroke 1.75. Khi bấm, icon đổi bằng crossfade + xoay 30° trong 200ms (phản hồi hành động). Có `aria-label` ("Chuyển sang giao diện tối" / "…sáng").
- Avatar 32px; menu (`UserMenu`) dùng dropdown chuẩn mới.

### 6.3 Bottom nav (mobile)
- Nền `--surface`, viền trên 1px `--rule`, `--shadow-lift` rất nhẹ ngược lên. Cao 64px + safe area.
- 5 tab giữ nguyên. Active: icon `--ink-violet` stroke 2.25 + chữ 600 `--ink` + **gạch mực 16×2px** phía trên icon. Không pill màu, không pop-in.
- "Hôm nay" có chấm đỏ 6px nếu còn từ cần ôn (nếu có dữ liệu sẵn).

### 6.4 FAB "Thêm từ" (`components/app-shell/fab.tsx`)
- Mobile: nút tròn 56px nền `--ink-violet`, icon `Plus` trắng, `--shadow-lift`, `aria-label="Thêm từ"`. Khi cuộn xuống thu lại chỉ còn icon; cuộn lên hiện chữ.
- Desktop: không có FAB — nút "Thêm từ" nằm trong thanh hành động của trang deck.

### 6.5 Logo & icon app
- Logo mới: ô vuông 28px, nền `--ink-violet`, bo 6px, bên trong **một ô 田字格 trắng nét mảnh** với chữ "S" Literata 600 ở giữa. Bên cạnh: chữ "Sổ Từ" Be Vietnam Pro 700, `letter-spacing: -0.02em`.
- Giữ cách render chữ bằng CSS `content` (WCAG 2.5.3, xem CLAUDE.md).
- Cập nhật `scripts/gen-icons.mjs` để icon PWA/favicon dùng cùng hình (nền phẳng `#3B2E8C`, không gradient), chạy lại script.

### 6.6 Bố cục nội dung
- `max-w-6xl` giữ cho trang lưới (decks, explore, groups, stats). Trang đọc/form: `max-w-2xl`, **căn trái theo cột nội dung** trên desktop (không căn giữa lơ lửng) — trừ flashcard & auth căn giữa.
- Tiêu đề trang: hàng gồm h1 (`--text-xl`, 700) bên trái + hành động chính bên phải. Dưới h1 có thể có 1 dòng mô tả `--ink-soft`. Không eyebrow.

---

## 7. Thiết kế từng trang

Ký hiệu: **[giữ]** = giữ hành vi/chữ; **[bỏ]**; **[mới]**.

### 7.1 Landing `app/(marketing)/page.tsx`
Mục tiêu: người lạ hiểu app làm gì trong 5 giây, và **chạm thử được** ngay.

```
┌──────────────────────────────────────────────────────────────┐
│ ■ Sổ Từ                                   Đăng nhập  [Đăng ký]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Ghi từ như ghi vở.                 ┌──────────────────────┐ │
│  Ôn đúng lúc sắp quên.              │┆                     │ │
│                                     │┆  resilient           │ │
│  Sổ từ vựng tiếng Anh và tiếng      │┆ ────────────────     │ │
│  Trung. Gõ một từ, app điền nghĩa,  │┆  /rɪˈzɪliənt/  ▶     │ │
│  phiên âm, ví dụ; mỗi ngày chỉ ôn   │┆ ────────────────     │ │
│  những từ bạn sắp quên.             │┆     Chạm để lật      │ │
│                                     └──────────────────────┘ │
│  [Tạo sổ miễn phí]  Tôi đã có tài khoản   ┌──────┬──────┐    │
│                                           │  坚  │  强  │    │
│                                           └──────┴──────┘    │
│                                            jiān   qiáng      │
├──────────────────────────────────────────────────────────────┤
```
- **Hero**: H1 Literata 600 `--text-display`, hai câu trên hai dòng, **không tô từ nào**. Đoạn mô tả ≤ 62ch.
- Bên phải: một `WordSpecimen` EN **thật, lật được** (click/Space để lật sang mặt nghĩa "kiên cường, mau phục hồi" + 1 câu ví dụ có dịch), và một specimen ZH 坚强 nhỏ hơn đặt chồng lệch xuống dưới (xoay 0°, không nghiêng lệch kiểu sticker). Dùng font subset `Hero Hanzi` như hiện tại. Đây là khoảnh khắc chuyển động duy nhất của trang.
- [bỏ] badge "🎉 Miễn phí", sticker "🔥 12 ngày", "+30 XP ⭐", thẻ gradient "24 từ".
- **Mục "Một ngày với Sổ Từ"** (thay lưới 4 feature card): 3 hàng xen kẽ trái/phải, mỗi hàng = 1 ảnh chụp UI thật (crop, viền 1px, bo 14px) + tiêu đề + 2 câu. Đây là trình tự thật (ghi → ôn → luyện) nên được đánh số nhỏ "1, 2, 3" bằng Literata.
  1. *Ghi từ* — ảnh form thêm từ với gợi ý đã điền.
  2. *Ôn mỗi sáng* — ảnh flashcard + 4 nút đánh giá.
  3. *Luyện theo cách bạn thích* — ảnh lưới 7 chế độ (tập viết chữ Hán nổi bật).
  Ảnh chụp lấy bằng `scripts/screenshot.mjs`, lưu `public/landing/*.webp` (≤ 80 KB/ảnh, có `width/height`).
- **Mục "Học cùng bạn bè"**: một khối 2 cột: trái là chữ (chia sẻ bộ từ bằng link, nhóm có mã mời, bảng tuần); phải là bảng xếp hạng mẫu dạng **sổ điểm** (§7.17).
- **Mục "Câu hỏi thường gặp"** [mới]: 4 câu dạng `<details>` (Miễn phí không? Dữ liệu lưu ở đâu? Có dùng offline được không? Cài lên điện thoại thế nào?). Trả lời ngắn, đúng sự thật trong repo (PWA, export JSON/CSV, xóa tài khoản).
- **CTA cuối**: không gradient. Một dải nền `--surface` có dòng kẻ vở mờ, chữ "Sổ của bạn đang trống." + nút "Tạo sổ miễn phí". 
- **Footer**: giữ liên hệ (`ContactLinks`), thêm link "Liên hệ", năm. Một dòng, chữ nhỏ.
- Hiệu năng: không load Noto SC ở landing (giữ quy tắc trong CLAUDE.md). Lighthouse ≥ 95.

### 7.2 Auth: `/login`, `/signup`, `/forgot-password`, `/reset-password` (`components/auth/auth-card.tsx`)
```
Desktop                                         Mobile
┌───────────────────────┬────────────────────┐  ┌──────────────┐
│┆                      │                    │  │ ■ Sổ Từ      │
│┆  hello                │   Đăng nhập        │  │              │
│┆ ───────────────────   │   Email  [       ] │  │ Đăng nhập    │
│┆  你好                 │   Mật khẩu [     ] │  │ [ form ]     │
│┆ ───────────────────   │   [  Đăng nhập  ]  │  │              │
│┆  thank you            │   Quên mật khẩu?   │  └──────────────┘
│┆ ───────────────────   │   Chưa có tài khoản? Đăng ký │
└───────────────────────┴────────────────────┘
```
- [bỏ] panel gradient + chữ bay lơ lửng. Panel trái (≥1024px, 44%) = **một trang vở**: nền `--surface`, dòng kẻ, đường lề đỏ, vài từ viết trên dòng (hello / 你好 / resilient / 谢谢 / adventure) ở Literata/Noto Serif SC màu `--ink` và `--ink-soft` xen kẽ. Tĩnh hoàn toàn. Dưới cùng 1 câu: "Mỗi ngày ôn đúng những từ sắp quên."
  (Lưu ý: auth không load Noto SC → dùng `Hero Hanzi` subset cho các chữ Hán ở panel, **thêm** glyph 你好谢 vào subset bằng script tạo font hiện có, hoặc thay bằng 坚强 đã có sẵn.)
- Form bên phải: không bọc thẻ; căn trái, rộng 380px, căn giữa dọc. H1 "Đăng nhập" `--text-xl`. Input 44px. Nút primary full width `lg`.
- Lỗi: hộp `--tint-seal` viền trái 3px `--seal`, chữ `--seal-text`.
- Hiện/ẩn mật khẩu: nút icon trong input (nếu chưa có thì thêm, `aria-label`).

### 7.3 Onboarding `/welcome` (`components/auth/welcome-form.tsx`)
- Layout auth (cột form), có **thanh bước** 2 đoạn ở trên (đoạn hiện tại `--ink-violet`, còn lại `--rule`) + chữ "Bước 1/2".
- Bước 1 "Bạn tên là gì?": 2 input. [bỏ] emoji float.
- Bước 2 "Bạn đang học ngôn ngữ nào?": 3 radio card ngang (mobile dọc): mỗi card có specimen mini (`resilient` / `坚强` / cả hai chồng nhau), tên, mô tả 1 dòng. Chọn = viền 2px mực tím.
- Switch "Thêm bộ từ mẫu" [giữ, bật mặc định], mô tả dưới.
- Nút "Bắt đầu học" `lg` — giữ đúng chữ (E2E khóa `/Bắt đầu học/`), **bỏ 🚀**.

### 7.4 Hôm nay `/today` (`app/(app)/today/page.tsx`) — trang quan trọng nhất
Ý tưởng: **một trang vở ghi ngày**, như học sinh viết "Thứ Sáu, ngày 23 tháng 10" ở đầu trang, và Bin vẽ bên lề.

```
Mobile 390                                Desktop 1280
┌────────────────────────────┐   ┌──────────────────────────────┬──────────────┐
│ Thứ Sáu, 23 tháng 10       │   │ Thứ Sáu, 23 tháng 10         │ Chuỗi ngày   │
│ Chào buổi trưa, Trọng!     │   │ Chào buổi trưa, Trọng!       │ T2 T3 … CN   │
│ ╭╮╭╮  Có 24 từ đến hạn.    │   │ ╭╮╭╮ Có 24 từ đến hạn.       │ ■ ■ ■ ■ □ ▨ ·│
│ (••)  Ôn xong là nghỉ.     │   │ (••) Ôn xong là nghỉ.        │ 12 ngày      │
│ ┌────────────────────────┐ │   │ ┌──────────────────────────┐ │──────────────│
│ │┆ 24 từ đến hạn ôn      │ │   │ │┆ 24 từ đến hạn ôn         │ │ Bộ từ        │
│ │┆ và 6 từ mới           │ │   │ │┆ và 6 từ mới              │ │ ▌IELTS   12  │
│ │┆ EN 18 ôn, 4 mới       │ │   │ │┆ EN 18 ôn, 4 mới          │ │ ▌HSK 3    4  │
│ │┆ 中  6 ôn, 2 mới       │ │   │ │┆ 中  6 ôn, 2 mới          │ │ ▌Giao tiếp   │
│ │┆ [   Bắt đầu ôn   ]    │ │   │ │┆ [Bắt đầu ôn]  khoảng 8 phút│ │ Tất cả       │
│ └────────────────────────┘ │   │ └──────────────────────────┘ │              │
│ [+ Thêm từ][Luyện][Khám phá]│  │ Thêm từ  Luyện tập  Khám phá │              │
│ Chuỗi ngày  12 ngày        │   │ 12 tuần gần đây              │              │
│ 12 tuần gần đây            │   │ ▦▦▦▦▦▦▦▦▦▦▦▦                 │              │
└────────────────────────────┘   └──────────────────────────────┴──────────────┘
```
- **Dòng ngày** [mới]: "Thứ Sáu, 23 tháng 10" — `text-sm` 500 `--ink-soft` theo `timezone` người dùng (`Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long", timeZone })`).
- **Lời chào** h1 `--text-xl`: giữ đúng dạng "Chào buổi trưa, Trọng!" (E2E khóa regex `/Chào buổi .+, <tên>!/`). Bỏ 👋.
- **Bin** [giữ logic chọn mood/khóa lời hiện có]: `MascotSay` 56px ngay dưới lời chào, nằm ngoài thẻ, lời bên lề (§5.8). Khi Bin tắt: câu `CHEERS` hiện tại thay bằng một câu thông tin ("Có 24 từ đến hạn hôm nay.") — không câu cổ vũ xoay vòng.
- **Thẻ "cần ôn"** (thay hero gradient): `.sheet` nền `--surface` + dòng kẻ vở mờ + đường lề đỏ. Bên trong là **một câu**, số in Literata 600 cỡ 3rem: "**24** từ đến hạn ôn và **6** từ mới". Chia theo ngôn ngữ (khi `split`) thành các dòng nhỏ có `LangMark` + "18 ôn, 4 mới" — mỗi dòng là link sang `/review?lang=`. Nút primary `lg` "Bắt đầu ôn" (E2E khóa `/Bắt đầu ôn/`) + bên cạnh "khoảng 8 phút" (ước lượng `Math.ceil((due + fresh) * 20 / 60)`, chỉ hiển thị).
- **Xong bài**: cùng khung thẻ, `SealStamp` "Xong bài" góc phải trên, câu "Hôm nay ôn xong rồi. Ngày mai có 12 từ." + nút outline "Luyện thêm".
- **Sổ trống**: Bin (mood `wave`) hoặc `EmptyState notebook` + "Sổ của bạn còn trống." + primary "Thêm bộ từ mẫu" (`SampleDecksButton`) + outline "Tạo bộ từ của tôi". Mẹo bên dưới giữ nhưng viết gọn.
- **Lối tắt**: 3 nút `outline` cỡ default trên một hàng (icon 18px + chữ), không phải ô vuông lớn màu.
- **Chuỗi ngày** (E2E khóa chữ "Chuỗi ngày"): không emoji lửa. Tiêu đề "Chuỗi ngày" + icon `Flame` 16px `--turmeric`. Bên dưới **7 ô ngày trong tuần** (T2…CN): đã ôn tô `--turmeric`, hôm nay viền đậm, ngày nghỉ miễn phí gạch chéo, ngày chưa tới chấm nhỏ. Số chuỗi Literata 2rem + "ngày". Dòng phụ giữ logic hiện có ("Ôn 1 thẻ hôm nay để giữ chuỗi.", "Còn 1 ngày nghỉ miễn phí tuần này.") — viết lại câu "giữ lửa!" thành "giữ chuỗi.".
- **Không có thẻ "Mục tiêu ngày"** — đúng quyết định của chủ repo. Không thêm vòng tiến độ, không hiện XP ở trang này.
- **Bộ từ** (cột phải desktop): danh sách gọn với `DeckCover sm` + tên + số cần ôn (chữ `--seal`, không pill) + link "Tất cả".
- **Heatmap 12 tuần** [giữ], tiêu đề "12 tuần gần đây" + link "Xem thống kê".
- **Liên hệ**: thu thành một dòng nhỏ ở cuối trang: "Gặp lỗi hay có góp ý? Nhắn Xễu Đùng Đùng" + `ContactLinks compact`. Không khung nét đứt.

### 7.5 Bộ từ `/decks` (`components/deck/deck-list.tsx`)
- Hàng tiêu đề: h1 "Bộ từ" + nút primary "Tạo bộ từ". Dưới: segmented "Tất cả / Tiếng Anh / Tiếng Trung".
- Các nhóm (Của tôi / Đang theo học / Của nhóm): tiêu đề h2 `--text-lg` + số lượng `--ink-soft`.
- **Deck card** mới — giá sách:
```
┌──────────────────────────────────────────┐
│ ┌─┬───┐  IELTS Core Vocabulary        🔒 │
│ │▌│nhãn│ 240 từ        Minh (nếu không │
│ │▌│   │ ▬▬▬▬▬▬▬▬▬▭▭▭  62% đã học        │
│ └─┴───┘                    12 cần ôn   │
└──────────────────────────────────────────┘
```
  - `DeckCover md` + tên (600, 2 dòng) + dòng phụ tách thành các mẩu riêng (số từ; chủ sở hữu; nhóm) cách nhau 12px, **không** dấu `·`.
  - Thanh tiến độ 4px màu bìa. Góc phải: "12 cần ôn" chữ `--seal` 600; hết hạn ôn thì "Đã ôn xong" chữ `--leaf` với icon check 16px.
  - Hover desktop: viền `--rule-strong`, bìa vở dịch sang trái 2px (như rút sách khỏi giá) — chỉ transform của bìa, 120ms. Không nâng cả thẻ.
- Lưới: 1 cột mobile, 2 cột md, 3 cột 2xl [giữ].
- Empty: `EmptyState notebook`.

### 7.6 Chi tiết bộ từ `/decks/[deckId]` (+ `components/deck/deck-words.tsx`)
```
Desktop
┌──────────────────────────────────────────────────────────────────┐
│ ← Bộ từ                                                          │
│ ┌──────┐  IELTS Core Vocabulary                                  │
│ │ bìa  │  Tiếng Anh   240 từ   của Minh   nhóm Lớp 12A           │
│ │ lg   │  Mô tả ngắn của bộ từ…                                  │
│ └──────┘  [▶ Ôn bộ này (12)]  [+ Thêm từ]  [⋯]                   │
│                                                                  │
│  Học bộ này                                                      │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐       │
│  │ ▭▭ Học      │ ☑ Kiểm tra  │ ⇄ Ghép thẻ  │ ▱ Lật thẻ   │       │
│  │ còn 34 từ   │ 20 câu      │ kỷ lục 18,4s│ 240 thẻ     │       │
│  └─────────────┴─────────────┴─────────────┴─────────────┘       │
├──────────────────────────────────────────────────────────────────┤
│ [Tìm trong bộ…]  Chủ đề ▾  Sắp xếp ▾          240 từ             │
│──────────────────────────────────────────────────────────────────│
│ resilient   /rɪˈzɪliənt/        kiên cường, mau phục hồi    ●    │
│ 坚强        jiānqiáng            kiên cường                   ○   │
└──────────────────────────────────────────────────────────────────┘
```
- Header: không nền màu wash. `DeckCover lg` bên trái (mobile: `md` cạnh tiêu đề), h1 `--text-2xl` 700, meta thành các mẩu riêng, mô tả `max-w-[62ch]`.
- **Thanh hành động**: tối đa 2 nút hiện (primary "Ôn bộ này" có số cần ôn trong nút; outline "Thêm từ" nếu `canEdit` — E2E khóa link "Thêm từ"). Phần còn lại (Nhập hàng loạt, Luyện tập, Chia sẻ, Xuất CSV, Sao chép, Cài đặt, Bỏ theo học) gom vào **menu "⋯"** (`DropdownMenu`) — hết hàng nút cuộn ngang. `ShareDeckDialog` mở từ menu (đổi trigger, giữ dialog).
- **"Học bộ này"** (nav `STUDY_LINKS` hiện có: Học, Kiểm tra, Ghép thẻ, Lật thẻ) [giữ link và tham số `n`]: một **dải 4 ô liền nhau** chung viền ngoài, ngăn bằng đường dọc 1px (không phải 4 thẻ rời có icon màu). Mỗi ô: icon lucide 18px `--ink` + tên 600 + một dòng thông tin thật `text-xs --ink-soft` nếu đọc được rẻ (Học: số từ chưa thuộc từ tiến độ đã lưu; Ghép thẻ: kỷ lục trong IndexedDB; Lật thẻ: số thẻ) — đọc phía client, nếu chưa có thì để trống, **không** bịa. Hover: nền `--surface-sunk`. Mobile: lưới 2×2 giữ viền chung. Tiêu đề nhỏ "Học bộ này" (khớp `aria-label` hiện có).
- **Danh sách từ**: bảng ruled trên desktop (cột: từ, đọc, nghĩa, trạng thái), danh sách 2 dòng trên mobile. Từ: Literata 500 (EN) / Noto Serif SC (ZH) cỡ 1.125rem. Trạng thái SRS bằng `StatusDot` mới: ○ mới (viền), ◐ đang học (`--turmeric`), ● đã thuộc (`--leaf`), ⊘ tạm ẩn (`--ink-faint`) — có `aria-label` và chú giải nhỏ dưới bảng.
- Chế độ chọn nhiều (di chuyển/xóa) [giữ hành vi]: thanh hành động dính đáy, nền `--ink`, chữ `--paper`.

### 7.7 Tạo / cài đặt bộ từ: `/decks/new`, `/decks/[id]/settings` (`deck-form.tsx`)
- Cột form `max-w-xl`. Bên phải (desktop) hoặc trên (mobile) là **xem trước bìa vở** cập nhật theo tên và ngôn ngữ đang gõ.
- Ngôn ngữ: radio card 2 lựa chọn có specimen mini. Quyền riêng tư: radio list có icon + mô tả 1 dòng.
- Vùng nguy hiểm (xóa bộ): khối riêng cuối trang, viền `--seal` 1px, nút destructive.

### 7.8 Thêm / sửa từ: `/decks/[id]/add`, `/words/[id]/edit` (`word-form.tsx`, `ai-suggest.tsx`, `image-picker.tsx`, `list-editors.tsx`)
Giữ toàn bộ luồng tối giản đã có (CLAUDE.md mục "Word form"). Chỉ đổi trình bày:
```
┌───────────────────────────────────────────────┐
│ ← IELTS Core                                  │
│ Thêm từ                                       │
│ ┌───────────────────────────────┐ [Gợi ý]     │  input từ: cao 56px, Literata 1.5rem
│ │ resilient                     │             │
│ └───────────────────────────────┘             │
│ Đã điền từ Wiktionary · AI đang bổ sung…      │  ← dòng trạng thái (đổi · thành 2 mẩu)
│ ┌───────────────────────────────────────────┐ │
│ │┆ resilient  /rɪˈzɪliənt/               ▶ │ │  xem trước specimen sống
│ │┆ Nghĩa: [kiên cường, mau phục hồi      ] │ │
│ └───────────────────────────────────────────┘ │
│ Nghĩa gợi ý: (adj) kiên cường  (adj) đàn hồi  │  chip chọn nhiều
│ ─ Ví dụ               2 câu              ›    │
│ ─ Ảnh                 Đã chọn ảnh        ›    │
│ ─ Loại từ & chủ đề    Tính từ            ›    │
│ ...                                           │
│                     [Lưu và thêm từ khác] [Lưu]│  thanh dính đáy trên mobile
└───────────────────────────────────────────────┘
```
- Input từ to (56px, Literata) — đây là nơi người dùng "viết vào vở".
- Trạng thái gợi ý: một dòng `text-sm --ink-soft` có spinner mảnh khi AI chạy; ghi rõ nguồn ("Từ điển Wiktionary", "AI") — không dùng ✨/Sparkles nhấp nháy. Icon gợi ý: `Wand2` hoặc `Lightbulb` đơn sắc.
- Chip nghĩa: chip viền 1px, chọn = nền `--tint-violet` + check 14px.
- Các hàng thu gọn: ruled list, mũi tên `ChevronRight` xoay 90° khi mở (200ms), tóm tắt 1 dòng bên phải.
- Image picker: lưới ảnh 4 cột (mobile 3), ô vuông bo 8px, chọn = viền 2px mực tím + số thứ tự góc. Credit ảnh chữ `text-xs`.
- Thanh lưu dính đáy (mobile) nền `--surface` viền trên.

### 7.9 Trang từ `/words/[wordId]`
```
┌────────────────────────────────────────────────────────┐
│ ← IELTS Core                                           │
│ ┌────────────────────────────────────────┐  ┌──────┐   │
│ │┆ resilient                        ▶   │  │ ảnh  │   │
│ │┆ ───────────────────────────────────  │  │      │   │
│ │┆ US /rɪˈzɪliənt/   UK /rɪˈzɪliənt/    │  └──────┘   │
│ └────────────────────────────────────────┘             │
│ Tính từ   B2   Chủ đề: tâm lý                          │
│                                                        │
│ kiên cường, mau phục hồi                               │  1.375rem 500
│ able to recover quickly from difficulties              │
│ [Sửa] [Tập viết] [Hỏi gia sư]                          │
│                                                        │
│ Ví dụ                                                  │
│ ┃ She's remarkably resilient.                       ▶  │  vạch trái mực tím
│ ┃ Cô ấy kiên cường đáng kinh ngạc.                     │
│ Cụm từ   ·  Đồng nghĩa  ·  Chữ thành phần  ·  Ghi chú  │  (mỗi mục là section riêng)
└────────────────────────────────────────────────────────┘
```
- Phần đầu là `WordSpecimen` (EN dòng kẻ / ZH 田字格 với phồn thể nhỏ bên cạnh). Ảnh (nếu có) bên phải 128px bo 14px; emoji người dùng đặt thì hiện ở ô 80px nền `--surface-sunk`.
- Tag (loại từ, CEFR, HSK, chủ đề) là chip nhỏ viền 1px; HSK dùng `--tint-seal`, CEFR dùng `--tint-violet`.
- Nghĩa VI là thông tin quan trọng thứ 2 → 1.375rem.
- Ví dụ: mỗi câu có vạch trái 2px (`--ink-violet` cho EN, `--seal` cho ZH), câu gốc trên, dịch dưới `--ink-soft`, nút phát âm cuối hàng. Từ đang học trong câu được **highlight bút dạ** (đây là chỗ dùng highlighter có nghĩa).
- Chữ thành phần (ZH): mỗi chữ trong ô 田字格 sm + pinyin + nghĩa + bộ thủ; bấm mở `StrokeOrder` trong sheet.
- Hàng nút: outline "Sửa", outline "Tập viết" (ZH), secondary "Hỏi gia sư". Xóa / tạm ẩn vào menu "⋯".
- Mỗi section (Ví dụ, Cụm từ, Đồng/trái nghĩa, Họ từ, Thông tin thêm, Ghi chú) có h2 `text-base` 600 — không phải nhãn xám nhỏ.

### 7.10 Phiên ôn `/review` (`(study)` layout, `review-session.tsx`, `flashcard.tsx`, `session-bar.tsx`)
Màn tập trung toàn màn hình. Nền `--paper`, không gì khác.
```
┌──────────────────────────────────────┐
│ ✕   ▬▬▬▬▬▬▬▬▭▭▭▭▭▭▭       8/24   ☁   │  thanh 6px mực tím
│                                      │
│   ┌──────────────────────────────┐   │
│   │┆                             │   │  flashcard = WordSpecimen lg trong sheet-lift
│   │┆                             │   │  rounded-sheet
│   │┆        resilient            │   │
│   │┆ ─────────────────────────── │   │
│   │┆     /rɪˈzɪliənt/   ▶        │   │
│   │┆                             │   │
│   │┆    Chạm hoặc nhấn Space     │   │
│   └──────────────────────────────┘   │
│                Từ mới                │  chip nhỏ, chỉ khi thẻ mới
│ ┌────────┬────────┬────────┬───────┐ │
│ │ Quên   │ Khó    │ Nhớ    │ Dễ    │ │  4 nút, viền trên 3px màu ý nghĩa
│ │ 1 phút │ 6 phút │ 1 ngày │ 4 ngày│ │  khoảng ôn lại dưới chữ
│ │   1    │   2    │   3    │   4   │ │  phím tắt (chỉ desktop)
│ └────────┴────────┴────────┴───────┘ │
└──────────────────────────────────────┘
```
- **Thanh trên**: nút thoát, thanh tiến độ, đếm, trạng thái đồng bộ; Bin 28px đứng ở đầu phần đã đi của thanh tiến độ (di chuyển theo `width`, đổi mood theo đánh giá vừa chọn) — khi Bin tắt thì không có gì.
- **Mặt trước**: specimen. Gợi ý "Chạm để lật" (mobile) / "Nhấn Space để lật" (desktop) — `text-sm --ink-soft`, không 👆.
- **Lật**: giữ cơ chế `.flip-card`, thời lượng 420ms `--ease-out`, có chút perspective. Reduced motion: đổi mặt tức thì (crossfade 0ms).
- **Mặt sau**: từ + phát âm thu nhỏ ở đầu (1 dòng, viền dưới), nghĩa VI 1.5rem 500 có nét **highlighter quét 1 lần** (dùng `highlighter-sweep` — chỗ duy nhất), nghĩa EN nhỏ, Hán Việt, 2 ví dụ dạng ruled. Ảnh (nếu có) 96px góc phải.
- **Nút đánh giá** (nhãn lấy từ `lib/srs/fsrs.ts`: Quên / Khó / Nhớ / Dễ — giữ nguyên; nhóm có `aria-label="Bạn nhớ từ này thế nào?"` — giữ): [bỏ] emoji 😵🤔🙂🤩 và nút 3D. Bốn nút `outline` cao 64px, viền trên 3px: Quên `--seal`, Khó `--turmeric`, Nhớ `--ink-violet`, Dễ `--leaf`. Chữ 600 + khoảng ôn `text-xs --ink-soft` + phím tắt (desktop).
- Nút "Lật thẻ" (trước khi lật, E2E khóa): primary `lg` full width, có gợi ý phím `Space` trên desktop.
- `SessionBar`: giữ trạng thái đồng bộ (spinner/cloud-off) nhưng icon 16px `--ink-soft`; banner offline dạng dòng `--tint-turmeric`.

### 7.11 Tổng kết phiên (`session-summary.tsx`)
```
┌──────────────────────────────────────┐
│                         ┌────────┐   │
│ Xong phiên rồi!  ╭╮╭╮   │ Đã ôn  │   │  SealStamp, xoay -8°, stamp-in; Bin (EndPup) cạnh dấu
│ Bạn nhớ 20/24 thẻ.      │ 23.10  │   │
│                         └────────┘   │
│ ──────────────────────────────────── │
│ Số thẻ          24                   │  bảng 2 cột ruled, số Literata tabular
│ Nhớ đúng        83%                  │
│ Thời gian       7 phút 40 giây       │
│ XP              +24                  │
│ ──────────────────────────────────── │
│ Cần xem lại (4)                      │
│ resilient     kiên cường          ›  │
│ ...                                  │
│ [Hỏi gia sư về các từ này] [Từ hay quên]│
│                                      │
│ [   Về trang Hôm nay   ] [Ôn tiếp]   │
└──────────────────────────────────────┘
```
- Tiêu đề giữ đúng chữ **"Xong phiên rồi!"** (E2E khóa), bỏ highlighter-animate ở đây (highlighter chỉ dùng ở mặt sau flashcard). Phần trăm hiện dạng "80%" (E2E khóa `getByText("80%")`).
- [bỏ] `Confetti`, emoji tâm trạng, lưới 4 ô màu. `summaryMood` giữ ngưỡng và mood, viết lại `text` không emoji: ≥90% "Gần như nhớ hết.", ≥70% "Nhớ phần lớn.", ≥40% "Một nửa đã vào đầu, ôn lại mai sẽ chắc hơn.", còn lại "Những từ này sẽ quay lại sớm để bạn ôn tiếp."
- Bin tắt: chỉ còn `SealStamp`, không emoji thay thế.
- Xóa `components/review/confetti.tsx` và CSS `.confetti-piece` khi không còn ai dùng.

### 7.12 Luyện tập `/practice` (`practice-setup.tsx`, `mode-look.ts`) và `/practice/[mode]`
**Màn chọn** — chia 2 nhóm theo đúng thứ tự trong registry:
```
Học bộ từ                                     ← learn, test, match (+ flashcard)
┌──────────────────┬──────────────────┬──────────────────┐
│ ▭▭▭▭  Học         │ ☑☐☑  Kiểm tra    │ ⇄    Ghép thẻ    │  radio card, viền 1px
│ Học theo vòng tới │ Làm bài trộn     │ Ghép từ với nghĩa│  chọn = viền 2px mực tím
│ khi thuộc hết bộ. │ nhiều dạng câu…  │ nhanh nhất…      │        + nền --tint-violet
└──────────────────┴──────────────────┴──────────────────┘
Luyện riêng từng kỹ năng                       ← quiz, typing, listening, cloze, writing, tones
┌────────┬────────┬────────┬────────┬────────┬────────┐  card nhỏ hơn, 1 dòng gợi ý
```
- `MODE_LOOK` giữ `icon`, bỏ `tile`/`ring` màu kẹo (hoặc đổi tất cả về cùng một kiểu trung tính). Mỗi card: **hình thu nhỏ đơn sắc** 48×32 bằng SVG mô tả cơ chế (Học = vòng tròn đứt; Kiểm tra = tờ giấy có ô tick; Ghép thẻ = 2 thẻ có đường nối; Lật thẻ = 2 thẻ chồng; Trắc nghiệm = 4 vạch; Gõ từ = con trỏ; Nghe = sóng âm; Điền từ = câu có ô trống; Luyện viết = ô 田字格; Thanh điệu = 4 dấu thanh) + tên 600 + gợi ý `text-sm` (lấy từ `MODE_INFO`). Mode chỉ có cho ZH gắn `LangMark 中`.
- Tùy chọn bên dưới đổi theo mode (giữ logic `countsFor`, nguồn từ, kiểu hỏi của Kiểm tra "Trộn / Từ / Nghĩa"): segmented cho số câu, nguồn ("Tất cả / Đến hạn / Hay quên nhất / Mới thêm"), kiểu hỏi. Bộ từ: `Select`. "Tính vào ôn tập": switch trong hàng ruled + mô tả (ẩn với Ghép thẻ vì không ghi kết quả).
- Nút "Bắt đầu luyện" `lg` — **bỏ 🚀**, giữ chữ "Bắt đầu luyện".
- Link "Từ hay quên" thành một hàng ruled cuối trang.

**Khung chung của mọi màn luyện** (`(study)` layout): thanh trên giống `/review` (thoát, tiến độ, đếm). **Sheet phản hồi** dùng chung (`question-parts.tsx`): trượt từ dưới lên 200ms, nền `--tint-leaf` (đúng) / `--tint-seal` (sai) / `--tint-turmeric` (gần đúng), vạch trên 3px cùng màu, Bin 40px bên trái (mood theo `answerMood`), tiêu đề giữ đúng chữ "Đúng rồi!" / "Chưa đúng" / "Gần đúng!" nhưng **bỏ emoji** 🎉😅👌, đáp án đúng, nút primary "Tiếp tục" (E2E khóa) + gợi ý `Enter`. Nhóm đáp án giữ `aria-label="Các đáp án"`.

**Học** (`learn-session.tsx`):
```
✕  ▬▬▬▬▬▬▬▬▬▬▬▭▭▭▭▭▭▭▭▭▭     12/34          thanh 2 đoạn: đã thuộc (--leaf) + đang học (--turmeric)
                Từ mới                     nhãn vòng: "Từ mới" / "Học lại" / "Ôn lại — gõ từ" (giữ chữ)
        ┌───────────────────────┐
        │┆  resilient            │          specimen md
        └───────────────────────┘
   [ kiên cường, mau phục hồi       ]  1     đáp án dạng hàng, phím 1–4
   [ đàn hồi                        ]  2
```
- **Hết vòng**: tiêu đề "Hết vòng {n}" (E2E khóa, bỏ highlighter), bảng ruled 3 dòng "Chưa học / Đang học / Đã thuộc" với thanh 6px và số tabular, nút "Học tiếp" (E2E khóa). Hết bộ: "Bạn đã thuộc hết N từ" (E2E khóa) + `SealStamp` "Thuộc".
- **Tiếp tục học?** (có tiến độ đã lưu): heading giữ chữ, Bin `think` hoặc hình `notebook` thay 📚, 2 nút "Học tiếp" / "Bắt đầu lại".

**Kiểm tra** (`test-session.tsx`) — trình bày như **tờ bài kiểm tra trên giấy**:
```
┌───────────────────────────────────────────┐
│┆ Bài kiểm tra   IELTS Core     Đã làm 3/20 │  ← tiêu đề tờ; "Đã làm x/y" giữ chữ (E2E)
│┆─────────────────────────────────────────── │
│┆ Câu 1:  Trắc nghiệm                        │  "Câu 1:" giữ chữ (E2E); số câu Literata
│┆   resilient — nghĩa của từ này là gì?      │
│┆   ○ kiên cường  ○ đàn hồi  ○ …  ○ …        │
│┆─────────────────────────────────────────── │  câu cách nhau bằng dòng kẻ, không bọc thẻ
│┆ Câu 2:  Đúng / Sai                         │
│┆   坚强 có nghĩa là "yếu đuối"    [Đúng][Sai] │
└───────────────────────────────────────────┘
                [ Nộp bài ]                     dính đáy; "Nộp bài" giữ chữ
```
- Bỏ `notebook-card` cho từng câu → cả bài là **một tờ** `.sheet` có đường lề đỏ; câu là các mục cách nhau bằng dòng kẻ. Ô điền từ: gạch dưới mực tím. Mục lục câu (chấm tròn đánh số, đã làm = tô mực) dính ở trên trên desktop.
- **Kết quả**: điểm "Đúng 8/10" (E2E khóa) cỡ Literata 3rem, góc phải là **điểm chấm bằng bút đỏ** trong vòng tròn (`--seal`, nét 2px, xoay -6°) — phiên bản "thầy cô chấm bài" của `SealStamp`. Danh sách câu sai dạng ruled: câu hỏi, "Bạn chọn" gạch ngang `--seal`, "Đáp án đúng" `--leaf`. Nút "Làm lại câu sai (n)" (E2E khóa) + "Học các từ sai" + "Làm bài mới". Bỏ 🏆🎉.

**Ghép thẻ** (`match-game.tsx`):
```
✕   ⏱ 12,4 giây                 Bảng 1/1      "Bảng x/y" giữ chữ (E2E)
┌──────────┐ ┌──────────┐ ┌──────────┐
│ resilient│ │ kiên     │ │ 坚强     │     12 ô, lưới 3×4 (mobile) / 4×3 (desktop)
│          │ │ cường    │ │          │     ô từ: Literata/Noto Serif; ô nghĩa: Be Vietnam
└──────────┘ └──────────┘ └──────────┘     ô như mảnh giấy cắt: viền 1px, bo 8px
```
- Màn bắt đầu: tiêu đề "Ghép thẻ", 1 câu luật chơi, kỷ lục hiện như dòng thông tin ("Kỷ lục của bạn: 18,4 giây") — bỏ 🏆 và ô icon màu; nút "Bắt đầu" (E2E khóa).
- Chọn ô: viền 2px mực tím + nền `--tint-violet`. Ghép đúng: 2 ô chuyển `--tint-leaf` rồi mờ dần 180ms và để lại chỗ trống có viền nét đứt (bàn không bị dồn). Ghép sai: 2 ô viền `--seal` + `shake` nhỏ (§4.7) + "+1 giây" bay lên một lần cạnh đồng hồ.
- Đồng hồ: Be Vietnam Pro 600 `tabular-nums`, không mono.
- **Kết thúc**: tiêu đề "Kỷ lục mới!" / "Kỷ lục đầu tiên!" / "Xong rồi!" (giữ chữ), thời gian Literata 3rem, bảng ruled "Thời gian / Kỷ lục / lần ghép sai" (giữ chữ "lần ghép sai"). Kỷ lục mới có `SealStamp` "Kỷ lục". Bỏ ô màu `wash-red`/`wash-yellow`, bỏ 🏆⏱️.

**Các màn luyện kỹ năng** (`practice-session.tsx`, `flashcard-deck.tsx`, `writing-pad.tsx`):
- **Lật thẻ tự do**: specimen; nút "Chưa thuộc" (outline, viền trên `--seal`) / "Đã thuộc" (viền trên `--leaf`); vuốt trái/phải có thẻ nghiêng nhẹ ≤ 6° theo tay kéo; chấm đếm thẻ dưới.
- **Trắc nghiệm**: câu hỏi = specimen md; 4 đáp án là nút outline full width cao 56px, có phím 1–4. Đúng: nền `--tint-leaf` viền `--leaf` + icon check; sai: nền `--tint-seal` viền `--seal`, đáp án đúng được viền `--leaf`. Không rung lắc.
- **Gõ từ / điền từ**: input lớn 56px Literata (giữ `aria-label` "Gõ từ tiếng Anh" / "Gõ chữ Hán hoặc pinyin"), ô trống trong câu là gạch dưới dài bằng từ. Sau khi trả lời: ký tự sai gạch chân `--seal`.
- **Nghe**: nút phát âm tròn 72px viền 2px mực tím ở trung tâm; nút "Nghe lại" phụ.
- **Luyện viết chữ Hán**: ô 田字格 lớn (min(80vw, 320px)) chuẩn §5.1; nét mẫu `--rule-strong`, nét người viết `--ink`, nét sai flash `--seal` 200ms.
- **Thanh điệu**: 4 nút lớn có dấu thanh vẽ bằng SVG (ˉ ˊ ˇ ˋ) màu tone tương ứng.

### 7.13 Từ hay quên `/hard-words`
- h1 + mô tả 1 dòng. Segmented ngôn ngữ. Hàng nút: primary "Luyện các từ này", outline "Lật thẻ", secondary "Hỏi gia sư".
- Danh sách ruled: từ (Literata/Noto Serif) + đọc + nghĩa + số lần quên (chữ `--seal`, "quên 5 lần").
- Empty: `EmptyState check` "Chưa có từ nào hay quên."

### 7.14 Gia sư `/chat`, `/chat/[threadId]` (`chat-view.tsx`, `message-text.tsx`, `suggest-word-card.tsx`)
Rủi ro "AI quá" cao nhất ở đây → làm như một **cuộc trao đổi với thầy cô trong vở**, không như ChatGPT.
- Danh sách hội thoại: ruled list, mỗi hàng = tiêu đề 600 + tin cuối 1 dòng + thời gian tương đối bên phải. Nút "Cuộc trò chuyện mới" primary ở header.
- Trong hội thoại: cột `max-w-2xl`.
  - Tin người dùng: căn phải, nền `--tint-violet`, chữ `--ink`, bo 14px (góc dưới phải 4px). 
  - Tin gia sư: **không bong bóng**, căn trái, chữ `--ink` trên nền giấy, có vạch lề đỏ mảnh bên trái (như lời phê bên lề vở). Không avatar robot; tên "Gia sư" nhỏ `--ink-soft` ở tin đầu tiên của mỗi lượt.
  - Không icon ✨, không gradient "AI", không chữ "AI" lấp lánh.
  - Trạng thái công cụ ("Đang xem sổ từ của bạn…"): một dòng `text-sm --ink-soft` với 3 chấm nhịp chậm (tắt khi reduced motion).
  - `SuggestWordCard`: specimen sm + nghĩa + nút outline "Thêm vào bộ từ".
  - Gợi ý mở đầu: 4 nút outline dạng hàng (icon lucide + chữ), [bỏ] emoji 🎭✍️🔍.
  - Ô nhập: dính đáy, textarea tự giãn tối đa 6 dòng, nút gửi icon tròn 40px mực tím, `Enter` gửi / `Shift+Enter` xuống dòng (giữ hành vi hiện có nếu đã có).
- Markdown renderer: chỉnh style: đoạn cách 0.75em, list có bullet `--ink-soft`, **in đậm** dùng 600 (không đổi màu), code inline nền `--surface-sunk`.

### 7.15 Khám phá `/explore`
- h1 + mô tả. Thanh tìm kiếm 44px full width với nút "Tìm" outline gắn liền (input group). Segmented ngôn ngữ + segmented sắp xếp ("Nhiều người học / Mới nhất") cùng hàng trên desktop.
- Kết quả: cùng deck card §7.5 nhưng góc phải là "128 người học" + nút secondary "Theo học" (giữ `SubscribeButton`).
- Empty: `EmptyState notebook` "Không có bộ từ nào khớp “…”." + nút xóa bộ lọc.

### 7.16 Nhóm `/groups`, `/groups/new`, `/groups/[id]`, `/groups/[id]/settings`, `/join/[code]`
- **Danh sách nhóm**: [bỏ] avatar emoji động vật ngẫu nhiên (🦊🐼…) → avatar nhóm = **chữ cái đầu** trong ô vuông bo 10px, nền màu bìa vở theo `deckTone(group.id)`, chữ trắng. Hàng: tên 600, số thành viên, "bạn là chủ nhóm" thành chip nhỏ. Form "Nhập mã mời" (`join-code-form`) là input group 1 hàng ở đầu trang.
- **Trang nhóm**: header (tên, mô tả, nút cài đặt icon). Desktop 2 cột: trái = bộ từ của nhóm (ruled list với `DeckCover sm`) + hoạt động gần đây; phải = bảng xếp hạng + mời bạn.
- **Hoạt động** (`activity-feed.tsx`): dòng thời gian dọc, chấm 6px `--rule-strong`, mỗi dòng "Lan ôn 40 thẻ" + thời gian; chuỗi ngày bằng icon `Flame` 14px `--turmeric`.
- **Mời bạn** (`invite-panel.tsx`): mã mời Literata 1.75rem, `letter-spacing: .12em`, nút copy icon; QR trong khung `.qr-paper` [giữ]; link chia sẻ dạng input chỉ đọc + nút "Sao chép".
- **Trang `/join/[code]`** (public): layout auth, specimen-free; hiện tên nhóm, số thành viên, 3 avatar chữ cái, nút primary "Vào nhóm".

### 7.17 Bảng xếp hạng (`leaderboard.tsx`) — "sổ điểm"
```
Tuần này                       Tính lại từ 0:00 thứ Hai
──────────────────────────────────────────────────────
 1   (L) Lan  [Nhất]    ⌁ 14 ngày          320 XP
 2   (M) Minh                              290 XP
 3   (T) Trọng (bạn)                       210 XP   ← hàng của bạn nền --tint-violet
──────────────────────────────────────────────────────
```
- [bỏ] huy chương emoji 🥇🥈🥉. Hạng là số Literata 600 (đây là trình tự thật). Hạng 1 có `SealStamp` mini "Nhất" 28px cạnh tên — chỉ một điểm nhấn.
- Chuỗi ngày dùng icon `Flame` lucide 14px (ký hiệu `⌁` trong sơ đồ), không emoji.
- XP căn phải, tabular.

### 7.18 Thống kê `/stats` (`stats/page.tsx`, `reviews-chart.tsx`, `heatmap.tsx`)
Giữ nội dung và chữ mà chủ repo đã viết lại (mỗi mục một dòng giải thích); chỉ đổi trình bày.
```
Thống kê
Bạn học thế nào trong 30 ngày gần đây
╭╮╭╮  30 ngày qua bạn ôn 412 lượt, nhớ đúng 84%.          ← Bin + câu tóm tắt (giữ)
──────────────────────────────────────────────────────────
Từ đã nhớ   │ Lượt ôn       │ Nhớ đúng          │ Ngày có học
  186       │   412         │   84%             │   23
            │ trong 30 ngày │ số lần trả lời đúng│
──────────────────────────────────────────────────────────
Mỗi ngày bạn ôn bao nhiêu
▁▃▅▂▇▆▃▁▄▆█▅▃ …   (cột mực tím, hôm nay đậm hơn)
──────────────────────────────────────────────────────────
Bạn đã thuộc đến đâu
EN ▕████░░░░▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▏   Chưa học 40  Đang tập nhớ 22  Đã nhớ 60  Nhớ chắc 118
中 ▕██████░░▓▓▓▒▒▒▒▒▏
──────────────────────────────────────────────────────────
Lịch học
▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦
```
- **Bốn chỉ số** ("Từ đã nhớ / Lượt ôn / Nhớ đúng / Ngày có học" — giữ chữ và dòng phụ): bỏ 4 ô có emoji 🧠🃏🎯📅 → **một hàng liền**, ngăn bằng đường dọc 1px, nhãn `text-sm --ink-soft` trên, số Literata 600 2rem dưới, dòng phụ `text-xs`. Mobile: lưới 2×2 có đường ngăn chữ thập. Chỉ so sánh với kỳ trước nếu dữ liệu đã có; **không** bịa.
- **Biểu đồ lượt ôn** (recharts): cột bo trên 3px `--ink-violet`, hôm nay đậm hơn; lưới ngang `--rule` nét đứt; trục `text-xs --ink-soft`; tooltip nền `--ink` chữ `--paper`. Không gradient fill. Giữ `sr-only` mô tả.
- **"Bạn đã thuộc đến đâu"**: giữ một thanh xếp chồng cho mỗi ngôn ngữ (đầu dòng `LangMark`), cao 12px, bo 3px, 4 đoạn dùng **thang một màu** mực tím từ nhạt đến đậm (Chưa học = `--surface-sunk` có viền, Đang tập nhớ = 35%, Đã nhớ = 65%, Nhớ chắc = 100%) — đúng nghĩa "đi dần từ trái sang phải". Chú giải bên dưới: ô màu 10px + tên + số + gợi ý 1 dòng (giữ). Tạm ẩn vẫn là ghi chú nhỏ.
- **Lịch học** (heatmap) theo §5.7, giữ câu giải thích ngày nghỉ (ô viền nét đứt).
- Mỗi mục là h2 `text-lg` 600 + dòng giải thích `text-sm --ink-soft`; mục cách nhau bằng đường kẻ 1px và 32px, không bọc thẻ.
- Đọc skill `dataviz` / Refactoring UI khi làm phần này.

### 7.19 Cài đặt `/settings`
- Desktop: 2 cột — mục lục dính bên trái (Hồ sơ, Mật khẩu, Ôn tập, Thông báo, Phát âm, Linh vật, Giao diện, Ứng dụng, Liên hệ & góp ý, Dữ liệu, Xóa tài khoản — theo đúng thứ tự trong `settings/page.tsx`) với scrollspy; nội dung `max-w-xl` bên phải. Mobile: 1 cột, section cách nhau bằng tiêu đề h2 + khoảng 32px.
- Mỗi cài đặt là hàng ruled: nhãn 500 + mô tả `text-sm --ink-soft` bên trái, điều khiển bên phải.
- **Giao diện**: thay `theme-toggle` bằng 3 radio card nhỏ có hình xem trước (Sáng / Tối / Theo hệ thống) vẽ bằng CSS (mini trang vở).
- Avatar upload: tròn 72px, nút "Đổi ảnh" outline.
- **Linh vật** (`mascot-prefs.tsx`) [giữ]: bên trái ô xem trước 112×112 nền `--surface` có dòng kẻ vở mờ, Bin ở giữa, bấm để đổi mood (giữ `aria-label`); bên phải là 2 hàng ruled: switch "Hiện bạn cún" + mô tả, input "Tên bạn cún". Bỏ `hover:scale-105`.
- Xóa tài khoản: khối viền `--seal`, nút destructive đặc, dialog xác nhận gõ lại email [giữ hành vi hiện có].

### 7.20 Bộ từ công khai `/d/[slug]`, Liên hệ `/lien-he`, Offline `/offline`, lỗi
- **`/d/[slug]`**: header như §7.6 (bìa lg, tên, chủ sở hữu, số từ) + nút primary "Lưu vào sổ của tôi" (giữ chữ hiện có nếu E2E dùng). 5 từ đầu hiển thị dạng specimen sm, phần còn lại ruled list. Thêm Open Graph image động **không bắt buộc** (ghi chú P8).
- **`/lien-he`**: một trang vở: lời chào ngắn của Xễu Đùng Đùng (1–2 câu), 2 nút Facebook/Zalo outline có icon thương hiệu đơn sắc. Không emoji.
- **`/offline`**: `EmptyState notebook` "Đang mất mạng." + "Các thẻ bạn đã ôn sẽ được gửi khi có mạng lại." + nút "Thử lại" [giữ `retry-button`].
- **[mới] `app/not-found.tsx` và `app/(app)/error.tsx`** (nếu chưa có): ô 田字格 trống + "Không tìm thấy trang này." + nút "Về trang Hôm nay". Lỗi: "Có lỗi khi tải trang." + "Thử lại" (gọi `reset`).

### 7.21 Tìm nhanh ⌘K (`quick-search.tsx`) & menu người dùng
- Command palette: dialog 560px top 15vh, input 52px không viền + viền dưới, kết quả nhóm "Từ" / "Bộ từ" / "Đi tới"; mỗi từ hiện `LangMark` + từ (Literata/Noto) + nghĩa. Mục đang chọn nền `--surface-sunk` + vạch trái mực tím. Chân dialog: gợi ý phím `↑↓ Enter Esc` chữ `text-xs`.
- User menu: tên + @username ở đầu, rồi Hồ sơ, Cài đặt, Giao diện (submenu 3 lựa chọn), Liên hệ, Đăng xuất.

---

## 8. Câu chữ (giọng tiếng Việt)

- Xưng hô: "bạn" — "mình" chỉ trong lời gia sư. Câu ngắn, động từ rõ, viết hoa chữ đầu câu, không chấm than liên tục.
- Nút nói đúng việc xảy ra: "Bắt đầu ôn", "Lưu từ", "Tạo bộ từ", "Theo học", "Sao chép link". Toast dùng cùng động từ: "Đã lưu từ", "Đã tạo bộ từ", "Đã sao chép link".
- Lỗi nói chuyện gì xảy ra và cách sửa: "Không gửi được tin nhắn. Kiểm tra mạng rồi thử lại." (đã tốt — giữ phong cách này). Không xin lỗi, không "Oops".
- Empty state = lời mời hành động: "Sổ của bạn còn trống." + nút.
- Bỏ: câu cổ vũ xoay vòng, "vui như chơi game", "Não bạn đang chờ được tập thể dục", "Trí nhớ siêu đỉnh", "đừng để lửa tắt!".
- Không dùng chữ "AI" làm điểm bán hàng ở UI chính; nói việc nó làm: "Gợi ý nghĩa và ví dụ". (Chỗ cần minh bạch nguồn — dòng trạng thái của form — vẫn ghi "AI".)
- **Trước khi đổi bất kỳ chuỗi nào: grep `tests/e2e`.**

### 8.1 Chuỗi bị khóa (E2E dùng ở commit `d7802e3`) — giữ nguyên chữ, được phép bỏ emoji đi kèm
Nhãn input: "Email", "Mật khẩu", "Mật khẩu mới", "Nhập lại mật khẩu mới", "Tên của bạn", "Tên hiển thị", "Tên người dùng", "Từ", "Nghĩa tiếng Việt", "Gõ từ tiếng Anh", "…để xác nhận".
Nút: "Đăng nhập", "Tạo tài khoản", "Hiện mật khẩu", "Gửi link đặt lại mật khẩu", "Lưu mật khẩu", "Bắt đầu học…", "Bắt đầu", "Bắt đầu trò chuyện", "Gợi ý…", "Lưu từ", "Lật thẻ…", "Nhớ…", "Tiếp tục", "Làm tiếp", "Học tiếp", "Nộp bài", "Làm lại câu sai (n)", "Thử lại", "Xóa tài khoản", "Xóa vĩnh viễn", "Xóa cuộc trò chuyện…", "Kiểm tra nhanh 5 từ đến hạn…", "Đúng", "Sai".
Link: "Gia sư", "Thêm từ", "Quên mật khẩu?", "Bắt đầu ôn…", "Thêm vào <tên bộ>".
Nhóm/switch/radio: "Bạn nhớ từ này thế nào?", "Các đáp án", "Đúng hay sai?", switch "Thêm bộ từ mẫu", radio "Tiếng Anh…".
Tiêu đề/chữ: "Chào buổi …, <tên>!", "Chuỗi ngày", "Xong phiên rồi!", "Đúng rồi!", "80%" (dạng phần trăm), "Câu 1:", "Đã làm x/y", "Đúng x/y", "Bảng 1/1", "lần ghép sai", "Kỷ lục đầu tiên!", "Tiếp tục học?", "Hết vòng …", "Bạn đã thuộc hết N từ…", "Bạn đang offline", "Link đã hết hạn", "Đặt mật khẩu mới", "Đã lưu <từ>", "Đã lưu mật khẩu mới", "Đã xóa cuộc trò chuyện", các thông báo lỗi form auth.
Nếu buộc phải đổi một chuỗi trong danh sách này, sửa test trong **cùng commit** và ghi lý do vào commit message.

---

## 9. Lộ trình triển khai

Mỗi giai đoạn: code → `pnpm lint && pnpm typecheck && pnpm test` → chụp màn 390/1280 sáng/tối → tự xem ảnh, đối chiếu §3.3 → sửa → commit.

| Giai đoạn | Việc | Xong khi |
|---|---|---|
| **P0 – Chuẩn bị** | Cài skill §2. Chụp ảnh "trước" mọi route vào `docs/redesign/before/`. Grep chuỗi E2E, lưu danh sách vào `docs/redesign/e2e-strings.md`. | Có bộ ảnh trước + danh sách chuỗi không được đổi |
| **P1 – Nền móng** | `globals.css`: token §4 (sáng+tối), alias token cũ, xóa nền đốm màu, xóa `.hero-gradient`, `.btn-3d`, `float/wiggle/pop-in`; thêm `stamp-in`, `ink-draw`, lớp `.sheet`, `.sheet-lift`, `.ruled-paper`, `.margin-line`. Font: bỏ Nunito, thêm Literata (tạm đổi `FONT` trong `pup.tsx` sang `var(--font-sans)` cho tới khi vẽ lại Bin ở P2). `themeColor`. Đổi token `--pup-*` theo §5.8. Viết lại `button.tsx`, `input`, `select`, `switch`, `checkbox`, `radio-group`, `tabs`, `dialog`, `sheet`, `dropdown-menu`, `popover`, `tooltip`, `badge`, `progress`, `skeleton`, toast. | App chạy được, đã "đổi da" toàn bộ, không còn gradient/nút 3D |
| **P2 – Thành phần đặc trưng & khung** | `WordSpecimen`, `SealStamp`, `LangMark`, `DeckCover` mới, `StatusDot`, `EmptyState` + 5 hình nét, `ProgressRing`, `Heatmap`. **Bin vẽ lại** + `MascotSay` + `lines.ts` (§5.8; `pnpm test` phải xanh với `mascot.test.ts`). Sidebar (thẻ Bin, nhóm Học/Khác), top bar + công tắc sáng/tối, bottom nav, FAB, logo + `gen-icons`. | Khung app mới hoàn chỉnh; trang Storybook-lite tạm `/dev/ui` (chỉ dev, xóa ở P8) hiển thị mọi thành phần sáng/tối |
| **P3 – Hôm nay & Bộ từ** | §7.4, §7.5, §7.6, §7.7 | Ảnh Today 3 trạng thái (trống / còn bài / xong bài) đẹp ở cả 4 biến thể |
| **P4 – Ôn & Luyện** | §7.10–§7.13: phiên ôn, tổng kết, màn chọn chế độ, sheet phản hồi chung, Học, Kiểm tra, Ghép thẻ, các mode kỹ năng (+ motion skill) | Phiên ôn và 3 game chạy trọn bằng bàn phím; reduced motion OK; xóa Confetti; E2E `study-games` và `core-flow` xanh |
| **P5 – Từ** | §7.8, §7.9, stroke-order, writing-pad dùng chung 田字格 | Form thêm từ: luồng gợi ý không đổi, E2E `core-flow` xanh |
| **P6 – Xã hội & Gia sư** | §7.14–§7.17, §7.20 (public deck, join) | Chat không còn dấu hiệu "AI" ở chrome; E2E `chat` xanh |
| **P7 – Ngoài app** | §7.1 landing (gồm ảnh chụp UI mới), §7.2 auth, §7.3 welcome, §7.18 stats, §7.19 settings, §7.20 còn lại, §7.21 | Lighthouse landing ≥ 95 (perf, a11y); ảnh landing ≤ 80 KB |
| **P8 – Dọn & tài liệu** | Xóa alias token cũ (khi `rg` = 0), xóa CSS/compo không dùng, xóa `/dev/ui`. Chạy audit Vercel guidelines + Refactoring UI trên toàn bộ. Chụp ảnh "sau" vào `docs/redesign/after/`. Cập nhật `CLAUDE.md` mục Conventions + Deviations (design system mới "Vở mực tím", token, font, quy tắc cấm §3.3). `pnpm test:e2e`. | Toàn bộ test xanh; CLAUDE.md phản ánh hệ thống mới |

---

## 10. Checklist chất lượng (mỗi PR)

**Thị giác**
- [ ] Đối chiếu đủ 12 mục §3.3.
- [ ] Không phá quyết định của chủ repo (đầu file): Bin còn, Hôm nay không có "Mục tiêu ngày", chữ Thống kê giữ nguyên, công tắc sáng/tối còn.
- [ ] Bin bật và tắt đều đẹp (chụp cả hai trạng thái ở Hôm nay, tổng kết phiên, sidebar).
- [ ] Mỗi màn chỉ một điểm nhấn (thường là specimen hoặc con dấu).
- [ ] Màu chỉ xuất hiện khi mang nghĩa (§3.2.2).
- [ ] Radius đúng thứ bậc §4.6; không còn `rounded-[Npx]` tùy tiện.
- [ ] Số dùng `tabular-nums`; số lớn dùng Literata.
- [ ] Baseline chữ trên specimen nằm đúng dòng kẻ ở cả 390px và 1280px.

**Truy cập & kỹ thuật**
- [ ] Contrast chữ ≥ 4.5:1 (UI lớn ≥ 3:1) ở cả sáng/tối.
- [ ] Touch target ≥ 44px; icon button có `aria-label` tiếng Việt.
- [ ] Focus thấy rõ trên mọi phần tử tương tác; thứ tự tab hợp lý; flashcard điều khiển được bằng phím.
- [ ] `prefers-reduced-motion`: không lật xoay, không stamp-in, không shimmer.
- [ ] Không horizontal scroll ở 360px.
- [ ] Không thêm origin mới vào trình duyệt (CSP trong `next.config.ts`); font qua `next/font` nên không cần.
- [ ] Landing/auth không tải Noto SC (giữ quy tắc fonts trong CLAUDE.md).
- [ ] Không màu hex thô trong component — chỉ token.
- [ ] UI tiếng Việt; code/comment tiếng Anh.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` xanh; `pnpm test:e2e` xanh ở P4, P5, P6, P8.

**Bài kiểm tra cuối "có giống AI không?"**
Mở ảnh chụp từng màn và tự hỏi: *nếu che logo, màn này có thể là của một app bất kỳ không?* Nếu có — chưa xong. Mỗi màn phải có ít nhất một chi tiết chỉ thuộc về Sổ Từ: dòng kẻ vở, đường lề đỏ, ô 田字格, nhãn vở, con dấu son, hoặc nét bút dạ.
