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

## Baseline trên Vercel (P0 của `PLAN-tam-su-va-gia-su.md`)

Các số ở trên đo trên máy dev ở Việt Nam, nên bị mạng tới Singapore làm sai. Mục tiêu của phần A (TTFT p50 ≤ 2,0 s cho `simple_en` / `simple_zh`, p90 ≤ 4 s, `correct` p50 ≤ 3,5 s) chỉ kiểm được trên Vercel. **Chưa đo**: cần deploy và dashboard, việc của chủ repo. Các bước:

1. Vercel dashboard → Settings → Functions: **Function Region = `sin1`** và bật **Fluid Compute** (giữ instance ấm; nếu tắt thì cache trong bộ nhớ ở P1 và cooldown model gần như vô dụng).
2. Deploy bản cần đo (preview hoặc production). Preview bật Deployment Protection sẽ trả 401 cho script: tắt tạm cho lần đo hoặc đo trên domain production.
3. Chạy trên máy dev: `BASE_URL=https://<domain> RUNS=5 pnpm bench:tutor`. Script đăng nhập bằng tài khoản demo (cùng project Supabase nên phiên dùng được trên mọi bản deploy); `BENCH_COOKIE` chỉ để ghi đè cookie. Mỗi lần chạy tốn ~45 lượt AI, và các kịch bản chạy cách nhau 6 s.
4. Script in thêm bảng **Server-Timing marks**: trung vị từng mốc của prelude theo kịch bản (`auth`, `limits`, `thread_created`, `context`, `prelude`), tính bằng ms **từ lúc request tới route (tích lũy, không phải thời gian từng bước)**. Mốc `prelude` là lúc bắt đầu gọi model. Lưu cả vào `bench-results/tutor-*.json`.
5. Điền bảng:

| Kịch bản | TTFT p50 | TTFT p90 | Total p50 | prelude p50 | tools tb |
|---|---|---|---|---|---|
| simple_en | _chưa đo_ | | | | |
| simple_zh | _chưa đo_ | | | | |
| correct | _chưa đo_ | | | | |
| tool_mywords | _chưa đo_ | | | | |
| tool_rare | _chưa đo_ | | | | |
| followup | _chưa đo_ | | | | |
| first_new | _chưa đo_ | | | | |

Cũng ghi môi trường đo (commit, provider và model trả lời, ngày). Đo cả `pnpm eval:tutor` (xem `docs/EVAL-gia-su.md`) trên cùng cấu hình để có điểm chất lượng đi kèm.

## P1: prelude một nhịp (`tam-su-va-gia-su-nhanh`)

Thay đổi (chưa đo, cần Vercel; nghiệm thu: prelude p50 giảm ≥ 40% so với bảng "Baseline Vercel"):

- `/api/chat` chỉ chờ `getUser()` (xác thực JWT tại chỗ, ~1 ms) và body, rồi **bắt đầu mọi truy vấn cùng lúc** qua `startPrelude` (`lib/ai/tutor/prelude.ts`): hồ sơ + cài đặt (`loadMe`), đọc thread, rate limit + hạn mức, lịch sử, snapshot người học, ngữ cảnh trang, và tên bộ từ nếu là cuộc trò chuyện mới có `deckId`. Trước đây `getMe()` (một nhịp) phải xong thì các truy vấn kia mới bắt đầu. Thứ tự lỗi trả về giữ nguyên: 401, 400, 404, 429 (rate), hạn mức.
- Snapshot không còn chờ `study_langs`: luôn hỏi `["en","zh"]`. Ngôn ngữ chưa có thẻ nào bị `learnerBlock` bỏ qua; `practice_words` cho ngôn ngữ không có từ trả tập rỗng, không lỗi. Giá phải trả: người chỉ học một ngôn ngữ tốn thêm 2 RPC nhỏ chạy song song.
- Cache snapshot trong bộ nhớ (`lib/ai/tutor/snapshot-cache.ts`): TTL 120 s, tối đa 500 người dùng, cho tin **tiếp theo** của cuộc trò chuyện (không có cờ `newThread`). Tin đầu luôn đọc mới; cuộc trò chuyện chưa có lượt nào được lưu (mở từ trang từ qua server action) cũng đọc mới. Người học ôn bài giữa hai tin thấy số liệu cũ tối đa 2 phút. Chỉ có tác dụng khi instance còn ấm (Fluid Compute). Snapshot rỗng do lỗi đọc không được nhớ.
- Tin đầu của thread mới: `ensureThread` (upsert có `.select("id")`) trả về hàng vừa chèn, nên bỏ lần đọc lại thread; chỉ khi upsert báo trùng (id đã có, hoặc của người khác) mới đọc lại và có thể 404. Một nhịp ít hơn ở tin đầu.
- `preloadChineseDict()` chạy ngay khi tin có chữ Hán, không đợi cài đặt.
- Mốc `Server-Timing` mới: `user` (sau `getUser` + body), `parallel_done` (mọi truy vấn xong). `auth` = hồ sơ xong, `limits` = thread + giới hạn xong, `context` = lịch sử + snapshot + ngữ cảnh xong; tất cả tính từ lúc request tới route, nên `parallel_done` ≈ mốc lớn nhất trong ba mốc kia.

## Đo trên Vercel production (2026-11-06)

Tài khoản của chủ repo, `https://xeudungdung.vercel.app`, Gemini, commit `578b3e3`, 3 lượt mỗi kịch bản (ít, nên p50 và p90 còn nhiễu):

| Kịch bản | TTFT p50 | TTFT p90 | Total p50 | prelude p50 | tools tb |
|---|---|---|---|---|---|
| simple_en | 3300 | 5229 | 3504 | 401 | 0 |
| simple_zh | 1978 | 2758 | 2207 | 481 | 0 |
| correct | 2572 | 2748 | 2718 | 194 | 0 |
| tool_rare | 1603 | 1855 | 2075 | 423 | 0 |
| first_new | 1733 | 1922 | 1867 | 216 | 0 |
| clone_hi | 1683 | 26395 | 2115 | 143 | 0 |
| clone_sad | 1616 | 2695 | 1898 | 99 | 0 |

- So với máy dev (prelude p50 ~2,9 s, `docs/PERF-gia-su.md` mục "Kết luận"): prelude còn 100–480 ms, và các mốc `auth`, `context`, `limits` đều dưới 400 ms ở lượt ấm. `tool_rare` không còn gọi công cụ nào (tra sẵn hoạt động).
- Mục tiêu phần A (p50 ≤ 2,0 s cho `simple_*`, p90 ≤ 4 s; `correct` p50 ≤ 3,5 s): `simple_zh` p50 đạt, `correct` đạt, `simple_en` chưa đạt (p50 3,3 s, nhưng chỉ có 3 lượt và một lượt 5,2 s do model; cần đo ≥ 5 lượt). Trong bộ chấm 32 case (một lượt mỗi case) TTFT p50 là 1,77 s và p90 là 2,46 s.
- **Hai lượt chậm ~25–26 s** (một ở bộ chấm Gia sư, một ở `clone_hi`) trong khoảng 55 request, dù prelude của chúng chỉ ~126 ms: chậm nằm ở phía model. Nếu `AI_MODEL_GOOGLE` trên Vercel chỉ có một model thì hedge không có model nào để gọi song song; đặt hai model (ví dụ `gemini-3.8-flash,gemini-3.5-flash-lite`) rồi xem log `hedged: true` / `rate-limited`.

## P2: một RPC cho rate limit + hạn mức

- Migration `supabase/migrations/20261106000018_ai_gate.sql` thêm hàm `ai_gate(...)` (chỉ `service_role`). Nó gọi lại `hit_rate_limit` và `ai_usage_total`, đọc số lượt của người dùng, rồi trả `{ allowed, reason, used, total }` với `reason` là `null | rate | quota_global | quota_user` (kiểm theo đúng thứ tự cũ: rate, global, user). Không tăng usage; `recordUsage` vẫn gọi sau khi có câu trả lời. Hàm chỉ thêm, không sửa bảng nào.
- `lib/ai/gate.ts` (`aiGate`) gọi RPC đó: 1 request thay cho 3 (`hit_rate_limit`, `ai_usage_total`, select `ai_usage`). Rate limit vẫn fail open (hàm SQL bắt lỗi của limiter), hạn mức fail closed (`AiError("failed")`). Khi RPC chưa tồn tại (`PGRST202` / `42883`) nó tự lùi về 3 lệnh cũ, log một dòng mỗi phút và thử lại RPC sau 1 phút, nên **deploy code trước khi chạy `pnpm db:push` vẫn an toàn**.
- `/api/chat` dùng `aiGate` (qua `startPrelude`); `checkQuota` và `hitRateLimit` vẫn dùng ở các chỗ khác.
- Test: `tests/db/ai-gate.test.ts` (hành vi thật của hàm SQL trên PGlite: ngưỡng, thứ tự ưu tiên, không tự tăng usage, fail open, quyền) và `tests/unit/ai-gate.test.ts` (RPC trả từng lý do, fail closed, đường lùi).
- **Chủ repo cần chạy `pnpm db:push`** (hoặc `pnpm db:push --dry-run` để xem trước) để RPC có hiệu lực. `lib/supabase/database.types.ts` đã có kiểu của hàm này (tạo bằng `pnpm db:types:local`, chạy trên PGlite, không chạm database thật). Chưa đo lợi ích (cần Vercel): kỳ vọng mốc `limits` bớt 2 request HTTP.

## P3: model nhanh và ổn định hơn

**P3.2 Hedge (đã làm trong code).** `raceModels` (`lib/ai/tutor/model.ts`): nếu model đầu chưa trả header sau `AI_HEDGE_MS` (mặc định 2500 ms; `0` tắt) và còn model sau trong danh sách, gọi luôn model sau **song song**, dùng cái nào trả header trước và hủy cái kia (`AbortController`, đóng stream nếu nó đã kịp trả lời). Mỗi request hedge tối đa một lần.

- Model thua không bị cooldown, trừ khi chính nó trả 429/503 (cũng như trước). Model đầu lỗi khác 429/503 (sai key, sai tên model) vẫn ném ra ngay và bỏ hedge; hedge lỗi khác 429/503 thì bị bỏ qua khi model đầu còn đang chạy. Cả hai lỗi thì ném lỗi cuối. `FIRST_BYTE_MS` (15 s) vẫn là trần cuối cùng, như cũ.
- Log: `[tutor] hedge won=<model>` khi model hedge thắng; dòng `[tutor:timing]` có `hedged: true` mỗi khi một hedge đã được gọi (kể cả khi nó thua).
- Chi phí: hedge chỉ xảy ra khi model đầu chậm bất thường (> 2,5 s tới header, trong khi bình thường ~1 s), nên tốn thêm rất ít; nhưng nó là một request thêm tới Google đúng lúc đó. **Theo dõi tỉ lệ `hedged` trong log tuần đầu**: nếu thấy nhiều, tăng `AI_HEDGE_MS` hoặc kiểm hạn mức/phút của key.
- Chỉ có tác dụng khi có ít nhất hai model (`AI_MODEL_GOOGLE` là danh sách, hoặc `AI_MODEL_CHAT_GOOGLE` + `AI_MODEL_GOOGLE`). Với Anthropic (không có fallback) hedge không làm gì.
- Test: `tests/unit/tutor-model.test.ts` (nhóm "hedge": model đầu chậm thì model sau thắng và model đầu bị abort, model đầu nhanh thì không hedge, `hedgeMs` 0 như cũ, cả hai lỗi, sai key, hedge lỗi bị bỏ qua, model thứ ba, request bị hủy).

**P3.3** Không đổi: `rejectedLevels` theo instance là đủ với Fluid Compute. **P3.4** Phần `stable` của prompt là tiền tố giống hệt nhau giữa mọi request cùng tên gia sư: đã có test (`tests/unit/chat.test.ts`, "keeps everything that changes per learner or turn out of the stable prefix"); mọi thứ đổi theo người học, ngày, trang, lượt nằm ở `turn`. Ghi `cachedTokens` trung vị vào đây sau P12.

**P3.1 Chọn model chat bằng số đo: chưa đo** (cần tài khoản đo và chủ repo chọn). Danh sách model mà key Gemini hiện có gọi được `generateContent` (lấy từ `models.list` ngày 2026-11-06, bỏ bản image / tts / omni): `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3-flash-preview`, `gemini-3.1-flash-lite`, `gemini-3.1-flash-lite-preview`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`, cùng hai alias `gemini-flash-latest` và `gemini-flash-lite-latest`. Hiện cấu hình là `AI_MODEL_GOOGLE=gemini-3.8-flash,gemini-3.5-flash-lite` và không đặt `AI_MODEL_CHAT_GOOGLE`. Không có model nào được chọn thay: đây chỉ là danh sách ứng viên, đặc biệt các bản `*-flash-lite` mới nhất (`gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`) và `gemini-3.7-flash`. Cách so sánh (mỗi lựa chọn một lần chạy, restart server giữa các lần):

1. Đặt `AI_MODEL_CHAT_GOOGLE=<model>` và `AI_HEDGE_MS=0` (để hedge không làm nhiễu số đo từng model) trong `.env.local`, chạy `pnpm dev --port 3100` (hoặc build production).
2. `ONLY=simple_en,simple_zh,correct RUNS=5 pnpm bench:tutor` rồi `LABEL=<model> pnpm eval:tutor`. Xác nhận model nào thực sự trả lời bằng dòng `[tutor] model …` trong log server.
3. Ghi một bảng: TTFT p50 / p90, tỉ lệ 503 (số dòng `rate-limited` / số request), điểm eval. Nếu có `ANTHROPIC_API_KEY` thì so luôn Haiku hiện tại (`AI_PROVIDER=anthropic`; hiện `.env.local` có cả hai key và mặc định chọn Anthropic).
4. Đặt model thắng vào `AI_MODEL_CHAT_GOOGLE` trên Vercel (Production + Preview), redeploy, bật lại `AI_HEDGE_MS`.

## P4: tra cứu sẵn từ đang hỏi

Câu kiểu "X nghĩa là gì", "X đọc thế nào", "phân biệt A và B" chiếm phần lớn; trước đây model phải tự gọi `lookupWord` (thêm một vòng model) hoặc trả lời theo trí nhớ (dễ sai pinyin/IPA với từ hiếm). Giờ route tra sẵn trong lúc chờ prelude:

- `detectTerms(text)` (`lib/ai/tutor/prefetch.ts`, thuần, có test) nhận tối đa 2 từ, cố ý thận trọng: "phân biệt A và B", "A khác B", "A và B khác nhau"; từ hoặc cụm tới 3 từ trong dấu nháy; tới 3 từ tiếng Anh đứng trước "nghĩa là gì / là gì / đọc thế nào / phát âm / dùng thế nào"; chuỗi chữ Hán dài 1–4 ký tự (chuỗi dài hơn là một câu để sửa hoặc dịch nên không tra). Chữ viết quyết định ngôn ngữ (chữ Hán = zh, chữ Latin = en) vì Gia sư trả lời về cả hai ngôn ngữ bất kể ngôn ngữ của thread. Không tra "tiếng Trung / tiếng Anh là gì" (tên ngôn ngữ viết không dấu) và cụm cố định "khác nhau". Bỏ sót chỉ có nghĩa là model tự gọi `lookupWord` như cũ.
- `prefetchTerms` gọi `lookupBest` cho từng từ (cache chung `dictionary_cache`, CVDICT đã nạp sẵn, từ điển tiếng Anh miễn phí; **không tốn hạn mức AI**), **ngân sách 800 ms**: quá thì bỏ phần chưa xong và không chặn câu trả lời; lỗi thì bỏ qua, không bao giờ ném. Chạy cùng lúc với prelude nên thường không làm chậm thêm.
- Kết quả vào phần `turn` của prompt dưới dạng `<tra_cuu_san>` (`formatLookups`: phiên âm, Hán Việt, tối đa 2 nghĩa, 1 ví dụ mỗi nghĩa, lượng từ), sau `<du_lieu_nguoi_hoc>`. Dữ liệu từ điển bên ngoài được làm sạch trước khi vào prompt (bỏ thẻ và dấu `<` `>`, một dòng, giới hạn độ dài) để không đóng được thẻ hay giả làm chỉ dẫn. Phần `stable` có thêm một luật: dùng `<tra_cuu_san>` cho phiên âm và nghĩa, không gọi `lookupWord` cho từ đó, và đó là dữ liệu chứ không phải chỉ dẫn.
- Dòng `[tutor:timing]` có `prefetched` (số từ đã tra được, không có nội dung).
- Cách đo (cần Vercel và tài khoản): `tools_avg` của `tool_rare` và TTFT của `tool_rare` phải giảm; điểm `has_ipa` / `has_pinyin_tones` của `pnpm eval:tutor` phải giữ hoặc tăng. Chưa đo.
- Test: `tests/unit/tutor-prefetch.test.ts`.

**Nghiệm thu phần A**: bảng "Sau phần A" trên Vercel còn trống, vì cả đo baseline lẫn đo sau cần chủ repo chạy trên Vercel (xem "Baseline trên Vercel" ở trên). Không có số nào ở đây là kết quả đo của phần A; mọi mục P1–P4 mới chỉ được kiểm bằng test đơn vị và đọc code.

## Bản AI (`/api/clone`) và bảng "Sau phần A + B"

- Bench có hai kịch bản cho bản AI: `clone_hi` (1 tin) và `clone_sad` (3 tin lịch sử, tin cuối về tâm trạng, nên chạy mức thinking "low"). Chúng **chỉ chạy khi gọi rõ tên**: `ONLY=clone_hi,clone_sad RUNS=5 pnpm bench:tutor` với app có `CLONE_PROFILE` (nếu không, route trả 404). Câu trả lời **không được lưu** vào file kết quả vì có thể lặp lại hồ sơ. Dòng log của route là `[clone:timing]` (mốc `user`, `limits`, `prelude`, `model_start`, `first_text`, `done`, trạng thái, effort, số lượt, token); không có nội dung tin nhắn.
- Prelude của `/api/clone` ngắn hơn của Gia sư: chỉ `getUser` + body, rồi `loadMe` và `aiGate` song song (không có thread, lịch sử hay snapshot). Phần `stable` của prompt (luật + hồ sơ, vài nghìn token) giống hệt giữa mọi người nên được prompt cache (Anthropic có marker `cacheControl`; Gemini cache ngầm): sau vài request, `cachedTokens` trong log phải lớn.
- **Chưa đo.** Bảng sau chờ chủ repo chạy trên Vercel (cùng cách ở "Baseline trên Vercel"), kèm số `eval:tutor` đã chạy lại sau phần B:

| Kịch bản | TTFT p50 | TTFT p90 | Total p50 | prelude p50 | cachedTokens (log) |
|---|---|---|---|---|---|
| simple_en | _chưa đo_ | | | | |
| simple_zh | _chưa đo_ | | | | |
| correct | _chưa đo_ | | | | |
| tool_rare | _chưa đo_ | | | | |
| clone_hi | _chưa đo_ | | | | |
| clone_sad | _chưa đo_ | | | | |

## Việc còn lại (cho chủ repo)

1. **Đo trên Vercel**: deploy preview, copy cookie phiên từ DevTools rồi `BASE_URL=https://<preview> BENCH_COOKIE='sb-…' pnpm bench:tutor`. Xem mốc `prelude` trong `Server-Timing`: nếu vẫn > 600 ms thì kiểm Function Region và cold start (mốc `auth` của request đầu).
2. **Chọn model chat (2.8)**: `gemini-3.8-flash` hay trả 503 và không nhận "minimal". Đặt `AI_MODEL_CHAT_GOOGLE` thành một model flash / flash-lite có hạn mức tốt, so 2–3 lựa chọn bằng `ONLY=simple_en,correct pnpm bench:tutor`. Code không tự đổi tên model.
3. **1.4b (RPC `tutor_snapshot`) chưa làm**: chỉ đáng làm nếu trên Vercel `context` vẫn chậm hơn `limits` rõ rệt.
4. Kiểm bằng tay trong trình duyệt: React DevTools "Highlight updates" khi stream một câu dài (chỉ tin cuối nháy).
5. Theo dõi `cachedTokens` trong log `[tutor:timing]` trên production.
