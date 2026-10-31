# Tốc độ Gia sư AI (`/api/chat`): số đo

Kế hoạch: `PLAN-gia-su-toc-do.md` (Phase 0–5). Đo bằng `pnpm bench:tutor` (`scripts/bench-tutor.mjs`).

- **TTFT** = từ lúc gửi tới chữ đầu tiên của câu trả lời; **Total** = tới lúc stream đóng; **prelude** = thời gian route chạy trước khi gọi model (mốc `prelude` trong header `Server-Timing`).
- Mỗi kịch bản chạy `RUNS=3` lần (thread mới mỗi lần, cách nhau 6 s vì rate limit 12/phút), tài khoản `demo@example.com`. Bảng ghi p50 / p90 tính bằng ms.

## Môi trường đo (2026-10-31)

- Máy dev Windows ở Việt Nam, production build (`pnpm build && pnpm start --port 3200`), **không phải Vercel**.
- Supabase Cloud ở `ap-southeast-1` (Singapore). Từ máy này mỗi request tới Supabase mất ~100–150 ms khi kết nối đã ấm, 300–900 ms khi phải mở kết nối mới (TLS), và thỉnh thoảng nhảy lên 1–4 s. Vì vậy số prelude ở đây **cao hơn nhiều** so với Vercel `sin1` (cạnh Supabase), và p90 bị nhiễu mạng.
- Không có `ANTHROPIC_API_KEY` ⇒ provider Google. `AI_MODEL_GOOGLE=gemini-3.8-flash,gemini-3.5-flash-lite`, không đặt `AI_MODEL_CHAT_GOOGLE`.
- Trong cả buổi đo, `gemini-3.8-flash` gần như luôn trả **503 "high demand"** (0,5–1,4 s), nên mọi câu trả lời thật đến từ `gemini-3.5-flash-lite`. Có lúc 3.8-flash **treo kết nối** thay vì trả 503: request đó chờ hết 55 s, bị coi là "lượt rỗng", retry thêm 55 s nữa rồi mới hiện câu xin lỗi (~2 phút). Đây là vấn đề lớn nhất tìm được, sửa ở Phase 2.
- `gemini-3.8-flash` từ chối `thinkingLevel: "minimal"` (400). `gemini-3.5-flash-lite` nhận cả hai; đo thẳng API: header đầu tiên sau ~4 s với "minimal", ~10 s với "low" (một lần đo, dao động lớn).

## Baseline (trước khi sửa, commit `feccea0`)

| Kịch bản | TTFT p50 | TTFT p90 | Total p50 | Total p90 | tools tb |
|---|---|---|---|---|---|
| simple_en | 6223 | 8117 | 8892 | 10379 | 0 |
| simple_zh | 6385 | 7726 | 10351 | 11546 | 0 |
| correct | 7893 | 8864 | 12683 | 13511 | 0 |
| tool_mywords | 16482 | 23918 | 18821 | 27018 | 2 |
| tool_rare | 6834 | 7210 | 10917 | 13209 | 0 |
| followup | 3731 | 4329 | 7089 | 8744 | 0 |

Prelude p50 3222 ms, p90 4685 ms. Trung vị từng bước: `auth` 785, `thread` 125, `limits` 953, `context` 815, `saved` 482.

Log tiêu biểu:

```
[tutor] rate-limited model=gemini-3.8-flash, trying the next one
[tutor] model gemini-3.5-flash-lite
[tutor:timing] {"auth":481,"thread":862,"limits":2040,"context":2996,"saved":3921,"prelude":3922,"model_start":3922,"first_text":5728,"done":8501,"status":"answered","toolCalls":0}
```

Các lần thử đầu (trước baseline) gặp 3.8-flash treo: `{"prelude":3523,"model_start":3525,"retry":58531,"first_text":111847,"done":115640}` (TTFT 112 s).

## Sau Phase 1 (prelude song song, commit `9c70075`)

| Kịch bản | TTFT p50 | TTFT p90 | Total p50 | Total p90 | tools tb |
|---|---|---|---|---|---|
| simple_en | 4169 | 12716 | 6484 | 16144 | 0 |
| simple_zh | 3500 | 9241 | 7474 | 14020 | 0 |
| correct | 6771 | 11174 | 11190 | 18292 | 0 |
| tool_mywords | 3588 | 5789 | 14281 | 17091 | 1 |
| tool_rare | 5107 | 6510 | 10474 | 17875 | 0 |
| followup | 3548 | 8030 | 6605 | 11087 | 0 |

Prelude p50 2928 ms, p90 9813 ms (p90 do vài lần mạng nhảy 4–9 s, không phải do code). Trung vị từng bước: `auth` 939, `limits` 823, `context` 985; không còn bước `thread` và `saved` riêng.

- Bỏ được ~600 ms (đọc thread + lưu tin nhắn user không còn nằm trên đường găng). Nhiều hơn thế thì máy dev này không đo được: mỗi nhịp mạng tới Supabase đã ~0,3–0,9 s.
- `context` vẫn xong sau `limits` ~1 s dù bắt đầu cùng lúc. Đo riêng từng query trên kết nối ấm: `today_overview` ~105–370 ms, `practice_words` ~110–170 ms, thỉnh thoảng nhảy 0,7–1,3 s. Thời gian là **mạng**, không phải SQL chậm.
- **Bước 1.4b (RPC `tutor_snapshot`) không làm**: các query đã chạy song song, gộp thành 1 RPC không bớt nhịp nào trên đường găng mà phải thêm migration lên database đang chạy thật. Đo lại trên Vercel trước khi cân nhắc.
- **Bước 1.6 (`preferredRegion`) không làm trong code**: Next 16 đánh dấu `preferredRegion` là deprecated (docs bảo bỏ export này). Vùng đã đúng: Vercel Function Region = `sin1` (đặt trong dashboard, xem `docs/DEPLOY.md`), Supabase = `ap-southeast-1` (host pooler `aws-0-ap-southeast-1`).
- `getClaims` xác thực JWT tại chỗ (1 ms sau lần đầu), nên `auth` chủ yếu là 2 query `profiles` + `user_settings` (đã song song).
