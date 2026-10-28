# Đưa Sổ Từ lên mạng (Vercel + Supabase)

Làm lần lượt từ trên xuống. Mỗi bước có ghi chỗ bấm trên giao diện web.

## 1. Đổi khóa bí mật (bắt buộc trước khi deploy)
Secret key và mật khẩu database từng bị dán vào chat, nên coi như đã lộ.

1. Supabase → **Project Settings → API Keys** → tạo secret key mới và xóa key cũ.
2. Supabase → **Project Settings → Database → Reset database password**.
3. Cập nhật `.env.local`:
   - `SUPABASE_SERVICE_ROLE_KEY` = key mới.
   - `SUPABASE_DB_URL`: thay mật khẩu mới. Ký tự `@` trong mật khẩu phải viết thành `%40`.
4. Chạy `pnpm dev` và `pnpm db:push --dry-run` để chắc key mới dùng được.

## 2. Đưa code lên GitHub
1. Trên github.com tạo repo **private**, không chọn README.
2. Trong thư mục dự án:
   ```
   git remote add origin https://github.com/<tên-bạn>/so-tu.git
   git push -u origin main
   ```
3. Vào tab **Actions** của repo, kiểm tra CI (lint, typecheck, test) báo xanh.

`.env.local` nằm trong `.gitignore`, nên khóa bí mật không bị đẩy lên.

## 3. Tạo project trên Vercel
1. vercel.com → **Add New → Project** → chọn repo vừa tạo. Framework tự nhận là Next.js.
2. **Settings → Functions → Function Region**: chọn **Singapore (sin1)** (cùng vùng với Supabase).
3. **Settings → Environment Variables**: thêm các biến dưới đây cho cả Production và Preview.

| Biến | Giá trị |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | lấy từ `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | lấy từ `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | key **mới** ở bước 1 |
| `NEXT_PUBLIC_SITE_URL` | `https://<tên-project>.vercel.app` (hoặc domain riêng) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | key miễn phí ở aistudio.google.com, nếu dùng Gemini |
| `ANTHROPIC_API_KEY` | nếu dùng Claude (nhập từ ảnh chụp vở bắt buộc phải có key này) |
| `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY` | key ở pexels.com/api và unsplash.com/developers |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | lấy từ `.env.local` (hoặc tạo mới bằng `pnpm exec web-push generate-vapid-keys`; đổi khóa thì mọi máy phải bật lại nhắc ôn) |
| `VAPID_SUBJECT` | `mailto:` + email liên hệ của bạn |
| `CRON_SECRET` | một chuỗi ngẫu nhiên dài; Vercel tự gửi nó khi chạy lịch nhắc ôn 19:00 (`vercel.json`) |
| `AI_DAILY_LIMIT_PER_USER`, `AI_GLOBAL_DAILY_LIMIT`, `SIGNUP_LIMIT_PER_HOUR`, `AI_RPM_LIMIT` | có thể bỏ trống để dùng mặc định (100 / 3000 / 8 / 10) |
| `AI_MODEL_GOOGLE`, `AI_MODEL_CHAT_GOOGLE` | xem mục "Tối ưu gói miễn phí" bên dưới |

Không thêm `SUPABASE_DB_URL` lên Vercel; biến này chỉ dùng cho `pnpm db:push` trên máy bạn.

4. Bấm **Deploy**.

## 4. Cấu hình Supabase cho domain mới
Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://<tên-project>.vercel.app`
- **Redirect URLs**: thêm `https://<tên-project>.vercel.app/auth/callback` và `https://*-<tên-tài-khoản-vercel>.vercel.app/auth/callback` (cho bản preview).

Link đặt lại mật khẩu được gửi qua SMTP mặc định của Supabase, chỉ tới được email của thành viên project, mỗi giờ chỉ vài thư. Muốn bạn bè dùng được "Quên mật khẩu" thì vào **Authentication → Emails → SMTP Settings** và nối với một dịch vụ như Resend.

## 5. Giới hạn chi phí AI
- Anthropic Console → **Settings → Limits**: đặt spend limit hằng tháng.
- Gemini gói miễn phí không tính tiền; vượt hạn mức thì app tự dùng gợi ý từ điển.

### Tối ưu gói miễn phí (Gemini + Vercel Hobby + Supabase Free)
1. Vercel → **Settings → Functions → Function Region** = **Singapore (sin1)**, cùng vùng với Supabase (mỗi lượt hỏi database từ vùng khác tốn thêm vài trăm ms).
2. Vào https://aistudio.google.com → xem bảng **Rate limits** của key. Chọn model "flash-lite" mới nhất cho gợi ý từ: thường có hạn mức/phút cao hơn và trả lời nhanh hơn. Ghi **tên model chính xác** vào `AI_MODEL_GOOGLE`.
3. `AI_MODEL_GOOGLE` nhận **danh sách cách nhau bằng dấu phẩy**: `model-chinh,model-du-phong`. Gói miễn phí của Gemini tính hạn mức **riêng cho từng model**, nên thêm model dự phòng là tăng sức chứa miễn phí: khi model chính báo hết hạn mức phút (429), app tự chuyển sang model kế. Tự kiểm tra tên và hạn mức từng model trong AI Studio.
4. `AI_RPM_LIMIT` (mặc định 10): số lần gọi AI mỗi phút cho **cả app**. Đặt thấp hơn hạn mức/phút của model chính một chút; vượt quá thì app báo "AI đang bận", vẫn điền từ từ điển và tự thử lại sau vài giây thay vì để Google trả lỗi.
5. `AI_MODEL_CHAT_GOOGLE` (tùy chọn): model riêng cho Gia sư, để chat không ăn hạn mức của gợi ý từ. Bỏ trống thì Gia sư dùng model chính.
6. Gợi ý từ giờ hỏi từ điển miễn phí và cache chung trước (`/api/lookup`, không tốn lượt), rồi mới gom các từ thành lô ≤ 10 từ gửi AI trong nền. Trong Vercel → Logs, dòng `[ai] google/<model> …` là một lần gọi AI; `[ai] rate-limited model=…` là lúc model bị giới hạn và app chuyển model.
7. Tên model và hạn mức của Google đổi theo thời gian, nên code không ghi cứng chúng (ngoài giá trị mặc định trong `lib/env.ts`). Khi thấy log `[ai] rate-limited` nhiều, xem lại bảng Rate limits.

## 6. Kiểm tra sau khi deploy
Trên domain Vercel, thử bằng điện thoại:
1. Đăng ký tài khoản mới, vào thẳng app không cần email.
2. Thêm "resilient" và "坚强" bằng nút Gợi ý: form tự điền, có ảnh gợi ý.
3. Ôn 5 thẻ; tắt mạng giữa chừng rồi bật lại, kết quả vẫn được lưu.
4. Tạo nhóm, mở link mời bằng tài khoản thứ hai.
5. Mở trang một từ tiếng Trung, xem thứ tự nét hiện ra.
6. Chạy Lighthouse (Chrome DevTools → Lighthouse → Mobile) trên `/today`: mục tiêu Performance ≥ 85, Accessibility ≥ 95.

Chạy E2E với AI thật trên máy (tốn vài lượt AI): `E2E_REAL_AI=1 pnpm test:e2e`.

## 7. Giám sát người dùng (Admin Monitoring)
- **Vị trí và địa lý (Geo IP):**
  - Vị trí người dùng (thành phố, quốc gia, tọa độ) được tự động nhận diện từ các header của Vercel (`x-vercel-ip-city`, `x-vercel-ip-country`, `x-vercel-ip-latitude`, `x-vercel-ip-longitude`).
  - Khi chạy local hoặc máy chủ không có Vercel Geo headers, hệ thống sẽ hiển thị "Máy local (không có vị trí)".
- **Database migrations:**
  - Chạy `pnpm db:push` để đẩy các migration mới (`20261028000012_presence.sql`, `20261028000013_admin_audit.sql`) lên Supabase production.
- **Quyền riêng tư:**
  - Chính sách quyền riêng tư (`/quyen-rieng-tu`) và tính năng xuất dữ liệu người dùng (`/cai-dat`) đã tự động cập nhật công khai việc thu thập thông tin phiên đăng nhập (lưu tối đa 90 ngày) và minh bạch nhật ký quản trị viên.
