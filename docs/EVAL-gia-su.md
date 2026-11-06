# Chấm chất lượng Gia sư AI (`/api/chat`)

Bộ chấm tự động cho Gia sư Bin, để mọi thay đổi prompt hay model (phần A, B của `PLAN-tam-su-va-gia-su.md`) đo được bằng điểm, không đoán.

- Chạy: `pnpm eval:tutor` (cần app đang chạy và tài khoản demo: `pnpm dev --port 3100` + `pnpm db:seed`).
- Môi trường: `BASE_URL` (mặc định `http://localhost:3100`), `BENCH_EMAIL`, `BENCH_PASSWORD`, `BENCH_COOKIE`, `ONLY=en_word_apple,fix_en` (id case hoặc nhóm), `LABEL=tên-lần-chạy` (ghi vào file kết quả), `JUDGE=1` (chấm thêm 1–5 bằng LLM, tốn thêm quota; mặc định tắt).
- Mỗi case là **một tin đầu tiên trong thread mới**, cách nhau 6 s (rate limit 12/phút). 30 case tốn khoảng 30 lượt AI của tài khoản demo (hạn mức `AI_DAILY_LIMIT_PER_USER`). Chạy hết mất ~6 phút.
- Kết quả: bảng trong terminal và `bench-results/eval-<thời điểm>.json` (git-ignored, có kèm toàn văn câu trả lời để đọc tay). Thread tạo ra được xóa cuối lượt.
- Model nào trả lời phụ thuộc cấu hình của server đang được chấm (`AI_PROVIDER`, `AI_MODEL`, `AI_MODEL_GOOGLE`, `AI_MODEL_CHAT_GOOGLE`). Khi so sánh hai lần chạy, đặt `LABEL` và ghi model vào bảng bên dưới.

## Các luật chấm

Định nghĩa ở `scripts/eval/checks.mjs` (có test: `tests/unit/eval-checks.test.ts`), case ở `scripts/eval/tutor-cases.json`. Mọi case chạy các luật mặc định rồi tới luật riêng; một case có thể bỏ luật mặc định không hợp (`omit`, ví dụ đóng vai thì được chào).

| Luật | Đạt khi |
|---|---|
| `has_ipa` | có phiên âm `/…/` (có ký tự IPA, hoặc dạng ASCII ngắn đứng riêng như `/bed/`) |
| `has_pinyin_tones` | có chữ Hán và có pinyin **có dấu thanh trong ngoặc**, đúng như `tutorHint` tiếng Trung yêu cầu |
| `no_emoji`, `no_table`, `no_heading` | không có emoji, bảng markdown, tiêu đề `#` |
| `max_words N`, `min_words N` | số từ (tách theo khoảng trắng) trong giới hạn |
| `no_greeting_unprompted` | không mở đầu bằng "Chào/Xin chào/Hi/Hello/Hey" khi tin của người học không chào. Case người học có chào thì bỏ qua (không tính) |
| `contains_any`, `contains_all`, `not_contains_any` | có (một / tất cả) hay không có chuỗi, không phân biệt hoa thường |
| `vi_explanation` | tỉ lệ chữ Latin có dấu tiếng Việt ≥ ngưỡng (mặc định 0,12), tức phần giải thích bằng tiếng Việt |
| `asks_one_question` | đoạn cuối có tối đa 1 dấu `?` |
| `max_question_marks N` | cả câu trả lời có tối đa N dấu `?` (lượt đầu của quiz hỏi đúng một câu) |
| `has_italic_line` | có một dòng *in nghiêng* (dòng dịch tiếng Việt của lượt đóng vai) |

Giới hạn cần biết: luật là heuristic. `contains_any` chỉ kiểm có từ khóa chứ không kiểm nghĩa đúng; `not_contains_any ["đáp án"]` của case quiz có thể bắt nhầm một câu nhắc "không đưa đáp án". Một case trượt thì đọc tay câu trả lời trong file JSON trước khi sửa prompt. `JUDGE=1` để bổ sung chấm đúng/tự nhiên/hợp trình độ, nhưng điểm LLM dao động nên chỉ so sánh khi chênh rõ.

## 30 case

| Nhóm | Số case | Ví dụ |
|---|---|---|
| `word_en` | 6 | apple, run, library, `sesquipedalian`, ubiquitous, give up |
| `word_zh` | 6 | 你好, 了, 的/得/地, lượng từ, 学习, 囫囵吞枣 |
| `fix_en` | 5 | I goes to school yesterday; She don't like coffee; I have 20 years old… |
| `fix_zh` | 3 | trạng ngữ thời gian, bổ ngữ mức độ 得, lượng từ bị thiếu |
| `compare` | 3 | make/do, 会/能, borrow/lend |
| `translate` | 2 | Việt → Anh, Việt → Trung |
| `roleplay` | 2 | quán cà phê (EN), mua sắm (ZH), lượt đầu |
| `quiz` | 1 | lượt đầu hỏi đúng một câu, không lộ đáp án |
| `offtopic` | 2 | giá vàng, viết code Python: từ chối lịch sự, gợi ý hướng học |

Phần B sẽ thêm 2 case IELTS (Writing Task 2 ngắn, Speaking Part 1).

## Điểm baseline

**Chưa chạy.** Lúc làm P0 tài khoản `demo@example.com` không đăng nhập được trên project Supabase (chưa seed hoặc đã đổi mật khẩu), và chạy `pnpm db:seed` sẽ ghi vào database thật nên chủ repo quyết định. Cách điền:

1. `pnpm db:seed` (hoặc đặt `BENCH_EMAIL` / `BENCH_PASSWORD` của một tài khoản test), `pnpm dev --port 3100`.
2. `LABEL=baseline pnpm eval:tutor`.
3. Dán `casesPassed`, `checksPassed/checksTotal`, tỉ lệ từng luật và `ttft_p50/p90` vào bảng dưới, kèm model đã trả lời (xem dòng `[tutor] model …` trong log server).

| Ngày | Model / cấu hình | Case đạt | Luật đạt | has_ipa | has_pinyin_tones | no_greeting_unprompted | vi_explanation | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| _chưa chạy_ | | | | | | | | baseline trước phần B |
