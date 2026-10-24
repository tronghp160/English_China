# E2E-locked strings and structure (redesign "Vở mực tím")

Generated from `rg "getByRole|getByText|getByLabel|name:" tests/e2e` at commit `d7802e3` (see REDESIGN_PLAN §8.1).
Keep these texts. Emoji next to them may go. If one must change, edit the test in the same commit and say why.

## Text
- Input labels: Email · Mật khẩu · Mật khẩu mới · Nhập lại mật khẩu mới · Tên của bạn · Tên hiển thị · Tên người dùng · Từ · Nghĩa tiếng Việt · Gõ từ tiếng Anh · "...để xác nhận" (delete account)
- Buttons: Đăng nhập (exact) · Tạo tài khoản · Hiện mật khẩu · Gửi link đặt lại mật khẩu · Lưu mật khẩu · Tiếp tục (onboarding step 1) · /Bắt đầu học/ · Bắt đầu · Bắt đầu trò chuyện · /Gợi ý/ · Lưu từ · /Lật thẻ/ · /Nhớ/ (inside group "Bạn nhớ từ này thế nào?") · /^Tiếp tục/ (practice feedback) · Làm tiếp · Học tiếp · Nộp bài · Làm lại câu sai (2) · Thử lại · Xóa tài khoản · Xóa vĩnh viễn · /Xóa cuộc trò chuyện/ · /Kiểm tra nhanh 5 từ đến hạn/ · Đúng · Sai (exact)
- Links: Gia sư · Thêm từ · Quên mật khẩu? · /Bắt đầu ôn/ · `Thêm vào <deck name>` · /Từ vựng tiếng Anh của tôi/ (deck card link) · /resilient/ (word row link)
- Groups / switch / radio: group "Bạn nhớ từ này thế nào?" · group "Các đáp án" · group "Đúng hay sai?" · switch "Thêm bộ từ mẫu" · radio /Tiếng Anh/
- Headings / text: /Chào buổi .+, <name>!/ · Chuỗi ngày · "1" (streak number, `getByText(/^1$/)`) · Xong phiên rồi! · Đúng rồi! · 80% · Câu 1: · Đã làm x/y · Đúng 8/10 · Bảng 1/1 · lần ghép sai · Kỷ lục đầu tiên! · Tiếp tục học? · /Hết vòng/ · /Bạn đã thuộc hết 3 từ/ · Bạn đang offline · Link đã hết hạn · Đặt mật khẩu mới · Đã lưu resilient · Đã lưu mật khẩu mới · Đã xóa cuộc trò chuyện · "Còn 2 câu chưa làm" (alertdialog)
- Auth messages: Email hoặc mật khẩu không đúng. · Nhập tên hiển thị · Email chưa đúng định dạng · Mật khẩu cần ít nhất 8 ký tự · Email này đã có tài khoản. · Nếu <email> có tài khoản Sổ Từ · Hai mật khẩu chưa khớp
- Manifest: `short_name: "Sổ Từ"`, `display: standalone`, `lang: vi`

## Structure the tests rely on
- Test mode: each question is a `section[aria-labelledby]` containing a group "Các đáp án" or "Đúng hay sai?".
- Learn mode reads `main` textContent to find the current word.
- Chat: a list item whose text contains "Gia sư:" (the tutor message prefix, can be `sr-only`); a `listitem` containing the delete button for each thread.
- Review: after flipping, the back face shows the Vietnamese meaning; the rating buttons are inside group "Bạn nhớ từ này thế nào?".
- Mascot unit test (`tests/unit/mascot.test.ts`) locks the mood names and `say()` behavior.
