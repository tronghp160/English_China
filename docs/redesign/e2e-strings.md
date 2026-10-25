# E2E-locked strings and structure (still valid for redesign V2 and V3)

Generated from `rg "getByRole|getByText|getByLabel|name:" tests/e2e` at commit `d7802e3` (see REDESIGN_PLAN §8.1).
Keep these texts. Emoji next to them may go. If one must change, edit the test in the same commit and say why.

## Text
- Input labels: Email · Mật khẩu · Mật khẩu mới · Nhập lại mật khẩu mới · Tên của bạn · Tên hiển thị · Tên người dùng · Từ · Nghĩa tiếng Việt · Gõ từ tiếng Anh · "...để xác nhận" (delete account)
- Buttons: Đăng nhập (exact) · Tạo tài khoản · Hiện mật khẩu · Gửi link đặt lại mật khẩu · Lưu mật khẩu · Tiếp tục (onboarding steps 1 and 2; V3 added step 3, the summary, so the flow clicks it twice) · /Bắt đầu học/ · Bắt đầu · Bắt đầu trò chuyện · /Gợi ý/ · Lưu từ · /Lật thẻ/ · /Nhớ/ (inside group "Bạn nhớ từ này thế nào?") · /^Tiếp tục/ (practice feedback) · Làm tiếp · Học tiếp · Nộp bài · Làm lại câu sai (2) · Thử lại · Xóa tài khoản · Xóa vĩnh viễn · /Xóa cuộc trò chuyện/ · /Kiểm tra nhanh 5 từ đến hạn/ · Đúng · Sai (exact)
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

## Added in V3 (tests/e2e/auth-bin.spec.ts, bin-home.spec.ts, today-v3.spec.ts)
- Sign-in pages: nav "Chọn trang" with links Đăng nhập and Đăng ký (aria-current="page"); headings "Chào mừng trở lại!", "Tạo sổ từ miễn phí", "Quên mật khẩu à? Không sao"; password strength words (Mật khẩu hơi yếu, khá ổn, mạnh) and the checks "Ít nhất 8 ký tự" / "Có cả chữ và số" with an sr-only "(đủ)" or "(chưa đủ)".
- Bin on the sign-in pages is an `svg.bin` whose `data-action` is coverEyes (password focused), peek (password shown) or droop (wrong answer); the bubble text is "Hình như sai rồi…".
- Bin's corner: dialog "Góc của Bin" (button Đóng), buttons Cho ăn / Ném bóng / Làm trò / Trang phục, chip "N xương", locked outfits named like "Nơ hồng, mở khi cấp 3".
- Today: region "Nhiệm vụ hôm nay" with buttons "Nhận 2 xương", chip "Xương: N"; phone bar link "Ôn ngay"; floating button "Tạo bộ từ" / "Thêm từ" only on the deck list and a deck page.
- Match: button "Bắt đầu" goes straight to the board when motion is reduced (else a 3-2-1 count first); "Bảng 1/1", "Kỷ lục đầu tiên!", "Số lần ghép sai", "Chơi lại".
- Typing: buttons "Gợi ý" / "Gợi ý thêm" (hint line in the aria-live paragraph, "Gợi ý: b_____"), after a miss "Bạn gõ" / "Đáp án". Listening: "Nghe lại", "Nghe chậm".
- End of a session (tests/e2e/session-gifts.spec.ts): stars as role img "3 sao", group "Phần thưởng của phiên" with a progressbar "Kinh nghiệm trong cấp này", dialog "Lên cấp N!" with button "Tuyệt vời!"; /review with nothing due: "Bạn đã ôn xong hôm nay.", "Nhiệm vụ còn lại hôm nay", region "Gợi ý cho bạn".

## Added in V4 (tests/e2e/today-v4.spec.ts, compose.spec.ts, admin.spec.ts)
- Today page:
  - QuickAdd: label "Từ muốn thêm", button "Thêm", text "Thêm từ nhanh".
  - Hero zero-due: "Hôm nay ôn xong rồi", "Luyện thêm", "Học từ mới", review summary "Bạn đã ôn … lượt, nhớ đúng …%".
  - Heatmap: `[role=img][aria-label^="Hoạt động 26 tuần"]` on desktop, `[role=img][aria-label^="Hoạt động 12 tuần"]` on mobile.
- Word Composer & Details Sheet:
  - Input labels: "Từ" (card 1), "Từ 2", "Từ 3"...; "Nghĩa tiếng Việt" (card 1), "Nghĩa tiếng Việt 2", "Nghĩa tiếng Việt 3"...
  - Buttons: "Thêm thẻ", "Tách thành thẻ", "Xong" (in Sheet), "Lưu từ" (1 word), "Lưu N từ" (N > 1 words), "Xóa nháp", "Thêm câu ví dụ".
  - Dialog / Sheet: title "Bỏ thay đổi chi tiết?", buttons "Bỏ thay đổi" / "Tiếp tục sửa".
  - Toast & status: "Đã tách thành N thẻ", "Đã lưu <term>" (with action "Xem"), "Đã lưu N từ" (with action "Xem bộ"), "Đã khôi phục N thẻ chưa lưu.", "Đã có trong bộ này".
- Auto Image Suggestions (Phase 7):
  - Group `Ảnh gợi ý cho thẻ <n>` and `Ảnh gợi ý cho từ`: image select buttons with `aria-pressed`, credit text `Ảnh: <author> / <provider>`.
  - Image box: `Ảnh cho thẻ <n>`, button "Chọn ảnh khác".
- Admin & Privacy Policy (Phases 8-10):
  - Navigation tabs: "Tổng quan", "Người dùng", "Từ vựng", "Bộ từ công khai", "Nhóm", "Quản trị viên".
  - User detail 6 tabs: "Tổng quan", "Từ vựng", "Bộ từ", "Ôn tập", "Gia sư", "Tài khoản".
  - Admin deck view (`/admin/decks/[id]`): "Danh sách từ vựng", "Người đang theo học", button "Xem từ", button "Chuyển về riêng tư", button "Xóa bộ từ".
  - Admin word actions: button "Xóa từ", alertdialog "Xóa từ".
  - Privacy policy: page `/quyen-rieng-tu` (heading "Quyền riêng tư"), signup notice "Bằng việc đăng ký, bạn đồng ý với quyền riêng tư của Sổ Từ.".
