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

## Sau Phase 2 (model nhanh hơn, commit `3deaaf9`)

| Kịch bản | TTFT p50 | TTFT p90 | Total p50 | Total p90 | tools tb |
|---|---|---|---|---|---|
| simple_en | 8321 | 20156 | 9474 | 21171 | 0 |
| simple_zh | 6895 | 13117 | 7640 | 14679 | 0 |
| correct | 9671 | 11839 | 10300 | 12773 | 0 |
| tool_mywords | 5731 | 8237 | 6364 | 8647 | 1.67 |
| tool_rare | 3098 | 3273 | 4316 | 4371 | 0 |
| followup | 3033 | 4056 | 3456 | 4592 | 0 |

Bảng TTFT phía client lần này bị mạng tới Supabase kéo lên (prelude p90 10,4 s). Tách theo log server thì thấy rõ phần model:

| Trung vị mọi request | prelude | model → chữ đầu | chữ đầu → xong | retry lượt rỗng |
|---|---|---|---|---|
| Baseline | 3523 | 3028 (p90 **20092**, do treo) | 3269 | 4 / 26 |
| Phase 1 | 2928 | 1339 | 3036 | 0 / 24 |
| Phase 2 | 2909 | 1121 | **426** | 0 / 21 |

- Bỏ `smoothStream` ở server: "chữ đầu → xong" từ ~3 s còn ~0,4 s. Model đã sinh xong từ lâu, chỉ là server nhả chữ chậm.
- Không còn lượt treo 55 s + retry 55 s: model treo quá 15 s thì chuyển sang model sau, và một lần hết giờ là lỗi ("Thử lại"), không retry.
- Cooldown: sau lần 503 đầu, các request sau đi thẳng tới `gemini-3.5-flash-lite` (chỉ 3 dòng `rate-limited` trên 22 request ở lần đo cuối, so với 27 / 27 ở baseline).
- Thinking: 18 / 20 câu chạy "minimal", 2 câu ("Sửa giúp mình…") chạy "low".
- **Chất lượng với "minimal"** (đọc tay 6 câu: 2 × simple_en, simple_zh, correct): đúng và đủ ý. apple có IPA, loại từ, ví dụ kèm nghĩa; 你好 có pinyin và giải thích biến điệu 3-3; câu sửa có câu đúng, lỗi goes→went kèm quy tắc, lời khen. Giữ "minimal" làm mặc định. Một điểm nhỏ không liên quan tốc độ: model hay mở đầu "Chào bạn!" dù người học không chào.
- Prompt cache: log có `inputTokens` ~2450, `cachedTokens` 0 với Gemini flash-lite (implicit cache cần prefix dài hơn hoặc lưu lượng lặp nhiều hơn). Với Anthropic, phần ổn định có `cacheControl`. Cần theo dõi trên production.
- Từ điển tiếng Trung nạp sẵn: `[dict] cvdict loaded in 259 ms` (chạy nền, trước khi tool cần).
- Mục 1.4b, 2.8: xem "Việc còn lại".

## Phase 3 (client)

Không đổi TTFT phía server. Mỗi chunk không còn render lại cả danh sách: `throttle: 50`, `MessageRow` + `MessageText` memo (chỉ bong bóng đang stream render lại). `GET /api/chat` (ping làm ấm) trả 204 trong ~0,12 s và nạp sẵn CVDICT. Chưa kiểm bằng React DevTools "Highlight updates" (cần làm tay trong trình duyệt).

## Phase 4 (tin đầu tiên, commit `696d954`)

| Kịch bản (tính từ lúc bấm gửi, gồm tạo thread) | TTFT p50 | TTFT p90 |
|---|---|---|
| first_old: tạo thread trước rồi gửi | 16562 | 20354 |
| first_new: gửi ngay với `newThread` | 12511 | 15233 |

3 lần mỗi kịch bản giữa lúc mạng rất xấu (một request mất 12 s chỉ ở `auth`), nên trung vị chỉ mang tính tham khảo. Về cấu trúc: tạo thread trong route chỉ thêm một bước `thread_created` 220–370 ms, còn trước đây là cả một server action (trình duyệt → server → `getMe` → insert → về) **trước khi** request chat bắt đầu. `first_old` trong bench còn rẻ hơn server action thật (script ghi thẳng vào Supabase), nên mức lợi thật lớn hơn số đo.

## Lần đo cuối (Phase 4 build, `RUNS=2`, giới hạn quota)

| Kịch bản | Baseline TTFT p50 | Cuối TTFT p50 | Baseline Total p50 | Cuối Total p50 |
|---|---|---|---|---|
| simple_en | 6223 | 2982 | 8892 | 3229 |
| simple_zh | 6385 | 3307 | 10351 | 3997 |
| correct | 7893 | 4967 | 12683 | 5824 |
| tool_mywords | 16482 | 4445 | 18821 | 5044 |
| tool_rare | 6834 | 2712 | 10917 | 3635 |
| followup | 3731 | 3465 | 7089 | 4263 |

Log server lần cuối: model → chữ đầu p50 1346 ms, chữ đầu → xong p50 302 ms, không retry. Prelude p50 5,4 s (tính cả các lần đo Phase 4 lúc mạng xấu).

## Kết luận

- Phần model gần đạt mục tiêu: từ lúc gọi model tới chữ đầu ~1,1–1,3 s; câu trả lời xong ngay sau chữ đầu. Lỗi lớn nhất (treo ~2 phút rồi xin lỗi) đã hết.
- Phần còn lại là **prelude** (các nhịp tới Supabase). Trên máy dev ở Việt Nam mỗi nhịp 0,3–0,9 s, có lúc nhiều giây, nên TTFT ở đây vẫn 3–5 s. Mục tiêu ≤ 1,5 s cho câu đơn giản chỉ kiểm được trên Vercel `sin1` cạnh Supabase.

## Việc còn lại (cho chủ repo)

1. **Đo trên Vercel**: deploy preview, copy cookie phiên từ DevTools rồi `BASE_URL=https://<preview> BENCH_COOKIE='sb-…' pnpm bench:tutor`. Xem mốc `prelude` trong `Server-Timing`: nếu vẫn > 600 ms thì kiểm Function Region và cold start (mốc `auth` của request đầu).
2. **Chọn model chat (2.8)**: `gemini-3.8-flash` hay trả 503 và không nhận "minimal". Đặt `AI_MODEL_CHAT_GOOGLE` thành một model flash / flash-lite có hạn mức tốt, so 2–3 lựa chọn bằng `ONLY=simple_en,correct pnpm bench:tutor`. Code không tự đổi tên model.
3. **1.4b (RPC `tutor_snapshot`) chưa làm**: chỉ đáng làm nếu trên Vercel `context` vẫn chậm hơn `limits` rõ rệt.
4. Kiểm bằng tay trong trình duyệt: React DevTools "Highlight updates" khi stream một câu dài (chỉ tin cuối nháy).
5. Theo dõi `cachedTokens` trong log `[tutor:timing]` trên production.
