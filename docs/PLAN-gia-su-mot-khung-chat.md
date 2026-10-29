# Gia sư AI: một khung chat duy nhất, luôn trả lời, thông minh hơn

> Kế hoạch chuyển đổi sang một khung chat tự nhận diện ý định, khắc phục triệt để lỗi bong bóng trống do model thinking của Gemini, tích hợp dữ liệu người học trực tiếp vào prompt và tối ưu trải nghiệm học ngoại ngữ.

## 1. Vì sao câu đầu ra bong bóng trống

1. **Câu đầu cần dùng công cụ** (lấy các từ hay quên) **còn câu sau thì không**. Với Gemini, sau khi gọi công cụ, model **đôi khi kết thúc lượt mà không viết chữ nào**. Đây là hành vi đã biết của Gemini Flash khi bật thinking.
2. `maxOutputTokens: 1500`: với Gemini, phần "suy nghĩ" (thinking) cũng bị tính vào giới hạn này. Câu cần lên kế hoạch hội thoại có thể dùng hết ngân sách cho phần suy nghĩ nên không còn chỗ để viết chữ.
3. Route cũ coi lượt đó là "xong" và lưu một tin nhắn chỉ có phần công cụ. Giao diện không vẽ gì cho phần đó, nên ra bong bóng rỗng. Tin rỗng này còn được lưu vào DB và gửi lại cho model ở các lượt sau.

Unit test `tests/unit/tutor-answer.test.ts` dựng lại đúng tình huống trên: model gọi công cụ rồi trả về rỗng. Test xác nhận bản sửa vẫn ra câu trả lời.

Các điểm "chưa thông minh" khác:
- Gia sư chào lại và gọi tên ở giữa cuộc trò chuyện.
- Gia sư bình luận khi đổi ngôn ngữ.
- Prompt không biết gì về sổ từ của người học nếu không gọi công cụ.

## 2. Nhánh `tutor-free-chat` đã làm gì

| Phần | Thay đổi |
|---|---|
| Luôn có câu trả lời | `lib/ai/tutor/answer.ts`: bước cuối (bước 5) tắt công cụ. Nếu cả lượt không có chữ thì hỏi lại model **một lần** với công cụ tắt và thinking nhẹ hơn. Nếu vẫn rỗng thì viết một câu xin lỗi ngắn, **không bao giờ để bong bóng trống**. Lỗi thật (429, sai khoá…) thì báo lỗi, không hỏi lại. |
| Model chắc chắn hơn | `lib/ai/tutor/model.ts`: thứ tự dùng là `AI_MODEL_CHAT_GOOGLE`, rồi các model trong `AI_MODEL_GOOGLE`. Chỉ chuyển model khi gặp 429/503. Nếu model từ chối `thinkingConfig` thì tự gọi lại không kèm nó. `maxRetries: 0`, timeout 55 giây, `maxOutputTokens: 4096`. |
| Lỗi dễ hiểu | `lib/ai/tutor/errors.ts`: phân loại thành `rate`, `quota`, `config`, `timeout`, `no_key`, mỗi loại có câu tiếng Việt riêng kèm nút "Thử lại". Log server ghi rõ loại lỗi. |
| Không trừ lượt oan | `recordUsage` chỉ chạy **sau khi** có câu trả lời thật (trước đây trừ ngay khi gửi). |
| Thông minh hơn | `lib/ai/tutor/learner.ts`: mỗi tin nhắn đọc số từ, số từ đến hạn, 8 từ hay quên và 6 từ mới của **từng ngôn ngữ**, rồi đưa vào prompt. Nhờ vậy gia sư "biết" sổ từ của người học mà không cần gọi công cụ. |
| Prompt mới | `lib/ai/chat-prompt.ts`: gia sư tự nhận ra ý định (giải thích, phân biệt, sửa câu, dịch, đóng vai, kiểm tra, ngữ pháp…) nên không cần chọn chế độ. Trả lời cả tiếng Anh lẫn tiếng Trung trong bất kỳ cuộc trò chuyện nào. Chỉ chào ở tin đầu. Luôn viết chữ sau khi dùng công cụ. Có quy tắc riêng cho lỗi người Việt hay mắc. |
| Công cụ | Thêm `lookupWord` (tra từ đã kiểm chứng qua `lookupBest`: cache chung hoặc từ điển miễn phí, không tốn lượt AI). Mọi công cụ nhận thêm `language`. |
| Giao diện `/chat` | **Bỏ hết các chế độ.** Trang chỉ còn: Bin chào, **một ô hỏi**, 4 gợi ý bấm nhanh (2 gợi ý luyện bằng từ của bạn, 1 gợi ý cho mỗi ngôn ngữ đang học) và danh sách trò chuyện gần đây. Gõ câu hỏi rồi gửi là mở cuộc trò chuyện mới và hỏi luôn. |
| Giao diện cuộc trò chuyện | Bỏ ô chọn chế độ và nhãn chế độ. Trên bong bóng có tên Bin. Trong lúc đợi, bong bóng hiện dấu "đang nghĩ" hoặc dòng "Đang tra từ điển…" thay vì để trắng. Tin rỗng cũ hiện "Bin chưa trả lời được tin này." kèm nút **Thử lại**. Ô nhập có nút Dừng; trên máy có bàn phím, Enter để gửi và không gửi khi đang gõ Telex hay pinyin. |
| Kiểm thử | Unit test mới: `tests/unit/tutor-answer.test.ts` (7 ca, gồm ca bong bóng rỗng) và `tests/unit/tutor-model.test.ts`. Thêm test prompt vào `tests/unit/chat.test.ts`. E2E `chat.spec.ts` chuyển sang luồng một ô chat và có thêm ca "câu trả lời rỗng hiện nút Thử lại". |

## 3. Kết quả thử bằng AI thật (Bước 5)

Đã chạy thử nghiệm thực tế 10 ca trên môi trường dev (với model `gemini-3.8-flash` và fallback `gemini-3.5-flash-lite`):

| # | Câu hỏi | Kết quả | Trạng thái |
|---|---|---|---|
| 1 | Bấm gợi ý "Luyện hội thoại với từ mình hay quên" | Có chữ ngay (không rỗng), Bin đóng vai chủ quán nước ép, dùng đúng từ hay quên `水果` và `好吃` trong sổ từ, có dòng dịch in nghiêng. | ✓ ĐẠT |
| 2 | Trả lời câu đóng vai (cố tình sai một lỗi: `我想喝一箇苹果汁`) | Sửa nhẹ chữ `箇` thành `个` chuẩn giản thể, khen ngợi và chủ quán nói tiếp để duy trì hội thoại. | ✓ ĐẠT |
| 3 | `phân biệt giúp tôi dog và cat` | Trả lời gọn gàng, vào thẳng nội dung, không chào lại, không gọi tên, không phàn nàn đổi ngôn ngữ, có ví dụ kèm nghĩa. | ✓ ĐẠT |
| 4 | `坚强 nghĩa là gì` | Đưa pinyin có dấu thanh `jiānqiáng`, âm Hán Việt `kiên cường`, giải thích nghĩa và câu ví dụ có dịch. | ✓ ĐẠT |
| 5 | `I am agree with you` | In đậm câu sửa `**I agree with you**`, giải thích quy tắc từ loại (agree là động từ, không đi với to be). | ✓ ĐẠT |
| 6 | `kiểm tra mình 5 từ đến hạn` | Đặt đúng 1 câu hỏi đầu tiên (hỏi nghĩa từ `umbrella`), dừng lại chờ người học trả lời. | ✓ ĐẠT |
| 7 | `kien cuong` (trả lời không dấu) | Nhận diện nghĩa từ không dấu và đối chiếu chính xác với câu hỏi. | ✓ ĐẠT |
| 8 | `thủ đô của Pháp là gì` | Từ chối lịch sự trong 1 câu vì ngoài phạm vi học ngoại ngữ, nhắc lại bài học trước đó. | ✓ ĐẠT |
| 9 | Bấm Dừng khi đang trả lời | Dừng stream ngay lập tức, ô nhập sẵn sàng gửi tin nhắn tiếp theo (E2E test pass). | ✓ ĐẠT |
| 10 | Tải lại trang | Toàn bộ lịch sử chat lưu đầy đủ trong database, không phát sinh bong bóng rỗng (E2E test pass). | ✓ ĐẠT |
