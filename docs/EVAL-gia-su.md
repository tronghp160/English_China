# Chấm chất lượng Gia sư AI (`/api/chat`)

Bộ chấm tự động cho Gia sư Bin, để mọi thay đổi prompt hay model (phần A, B của `PLAN-tam-su-va-gia-su.md`) đo được bằng điểm, không đoán.

- Chạy: `pnpm eval:tutor` (cần app đang chạy và tài khoản demo: `pnpm dev --port 3100` + `pnpm db:seed`).
- Môi trường: `BASE_URL` (mặc định `http://localhost:3100`), `BENCH_EMAIL`, `BENCH_PASSWORD`, `BENCH_COOKIE`, `ONLY=en_word_apple,fix_en` (id case hoặc nhóm), `LABEL=tên-lần-chạy` (ghi vào file kết quả), `JUDGE=1` (chấm thêm 1–5 bằng LLM, tốn thêm quota; mặc định tắt).
- Mỗi case là **một tin đầu tiên trong thread mới**, cách nhau 6 s (rate limit 12/phút). 32 case tốn khoảng 32 lượt AI của tài khoản demo (hạn mức `AI_DAILY_LIMIT_PER_USER`). Chạy hết mất ~7 phút.
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

## 32 case

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
| `ielts` | 2 | Writing Task 2 ngắn, Speaking Part 1: đủ tiêu chí, band theo khoảng kèm lời nói rõ là ước lượng |
| `offtopic` | 2 | giá vàng, viết code Python: từ chối lịch sự, gợi ý hướng học |

## Phần B: các thay đổi prompt cần kiểm chứng bằng eval

Plan yêu cầu chạy lại `pnpm eval:tutor` sau mỗi thay đổi prompt và **bỏ thay đổi nào làm điểm giảm**. Lúc làm phần B chưa có tài khoản để chạy eval, nên các thay đổi dưới đây được áp dụng đúng như plan mô tả nhưng **chưa được chấm**. Việc cần làm: chạy `LABEL=before pnpm eval:tutor` trên commit trước phần B (`git stash` hoặc checkout `edb6a11`), rồi `LABEL=after pnpm eval:tutor` trên nhánh này, so từng luật. Mỗi thay đổi nằm ở một dòng riêng trong `lib/ai/chat-prompt.ts` nên bỏ từng cái không đụng cái khác:

| # | Thay đổi | Dòng / chỗ | Luật chấm liên quan |
|---|---|---|---|
| 1 | Chỉ chào lại khi người học chào | `<luot_nay>` lượt đầu | `no_greeting_unprompted` |
| 2 | Câu đầu trả lời thẳng câu hỏi | `<cach_tra_loi>`, dòng "Vào thẳng nội dung" | `contains_any` của từng case (đáp án nằm sớm), `max_words` |
| 3 | 3 ví dụ mẫu (`STYLE_EXAMPLES`, khối `<vi_du_mau>`, ≤ 900 ký tự) | sau `</cach_tra_loi>` | `has_ipa`, `has_pinyin_tones`, `asks_one_question`, `vi_explanation` |
| 4 | Tự kiểm trước khi gửi | cuối `<cach_tra_loi>` | `has_ipa`, `has_pinyin_tones` |
| 5 | Sửa câu: lỗi sai nghĩa trước, tối đa 3 lỗi | dòng "Sửa câu" | các case `fix_en`, `fix_zh`, `max_words` |
| 6 | Nhắc lỗi lặp lại | cuối dòng "Sửa câu" | không có case nhiều lượt trong bộ chấm hiện tại; đọc tay |
| 7 | Mức thinking "low" cho IELTS / viết đoạn (`effort.ts`) | `HEAVY_WORK` | TTFT các case `ielts`; câu "writing nghĩa là gì" vẫn "minimal" |
| 8 | Trình độ ước lượng trong `<du_lieu_nguoi_hoc>` + luật "chỉ khó hơn một chút" (P6.1) | `learnerBlock`, `<cach_tra_loi>` | không có luật tự động (tài khoản demo có thể chưa đủ từ có cấp độ); đọc tay ví dụ đóng vai |
| 9 | Chấm IELTS Writing / Speaking theo tiêu chí và band theo khoảng (P6.2) | `<cach_hieu_yeu_cau>` | 2 case `ielts` |

Hai chỗ khác với plan: (a) plan chỉ nêu bộ 4 tiêu chí của Writing; prompt nêu thêm bộ của Speaking (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation), kèm lời dặn chữ viết không chấm được phát âm; (b) ước lượng trình độ cần tối thiểu 3 từ có cấp độ (`MIN_LEVELED_WORDS`), ít hơn thì bỏ qua thay vì đoán từ một hai từ.

Nghiệm thu phần B (chưa có số): điểm mỗi luật ≥ baseline, tổng điểm tăng, không còn mở đầu "Chào bạn" khi không được chào.

## Điểm baseline

**Chưa chạy.** Lúc làm P0 tài khoản `demo@example.com` không đăng nhập được trên project Supabase (chưa seed hoặc đã đổi mật khẩu), và chạy `pnpm db:seed` sẽ ghi vào database thật nên chủ repo quyết định. Cách điền:

1. `pnpm db:seed` (hoặc đặt `BENCH_EMAIL` / `BENCH_PASSWORD` của một tài khoản test), `pnpm dev --port 3100`.
2. `LABEL=baseline pnpm eval:tutor`.
3. Dán `casesPassed`, `checksPassed/checksTotal`, tỉ lệ từng luật và `ttft_p50/p90` vào bảng dưới, kèm model đã trả lời (xem dòng `[tutor] model …` trong log server).

| Ngày | Model / cấu hình | Case đạt | Luật đạt | has_ipa | has_pinyin_tones | no_greeting_unprompted | vi_explanation | Ghi chú |
|---|---|---|---|---|---|---|---|---|
| _chưa chạy_ | | | | | | | | baseline trước phần B |
