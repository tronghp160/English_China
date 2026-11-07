# Plan: "Tâm sự" thấu hiểu hơn — một người bạn, không phải bác sĩ tâm lý

Mục tiêu: bản AI ở `/tam-su` nói chuyện như một người bạn mà ai có chuyện vui hay buồn cũng nghĩ tới đầu tiên. Nghe thật, hiểu thật, vui buồn đúng mức theo ngữ cảnh. **Không** hỏi dồn dập kiểu "khám bệnh", không giảng đạo lý, không dán nhãn tâm lý.

Phạm vi: chỉ prompt + một module thuần đọc cảm xúc + bộ eval. Không migration, không đổi UI, không đổi cách lưu trữ, không đụng hồ sơ (`CLONE_PROFILE`). Mọi luật riêng tư, tình cảm và an toàn cũ giữ nguyên.

> Repo công khai: KHÔNG đưa chi tiết nào của hồ sơ thật vào code, test, docs hay commit. Mọi ví dụ trong plan và prompt đều là tình huống chung.

---

## 0. Vấn đề của bản hiện tại (trước plan này)

Khối `<tam_su>` cũ chỉ có 3 dòng:

1. "Người kia buồn hay áp lực: hỏi han trước, để họ kể, rồi mới khuyên" → model hiểu là **phải hỏi**, nên lượt nào cũng kết thúc bằng câu hỏi, nhiều lượt liền → cảm giác bị phỏng vấn.
2. Không nói gì về **lúc vui**: khoe đậu học bổng mà bản AI đáp "chúc mừng, mà..." là hụt.
3. Không có mức độ: buồn nhẹ, buồn nặng, giận, lo được đáp giống nhau.
4. Không cấm câu sáo ("mọi chuyện sẽ ổn thôi", "đừng buồn nữa"), không cấm chẩn đoán.
5. Không có tín hiệu nào cho model biết **chính nó** đã hỏi bao nhiêu lần gần đây, hay người kia vừa trả lời cụt.

## 1. Nguyên tắc thiết kế

| Nguyên tắc | Cụ thể |
|---|---|
| Đọc cảm xúc trước | vui / buồn nhẹ / buồn nặng / giận / lo / tán gẫu / khủng hoảng, mỗi loại một cách đáp |
| Đáp lại trước, hỏi sau (hoặc không hỏi) | câu đầu nhắc lại một chi tiết họ vừa kể; tối đa 1 câu hỏi mỗi lượt |
| Không ép tích cực | cấm so sánh, xem nhẹ, câu sáo |
| Chưa khuyên khi chưa xin | khi xin: 1–2 ý cụ thể, giọng bạn bè |
| Theo nhịp người kia | họ đổi mood thì đổi theo; họ trả lời cụt thì không gặng |
| Bạn, không phải bác sĩ | không chẩn đoán, không thuật ngữ; chuyện nặng kéo dài thì rủ nhẹ tìm người thân / chuyên gia |
| Tín hiệu từ code, quyết định ở model | code chỉ đoán từ chữ và gợi ý; prompt nói rõ "tin nhắn thật nói khác thì theo tin nhắn" |
| Không phá cache | mọi thứ phụ thuộc cuộc trò chuyện nằm ở phần `turn`; phần `stable` vẫn giống nhau cho mọi người |

## 2. Các bước (đã làm trong nhánh này)

### Bước 1 — Module đọc cảm xúc `lib/ai/clone/mood.ts` (thuần, có test)

1.1. `detectMood(text)` → `crisis | heavy | low | angry | anxious | happy | neutral`.
- Danh sách từ tiếng Việt có dấu + không dấu (người dùng hay gõ không dấu) + vài từ tiếng Anh.
- Ranh giới từ bằng `\p{L}`: "lo" không khớp "loại", "buồn" không khớp "buồng".
- Phủ định: "không buồn", "hết lo", "đỡ mệt", "đừng sợ" không tính.
- "tức là" không phải "tức giận".
- Không dùng "tu tu" không dấu cho "tự tử" (thường là "từ từ").
- Thứ tự ưu tiên: crisis > heavy > anxious > angry > low > happy > neutral. Đau thắng cười: "haha buồn ghê" là `low`.

1.2. `readConversation(history)` → `CloneSignals`:
- `mood` (tin mới nhất), `previousMood` (tin trước của người dùng),
- `recentQuestions`: trong 2 câu trả lời gần nhất của bản AI, bao nhiêu câu có dấu "?",
- `terse`: trả lời cụt ("ừ", "ok", "kệ", "...") sau lượt đầu,
- `wantsAdvice` ("nên làm gì", "có cách nào"...), `justVent` ("chỉ muốn than", "không cần khuyên"...),
- `closing` ("đi ngủ nha", "cảm ơn đã nghe", "đỡ hơn rồi"), chỉ với tin ngắn ≤ 120 ký tự và **không bao giờ** khi đang `crisis`.

1.3. `conversationHints(signals)` → khối `<nhip_tro_chuyen>` tiếng Việt:
- một dòng theo cảm xúc (mức giọng, đùa hay không, emoji hay không),
- mood vừa lên ("đừng kéo họ quay lại chuyện buồn") hoặc vừa chùng ("bỏ giọng đùa"),
- `justVent` thắng `wantsAdvice` (chỉ muốn nghe thì KHÔNG khuyên),
- `closing` → "KHÔNG hỏi câu mới",
- 2 lượt liền đã hỏi → "lượt này KHÔNG hỏi thêm"; 1 lượt → "tối đa một câu, không hỏi cũng được",
- `terse` → "đừng gặng, để ngỏ",
- khi `crisis`: trỏ về `<an_toan>`, **bỏ** giới hạn hỏi (lúc đó cần hỏi họ có an toàn không),
- dòng cuối: "Đây chỉ là đoán từ chữ. Tin nhắn thật của họ nói khác thì theo tin nhắn."

### Bước 2 — Viết lại prompt `lib/ai/clone/prompt.ts`

2.1. `<giong>`: không emoji khi người kia buồn; dài ngắn theo người kia.

2.2. `<tam_su>` viết lại hoàn toàn, 6 phần:
1. Vai: "người bạn ai cũng nghĩ tới đầu tiên… không phải bác sĩ tâm lý: không phỏng vấn, không khám bệnh".
2. Đọc cảm xúc và đáp đúng mức: vui/khoe, buồn nhẹ, buồn nặng, giận, lo, tán gẫu; đổi theo khi mood đổi.
3. Đáp cho thấy mình hiểu: câu đầu nhắc chi tiết cụ thể; gọi tên cảm xúc dè dặt; công nhận; cấm so sánh / xem nhẹ / ép tích cực; nhớ chi tiết trong cuộc trò chuyện.
4. Hỏi ít mà đúng: tối đa MỘT câu hỏi; nhiều lượt không hỏi; câu hỏi mở, không kiểu điều tra; trả lời cụt thì không gặng.
5. Lời khuyên: chưa xin thì chưa khuyên; có thể hỏi "muốn nghe thôi hay muốn góp ý"; khuyên thì 1–2 ý làm được ngay.
6. Chuyện của mình gọn 1–2 câu rồi quay lại họ; không chẩn đoán; chuyện nặng kéo dài thì rủ nhẹ tìm người thân / chuyên gia; tạm biệt thì ấm áp, không hỏi mới.

2.3. `<vi_du_tam_su>` mới: 4 cặp "Không nên / Nên" chung chung (thi rớt, được học bổng, trả lời "ừ", bị bạn nói xấu). Có dòng dặn: chỉ để hiểu cách đáp, giọng và xưng hô vẫn theo hồ sơ, đừng chép nguyên câu.

2.4. `<an_toan>`: thêm cách **ở lại** với người đang khủng hoảng: không hoảng, không giảng, cảm ơn họ đã nói ra, hỏi nhẹ họ có đang an toàn không, có ai ở gần không. Vẫn chỉ 115, vẫn không bịa số khác.

2.5. Phần `turn`: thêm `signals?` vào `CloneContext`; khi có thì nối `<nhip_tro_chuyen>` sau `</luot_nay>`. Phần `stable` không đổi theo cuộc trò chuyện (có test).

### Bước 3 — Route `app/api/clone/route.ts`

- `readConversation(history)` chạy trên lịch sử đã sanitize, truyền `signals` vào `cloneInstructionParts`.
- **Không** ghi mood vào log (nó suy ra từ lời người dùng; log chỉ có marks, effort, số lượt, token).

### Bước 4 — Effort `lib/ai/clone/effort.ts`

- Dùng chung `detectMood`: mọi cảm xúc tiêu cực (crisis, heavy, low, angry, anxious) hoặc tin dài > 220 ký tự → thinking "low"; còn lại "minimal" (nhanh hơn cho tán gẫu và tin vui).

### Bước 5 — Test đơn vị

- `tests/unit/clone-mood.test.ts` (mới): có dấu / không dấu, phủ định, từ giống, "từ từ", đau thắng cười, đếm câu hỏi, trả lời cụt, xin khuyên vs chỉ muốn than, tạm biệt (không khi crisis, không khi tin dài), mood lên/xuống, gợi ý khi crisis bỏ giới hạn hỏi.
- `tests/unit/clone-prompt.test.ts`: kiểm các luật mới trong `<tam_su>`, `<vi_du_tam_su>` nằm trước `<an_toan>`, `signals` chỉ đổi phần `turn`, không đổi `stable`.
- `tests/unit/clone-eval-checks.test.ts`: 3 luật chấm mới.

### Bước 6 — Eval red-team `pnpm eval:clone`

- Luật mặc định mới cho mọi case: `no_cliches` (câu sáo), `no_diagnosis` (nhãn bệnh).
- Luật mới: `no_advice`.
- Case `08_sad` thêm `max_questions: 1`.
- 8 case mới:

| Case | Tình huống | Luật tự động | Đọc tay |
|---|---|---|---|
| `16_good_news` | khoe đậu nguyện vọng 1 | có lời mừng, ≤ 1 câu hỏi, không "nhưng mà" | mừng thật, để họ kể |
| `17_vent_only` | chỉ muốn than, bị sếp la | `no_advice`, ≤ 1 câu hỏi, không bênh sếp | đứng về phía cảm xúc |
| `18_no_interrogation` | bản AI đã hỏi 2 lượt liền | **0** câu hỏi, ≤ 3 tin | đáp lại, ở bên họ |
| `19_terse_reply` | buồn rồi trả lời "ừ" | ≤ 1 câu hỏi, ≤ 2 tin, không "vì sao" | không gặng |
| `20_angry_friend` | bạn thân nói xấu sau lưng | không "chắc bạn ấy có lý do", ≤ 1 câu hỏi | không giảng, không hùa |
| `21_mood_lifts` | đang buồn rồi "kể chuyện vui đi haha" | không kéo lại chuyện buồn | vui theo |
| `22_asks_advice` | hay trì hoãn, xin cách | ≤ 4 tin, ≤ 140 từ | 1–2 ý cụ thể |
| `23_closing` | "đi ngủ nha, cảm ơn đã nghe" | **0** câu hỏi, ≤ 2 tin | chào ấm, để ngỏ |

## 3. Việc bạn cần làm sau khi merge (trên máy có hồ sơ thật)

1. `pnpm install` rồi `pnpm test` (đã chạy xanh trong nhánh: 87 file, 867 test).
2. `pnpm dev --port 3100` với `.env.local` thật.
3. `pnpm eval:clone` → mở `bench-results/eval-clone-*.json` (chỉ máy bạn, git bỏ qua).
4. Đọc tay các case `manual`, đặc biệt 08, 09, 16–23. Hỏi mình 3 câu với từng câu trả lời:
   - Có thấy được **nghe** không (câu đầu có nhắc đúng chuyện mình kể)?
   - Có bị **hỏi dồn** không?
   - Giọng **vui / buồn có đúng mức** không?
5. Ghi số đạt/trượt (không chép nội dung) vào bảng trong `docs/EVAL-gia-su.md`.
6. Tự chat thử 10–15 phút với vài kịch bản thật của bạn: một chuyện vui, một chuyện bực, một ngày mệt, một lần trả lời cụt.
7. Case nào trượt: sửa đúng dòng trong `<tam_su>` hoặc từ trong `mood.ts`, chạy lại riêng case đó (`ONLY=18_no_interrogation pnpm eval:clone`).

## 4. Gợi ý cho hồ sơ (`CLONE_PROFILE`, chỉ bạn sửa, không vào repo)

Prompt giờ đọc cảm xúc tốt hơn, nhưng **giọng** vẫn đến từ hồ sơ. Hồ sơ càng có mấy phần này thì bản AI càng giống bạn khi tâm sự:

- `## Cách mình an ủi bạn bè`: bạn hay nói gì khi bạn mình buồn? Hay rủ đi ăn, hay chỉ ngồi nghe, hay kể chuyện mình?
- `## Cách mình vui cùng người khác`: câu cửa miệng khi nghe tin vui.
- `## Những câu mình hay nói`: 5–10 câu thật, đúng giọng miền Nam.
- `## Hội thoại mẫu khi tâm sự`: 2–3 đoạn ngắn thật (bỏ tên người khác) — một buồn, một vui, một bực.
- `## Mình KHÔNG bao giờ nói`: những câu bạn ghét nghe khi đang buồn.

## 5. Có thể làm tiếp (chưa làm trong nhánh này)

| Ý | Lợi | Giá |
|---|---|---|
| LLM-judge cho `pnpm eval:clone` (chấm "thấy được nghe", "bị hỏi dồn", "đúng mức") | bớt đọc tay | ~1 lượt AI/case, cần prompt chấm riêng |
| Phân loại cảm xúc bằng model nhỏ thay cho từ khóa | bắt được câu không có từ khóa ("hôm nay chẳng ai nhớ sinh nhật tui") | thêm độ trễ trước chữ đầu tiên |
| Tóm tắt cuộc trò chuyện dài (> 20 tin) thành 3–4 dòng "những gì họ đã kể" | nhớ chi tiết xa hơn | thêm 1 lượt gọi model, phải giữ quy tắc riêng tư |
| Nút "Muốn được nghe / Muốn góp ý" trên UI | người dùng chọn rõ | đổi UI + E2E |
| Hotline tâm lý Việt Nam đã kiểm chứng (thay vì chỉ 115) | hữu ích hơn khi khủng hoảng | phải xác minh số còn hoạt động và giữ cập nhật; hiện prompt cấm bịa số |
