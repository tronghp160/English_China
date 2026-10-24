# Layout baseline (before V3)

Produced by `tests/e2e/layout.spec.ts` on branch `v3-lively` before any V3 fix (REDESIGN_V3 §10.3). P14 must bring every line below to zero. Until then the spec only runs with `E2E_LAYOUT=1` (`E2E_LAYOUT=1 pnpm exec playwright test layout.spec.ts`).

Checks: no horizontal scroll, no clipped text in `[data-check-overflow]` (no element has that mark yet, so that check is silent until pages add it), every visible `button`/`a` is at least 40×40 (inline links exempt).

## /login

- small target 106×36: <a> Sổ Từ, trang giới thiệu  (320, 390, 768px)

## /signup

- small target 106×36: <a> Sổ Từ, trang giới thiệu  (320, 390, 768px)

## /today

- small target 106×36: <a> Sổ Từ — Hôm nay  (320, 390, 768px)
- small target 131×36: <a> EN0 ôn, 15 mới  (320, 390px)
- small target 143×36: <a> EN0 ôn, 15 mới  (768, 1280, 1920px)
- small target 122×36: <a> Sổ Từ — Hôm nay  (1280, 1920px)

## /decks

- small target 106×36: <a> Sổ Từ — Hôm nay  (320, 390, 768px)
- small target 77×36: <a> Tất cả  (320, 390, 768, 1280, 1920px)
- small target 102×36: <a> Tiếng Anh  (320, 390, 768, 1280, 1920px)
- small target 115×36: <a> Tiếng Trung  (320, 390, 768, 1280, 1920px)
- small target 122×36: <a> Sổ Từ — Hôm nay  (1280, 1920px)

## /practice

- small target 106×36: <a> Sổ Từ — Hôm nay  (320, 390, 768px)
- small target 48×28: <button> Tính vào ôn tập  (320, 390, 768, 1280, 1920px)
- small target 122×36: <a> Sổ Từ — Hôm nay  (1280, 1920px)

## /stats

- small target 106×36: <a> Sổ Từ — Hôm nay  (320, 390, 768px)
- small target 122×36: <a> Sổ Từ — Hôm nay  (1280, 1920px)

## /groups

- small target 106×36: <a> Sổ Từ — Hôm nay  (320, 390, 768px)
- small target 122×36: <a> Sổ Từ — Hôm nay  (1280, 1920px)

## /chat

- small target 106×36: <a> Sổ Từ — Hôm nay  (320, 390, 768px)
- small target 122×36: <a> Sổ Từ — Hôm nay  (1280, 1920px)

## /settings

- small target 106×36: <a> Sổ Từ — Hôm nay  (320, 390, 768px)
- small target 48×28: <button> peer group/switch relative inline-flex s  (320, 390, 768, 1280, 1920px)
- small target 122×36: <a> Sổ Từ — Hôm nay  (1280, 1920px)
- small target 176×39: <a> Hồ sơ  (1280, 1920px)
- small target 176×39: <a> Mật khẩu  (1280, 1920px)
- small target 176×39: <a> Ôn tập  (1280, 1920px)
- small target 176×39: <a> Linh vật  (1280, 1920px)
- small target 176×39: <a> Thông báo  (1280, 1920px)
- small target 176×39: <a> Phát âm  (1280, 1920px)
- small target 176×39: <a> Giao diện  (1280, 1920px)
- small target 176×39: <a> Ứng dụng  (1280, 1920px)
- small target 176×39: <a> Liên hệ & góp ý  (1280, 1920px)
- small target 176×39: <a> Dữ liệu  (1280, 1920px)
- small target 176×39: <a> Xóa tài khoản  (1280, 1920px)

## /explore

- small target 106×36: <a> Sổ Từ — Hôm nay  (320, 390, 768px)
- small target 77×36: <a> Tất cả  (320, 390, 768, 1280, 1920px)
- small target 102×36: <a> Tiếng Anh  (320, 390, 768, 1280, 1920px)
- small target 115×36: <a> Tiếng Trung  (320, 390, 768, 1280, 1920px)
- small target 146×36: <a> Nhiều người học  (320, 390, 768, 1280, 1920px)
- small target 92×36: <a> Mới nhất  (320, 390, 768, 1280, 1920px)
- small target 118×36: <button> Theo học  (320, 390, 768, 1280, 1920px)
- small target 122×36: <a> Sổ Từ — Hôm nay  (1280, 1920px)

## /hard-words

- small target 106×36: <a> Sổ Từ — Hôm nay  (320, 390, 768px)
- small target 122×36: <a> Sổ Từ — Hôm nay  (1280, 1920px)

## /review

- small target 36×36: <button> Đọc câu ví dụ  (320, 390, 768, 1280, 1920px)
- small target 97×39: <a> Xem chi tiết  (320, 390, 768, 1280, 1920px)

## a deck page

- small target 106×36: <a> Sổ Từ — Hôm nay  (320, 390, 768px)
- small target 36×36: <button> Dạng danh sách  (320, 390, 768, 1280, 1920px)
- small target 36×36: <button> Dạng lưới có ảnh  (320, 390, 768, 1280, 1920px)
- small target 122×36: <a> Sổ Từ — Hôm nay  (1280, 1920px)

Distinct problems: 50. Routes that passed: /, /practice/learn, /practice/test, /practice/match.
