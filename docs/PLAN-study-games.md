# Kế hoạch: 3 chế độ học kiểu Quizlet — Ghép thẻ (Match), Kiểm tra (Test), Học (Learn)

> Đặt file này ở `docs/PLAN-study-games.md`. Làm theo từng phase (A → B → C → D), sau mỗi phase chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, chụp màn hình 390px + 1280px (sáng/tối) bằng `scripts/screenshot.mjs`, rồi commit. Đọc lại `CLAUDE.md` + `AGENTS.md` trước khi bắt đầu (Next 16 có thay đổi API, xem `node_modules/next/dist/docs/` khi cần).

## 0. Mục tiêu & phạm vi

Thêm 3 chế độ vào khu luyện tập hiện có (`/practice/[mode]`), dùng lại tối đa code sẵn có:

| Mode | Tên UI | Tóm tắt |
|---|---|---|
| `match` | Ghép thẻ | Bảng 12 ô (6 cặp từ – nghĩa), chạm 2 ô để ghép, tính giờ, sai bị cộng 1 giây, lưu kỷ lục theo bộ từ |
| `test` | Kiểm tra | Bài kiểm tra trộn nhiều dạng câu, làm hết rồi mới chấm, ra điểm %, xem lại câu sai, làm lại câu sai |
| `learn` | Học | Học theo vòng 7 từ: trắc nghiệm → gõ từ; sai thì quay lại; tới khi thuộc hết bộ. Lưu tiến độ để học tiếp |

Không làm: AI tạo bài, chế độ thi đấu nhiều người (Quizlet Live), Blast/Gravity.

Nguyên tắc chung (theo `CLAUDE.md`):
- UI tiếng Việt; code, tên biến, comment tiếng Anh.
- Mobile-first, nút ≥ 44px, nút icon có `aria-label`, hỗ trợ bàn phím (phím số 1–4 như `PracticeSession`, Enter để tiếp).
- Dùng token thiết kế "Vở màu" (`notebook-card`, `btn-3d`, `bg-wash-*`, `<Confetti>`, `<ProgressRing>`…), không dùng hex thô, tôn trọng `prefers-reduced-motion`.
- Logic thuần (không React) nằm trong `lib/practice/*`, nhận `rng` để test được (như `buildQuestions`).
- Khác biệt theo ngôn ngữ đi qua `lib/lang/registry.ts`.

## 1. Hiện trạng cần biết (đã đọc code)

- `PracticeMode` (`lib/lang/registry.ts`) = 7 mode, **trùng với enum Postgres `review_mode`** và `reviewSchema.mode` trong `lib/actions/review.ts`. Mỗi ngôn ngữ khai báo `practiceModes`.
- `lib/practice/questions.ts`: `buildQuestions(mode, targets, pool, rng)` tạo câu hỏi trên server; `MODE_INFO` = nhãn + gợi ý; `fitsMode`.
- `lib/practice/index.ts`: `shuffle`, `choiceOptions`, `pickDistractors`, `checkTyping` (EN cho sai 1 ký tự, ZH nhận Hán tự/pinyin), `makeCloze`.
- `app/(study)/practice/[mode]/page.tsx`: đọc `deck`, `n`, `source`, `srs`, `lang`; gọi RPC `practice_words` (targets + pool 200 từ làm đáp án nhiễu), render `FlashcardDeck` hoặc `PracticeSession`.
- `components/practice/practice-session.tsx`: UI câu hỏi (`Options`, `TermLine`, `MeaningLine`, `ReplayButton`…), ghi kết quả qua `enqueueReview` (outbox offline) với `rating` 3/1, `direction: "recognize"`, `updateCard = countsToSrs`; kết thúc bằng `SessionSummary`.
- `components/practice/practice-setup.tsx`: chọn mode (`MODE_LOOK` icon + màu), số câu, nguồn từ, công tắc "Tính vào ôn tập" → `router.push('/practice/<mode>?...')`.
- Trang bộ từ `app/(app)/decks/[deckId]/page.tsx` có nút "Lật thẻ" và "Luyện tập".
- Đã có `idb-keyval` (dùng cho outbox) → dùng để lưu kỷ lục Match và tiến độ Learn trên máy, **không cần migration**.

## 2. Quyết định thiết kế chung (làm trong Phase A)

### 2.1 Tách "mode hiển thị" khỏi "mode ghi log"
- Tạo `ReviewMode` = 7 giá trị cũ (lấy từ `Enums<"review_mode">` trong `database.types.ts` hoặc khai báo tay và giữ khớp).
- `PracticeMode = ReviewMode | "match" | "test" | "learn"`.
- `reviewSchema.mode` vẫn chỉ nhận `ReviewMode` → **không đổi DB, không migration**.
- Thêm helper `reviewModeOf(question: Question): ReviewMode` trong `lib/practice/questions.ts`:
  `choice`(prompt term/meaning) → `quiz`, `choice`(audio) → `listening`, `truefalse` → `quiz`, `typing` → `typing`, `cloze` → `cloze`.
- Match **không ghi review log** (ghép đoán mò không phản ánh trí nhớ từng từ); Test và Learn ghi từng câu như `PracticeSession` (rating đúng = 3, sai = 1; `updateCard` theo công tắc "Tính vào ôn tập"). Như vậy XP/streak/mục tiêu ngày/"Từ hay quên" tự động hoạt động.

### 2.2 Đăng ký mode
- `MODE_INFO`: thêm
  - `match: { label: "Ghép thẻ", hint: "Ghép từ với nghĩa nhanh nhất có thể." }`
  - `test: { label: "Kiểm tra", hint: "Làm bài trộn nhiều dạng câu, chấm điểm cuối bài." }`
  - `learn: { label: "Học", hint: "Học theo vòng tới khi thuộc hết bộ từ." }`
- `LANGUAGES.en.practiceModes` và `zh.practiceModes`: thêm `"learn", "test", "match"` (đặt `learn` lên đầu danh sách vì là chế độ chính).
- `MODE_LOOK` trong `practice-setup.tsx`: `learn` → `GraduationCap` (màu `jade`), `test` → `ClipboardCheck` (`grape`… chọn màu chưa trùng hoặc dùng `sky`), `match` → `Shuffle`/`Timer` (`sun`). Kiểm tra màu tile không trùng với mode cạnh nhau.
- Số câu theo mode (đang hardcode trong cả `page.tsx` và `practice-setup.tsx` → gom lại thành 1 hàm `countsFor(mode)` trong `lib/practice/questions.ts`):
  - `flashcard`: [20, 50, 200] (giữ nguyên)
  - `match`: [6, 12, 18] (= số cặp; 6 cặp mỗi bảng)
  - `test`: [10, 20, 30]
  - `learn`: [10, 20, 50]
  - còn lại: [10, 20, 30]
- `buildQuestions` không xử lý 3 mode mới; `page.tsx` rẽ nhánh riêng cho từng mode (xem từng phase).

### 2.3 Trang bộ từ
Thêm hàng nút nhanh kiểu Quizlet trên `decks/[deckId]/page.tsx` (cạnh "Lật thẻ"): **Học** (`/practice/learn?deck=…&n=20&from=deck`), **Kiểm tra** (`/practice/test?deck=…&n=20&from=deck`), **Ghép thẻ** (`/practice/match?deck=…&n=6&from=deck`). Trên điện thoại hiển thị dạng lưới 2 cột, không tràn ngang.

### Phase A — việc cụ thể
1. Tách `ReviewMode`/`PracticeMode`, sửa các chỗ dùng (`reviewSchema`, `enqueueReview`, `PracticeSession` props…) cho typecheck sạch.
2. `reviewModeOf`, `countsFor`, `MODE_INFO`, registry, `MODE_LOOK`.
3. `page.tsx`: tạm `notFound()` cho 3 mode mới chưa làm (hoặc chưa thêm vào `practiceModes` cho tới khi phase tương ứng xong — chọn cách này để không lộ mode dở dang).
4. Unit test: `reviewModeOf`, `countsFor`.

## 3. Phase B — Ghép thẻ (`match`)

### 3.1 Logic thuần — `lib/practice/match.ts`
```ts
export type MatchTile = { id: string; pairId: string; side: "term" | "meaning"; label: string };
export function buildMatchBoards(words: StudyWord[], pairsPerBoard = 6, rng?: Rng): MatchTile[][];
export function isPair(a: MatchTile, b: MatchTile): boolean; // cùng pairId, khác side
export const MATCH_PENALTY_MS = 1000;
export function formatMs(ms: number): string; // "12,3 giây"
```
- Loại trùng: hai từ có cùng `term` hoặc cùng `meaning_vi` (so sánh như `pickDistractors`) không được nằm chung một bảng (nếu không người dùng không phân biệt được). Từ trùng dồn sang bảng sau hoặc bỏ.
- Nghĩa dài: cắt hiển thị ở ~60 ký tự với `line-clamp`, không cắt trong logic.
- `label` mặt term: ZH hiển thị Hán tự (font `font-hanzi`), không kèm pinyin (để không quá dễ). Thêm tuỳ chọn trong registry? Không cần — giữ đơn giản.
- Unit test: đủ số bảng, mỗi bảng 2×n ô, mỗi pairId xuất hiện đúng 2 lần, không trùng nghĩa trong một bảng, kết quả xác định với `rng` cố định.

### 3.2 Server — `page.tsx`
- `mode === "match"`: lấy `practice_words` với `p_limit = n`, không cần pool. Ít hơn 2 từ hợp lệ → màn "Chưa luyện được" (thông báo: "Cần ít nhất 2 từ để ghép thẻ.").
- Tạo `boards = buildMatchBoards(words)` trên server (giữ ngẫu nhiên ngoài client render, như hiện tại), truyền vào `<MatchGame boards deckKey exitHref againHref />`. `deckKey` = `deckId ?? "lang:" + language`.

### 3.3 UI — `components/practice/match-game.tsx` (client)
- Màn bắt đầu: tiêu đề "Ghép thẻ", kỷ lục hiện tại (nếu có), nút lớn "Bắt đầu". Đồng hồ chỉ chạy sau khi bấm (tránh tính giờ lúc tải trang).
- Thanh trên: nút thoát (✕, `aria-label="Thoát"`), đồng hồ chạy (cập nhật bằng `requestAnimationFrame` hoặc interval 100ms), "Bảng 1/2".
- Lưới ô: 3 cột trên điện thoại (12 ô = 4 hàng), 4 cột trên desktop; mỗi ô là `button` `.notebook-card`, min-h 80px, chữ tự co.
- Tương tác: chạm ô 1 → viền `ink-blue`; chạm ô 2:
  - Đúng cặp → cả hai `animate-pop-in` rồi mờ dần và biến mất (giữ chỗ trống để lưới không nhảy).
  - Sai → cả hai viền `margin-red` + `animate-wiggle` 400ms, cộng `MATCH_PENALTY_MS` vào thời gian, hiện "+1 giây" nhỏ.
  - Chạm lại ô đang chọn → bỏ chọn.
- Hết bảng → sang bảng tiếp (đồng hồ chạy tiếp). Hết tất cả → màn kết quả.
- Bàn phím: Tab qua các ô, Enter/Space chọn (button sẵn có). Có `aria-live="polite"` báo "Đúng"/"Sai".
- Phát âm: không tự đọc (tránh ồn khi chơi nhanh).

### 3.4 Kỷ lục — `lib/practice/match-records.ts`
- Lưu bằng `idb-keyval`: key `match-best:<userId>:<deckKey>:<pairs>` → `{ ms, at }`. Có `userId` (từ `useMe`) để máy dùng chung không lẫn kỷ lục.
- Bọc try/catch; lỗi IndexedDB thì coi như không có kỷ lục, không làm hỏng game.

### 3.5 Màn kết quả
- Thời gian, số lần ghép sai, "Kỷ lục mới!" + `<Confetti>` nếu phá kỷ lục, so với kỷ lục cũ.
- Nút: "Chơi lại" (`againHref`, ván mới xáo lại), "Thử chế độ Học", "Xong" (`exitHref`).

### 3.6 Kiểm thử
- Unit (`tests/unit/match.test.ts`): như mục 3.1.
- E2E (`tests/e2e/study-games.spec.ts`, theo mẫu `core-flow.spec.ts`/`helpers.ts`): tạo bộ 6 từ, vào `/practice/match?deck=…&n=6`, bấm Bắt đầu, ghép đủ 6 cặp bằng cách đọc nhãn ô (map term → meaning từ dữ liệu test), thấy màn kết quả.

## 4. Phase C — Kiểm tra (`test`)

### 4.1 Cấu hình bài
Tham số URL (validate trong `page.tsx`, bỏ giá trị lạ):
- `n` ∈ `countsFor("test")`
- `types` = danh sách phân tách bằng dấu phẩy trong `choice,tf,typing,cloze` (mặc định `choice,tf,typing`; `cloze` chỉ áp dụng cho từ có câu ví dụ hợp lệ, từ không hợp lệ thì dùng dạng khác)
- `ask` ∈ `term|meaning|both` (mặc định `both`): hỏi bằng từ, bằng nghĩa, hay trộn.

`practice-setup.tsx`: khi chọn mode `test` hiện thêm 2 nhóm chip: "Dạng câu" (chọn nhiều — dùng checkbox styled giống `Chips`, bắt buộc ≥ 1) và "Hỏi bằng" (Từ / Nghĩa / Trộn).

### 4.2 Logic thuần — `lib/practice/test.ts`
- Thêm kind mới vào `Question`: `{ id, kind: "truefalse", prompt: "term" | "meaning", word, shown: string, isTrue: boolean }` — hiện từ + một nghĩa (đúng hoặc lấy từ `pickDistractors`, tỉ lệ ~50/50), hỏi "Đúng hay sai?". Prompt `meaning` thì ngược lại (hiện nghĩa + một từ).
- `buildTest(targets, pool, { types, ask }, rng): Question[]`
  - Chia đều các dạng đã chọn trên số câu (làm tròn, phần dư chia ngẫu nhiên), xáo thứ tự. Mỗi từ chỉ xuất hiện 1 lần.
  - Dạng `choice`: dùng lại logic `quiz` (`choiceOptions`), `prompt` theo `ask`.
  - Dạng `typing`: luôn hiện nghĩa, gõ từ (giống mode `typing`). Nếu `ask = "term"` thì vẫn để typing là nghĩa → từ (gõ nghĩa tiếng Việt không chấm được chính xác).
  - Dạng `cloze`: chỉ từ có `fitsMode(word, "cloze")`.
  - Pool nhỏ (< 4 từ) → `choice` có ít đáp án hơn, vẫn chạy; < 2 từ → không có `tf`/`choice`, rơi về `typing`.
- `gradeTest(questions, answers): { correct: number; total: number; percent: number; items: Array<{ question; answer; result: "correct" | "close" | "wrong" }> }`
  - `typing` dùng `checkTyping`; `close` tính là **đúng** nhưng đánh dấu "gần đúng" (giống `PracticeSession`).
  - Câu bỏ trống = sai.
- Unit test (`tests/unit/test-mode.test.ts`): phân bổ dạng câu, không trùng từ, tf có cả đúng lẫn sai, chấm điểm (đúng/gần đúng/sai/bỏ trống), xác định với `rng` cố định.

### 4.3 Server — `page.tsx`
- `mode === "test"`: lấy targets (`p_limit = n * 2` nếu có `cloze`, như `needsFilter`) + pool 200, `buildTest(...)`, cắt còn `n`. Truyền `<TestSession questions countsToSrs exitHref againHref />`.

### 4.4 UI — `components/practice/test-session.tsx` (client)
Tách các khối dùng chung từ `practice-session.tsx` ra `components/practice/question-parts.tsx` (`TermLine`, `MeaningLine`, `ReplayButton`, `Options`, `useSpeak`) rồi import lại ở cả hai file — **không copy-paste**.

- Bố cục kiểu bài thi: tất cả câu trên một trang cuộn dọc, mỗi câu một `.notebook-card` đánh số "Câu 3/20" + nhãn dạng câu.
  - `choice`: các nút đáp án (chọn được, đổi được trước khi nộp; chưa tô đúng/sai).
  - `truefalse`: hai nút "Đúng" / "Sai".
  - `typing`: ô input (tắt autocorrect/autocapitalize; ZH gợi ý "Gõ chữ Hán hoặc pinyin").
  - `cloze`: câu có chỗ trống + các nút đáp án.
- Thanh dính dưới cùng: "Đã làm 12/20" + nút "Nộp bài". Nộp khi còn câu trống → dialog xác nhận (`alert-dialog` có sẵn): "Còn 3 câu chưa làm. Vẫn nộp?".
- Danh sách nhảy nhanh: trên desktop một cột phải nhỏ các ô số (đã làm = tô màu), bấm để cuộn tới câu.
- Giữ bài đang làm khi lỡ tải lại trang: lưu `answers` vào `sessionStorage` theo key của bài (bọc try/catch) — tuỳ chọn, làm nếu gọn.

Sau khi nộp:
- Màn kết quả: `<ProgressRing>` với % điểm, "Đúng 17/20", lời nhận xét theo mức (≥ 90%: "Xuất sắc!" + `<Confetti>`; ≥ 70%; < 70%).
- Bên dưới: danh sách từng câu, câu sai mở sẵn hiển thị "Bạn trả lời: …" (đỏ) và "Đáp án: …" (xanh), có nút 🔊; câu đúng thu gọn. Lọc "Chỉ câu sai".
- Nút: "Làm lại câu sai" (tạo bài mới chỉ từ các từ sai — làm phía client bằng `buildTest` với chính các từ đó và pool là toàn bộ từ trong bài, hoặc điều hướng với `?words=<id,...>`; chọn cách client để khỏi query lại), "Làm bài mới" (`againHref`), "Học các từ sai" (sang `learn` với các từ đó nếu Phase D đã có, không thì ẩn), "Xong".
- Ghi log: khi nộp, `enqueueReview` cho từng câu với `mode = reviewModeOf(q)`, `rating` 3/1, `wasCorrect`, `durationMs` = thời gian làm cả bài / số câu (không đo từng câu), `updateCard = countsToSrs`. Gom xử lý giống `PracticeSession` (xem dòng ~190–215) để XP hiển thị đúng ở màn kết quả.

### 4.5 Kiểm thử
- Unit như 4.2.
- E2E: tạo bộ 10 từ, làm bài 10 câu với `types=choice,tf`, trả lời cố tình sai 2 câu, nộp, thấy "80%", bấm "Làm lại câu sai" ra bài 2 câu.

## 5. Phase D — Học (`learn`)

### 5.1 Cách hoạt động (giống Learn của Quizlet, bản gọn)
- Mỗi từ có `level`: `0` chưa học → `1` đã đúng trắc nghiệm → `2` đã đúng gõ từ = **đã thuộc**.
- Mỗi **vòng** lấy tối đa 7 từ chưa thuộc (ưu tiên từ đang học dở, rồi từ mới theo thứ tự).
- Trong vòng, mỗi từ được hỏi theo level: level 0 → câu trắc nghiệm (`choice`, prompt trộn term/meaning); level 1 → `typing` (nhìn nghĩa gõ từ). Tuỳ chọn trong registry cho ZH: level 1 có thể là `listening` nếu người dùng tắt gõ (để sau, không bắt buộc).
- Đúng → `level + 1`. Sai → `level = 0`, hiện đáp án đúng, và từ đó được hỏi lại **ở cuối vòng hiện tại** (chèn vào hàng đợi, cách ít nhất 2 câu).
- Hết vòng → màn "Hết vòng 2" với 3 thanh: Chưa học / Đang học / Đã thuộc, danh sách từ trong vòng (đã thuộc ✓). Nút "Tiếp tục".
- Tất cả thuộc → màn hoàn thành + `<Confetti>`, nút "Học lại từ đầu", "Làm bài kiểm tra" (`/practice/test?...` cùng bộ), "Xong".

### 5.2 Logic thuần — `lib/practice/learn.ts` (reducer, không React)
```ts
export type LearnWordState = { wordId: string; level: 0 | 1 | 2; misses: number };
export type LearnState = {
  version: 1;
  words: LearnWordState[];       // thứ tự học
  round: number;
  queue: string[];               // wordId còn phải hỏi trong vòng này
  roundWords: string[];          // từ của vòng hiện tại (để hiện màn tổng kết)
};
export function initLearn(wordIds: string[]): LearnState;
export function startRound(state: LearnState, size = 7): LearnState;
export function questionFor(state: LearnState, word: StudyWord, pool: StudyWord[], rng?: Rng): Question; // choice hoặc typing theo level
export function answer(state: LearnState, wordId: string, correct: boolean): LearnState;
export function roundDone(state: LearnState): boolean;
export function progress(state: LearnState): { notStarted: number; learning: number; mastered: number };
```
- Câu hỏi tạo ngay khi cần trên client (vì phụ thuộc kết quả câu trước), nên `choiceOptions` và `checkTyping` phải dùng được trong bundle client — đã đúng như hiện tại (`practice-session.tsx` đang import `checkTyping`). Kiểm tra không kéo `opencc-js` vào client.
- Unit test (`tests/unit/learn.test.ts`): vòng tối đa 7 từ; đúng tăng level; sai về 0 và được hỏi lại trong cùng vòng; không hỏi từ đã thuộc; `progress` đúng; hoàn thành khi mọi từ level 2; `answer` cho wordId không có trong queue không làm hỏng state.

### 5.3 Lưu tiến độ — `lib/practice/learn-store.ts`
- `idb-keyval`, key `learn:<userId>:<deckKey>` → `LearnState`. Lưu sau mỗi câu trả lời.
- Vào lại trang: nếu có state cũ và danh sách từ còn khớp (lọc bỏ wordId đã bị xóa, thêm từ mới vào cuối ở level 0) → màn "Tiếp tục học? Đã thuộc 12/20" với nút "Học tiếp" / "Bắt đầu lại".
- `version` khác → bỏ state cũ. Mọi thao tác bọc try/catch.

### 5.4 Server — `page.tsx`
- `mode === "learn"`: lấy targets `p_limit = n` + pool 200, truyền thẳng `words` + `pool` + `deckKey` vào `<LearnSession />` (không gọi `buildQuestions`). Với Learn, mặc định nguồn từ `all` theo thứ tự trong bộ; giữ tham số `source` nếu người dùng chọn.

### 5.5 UI — `components/practice/learn-session.tsx` (client)
- Dùng lại `question-parts.tsx` (Phase C) để hiển thị câu trắc nghiệm/gõ từ cùng phong cách với `PracticeSession`.
- Thanh trên: ✕ thoát, thanh tiến độ 3 màu (đã thuộc `jade` / đang học `sun` / chưa học `rule`), "Vòng 2".
- Sau mỗi câu: phản hồi đúng/sai như `PracticeSession` (gồm "gần đúng" cho typing), nút "Tiếp tục" (Enter). Câu sai hiện thêm thẻ đáp án đầy đủ (từ, phiên âm/pinyin, nghĩa, 🔊).
- Nhãn nhỏ phía trên câu cho biết cấp độ: "Từ mới" / "Ôn lại — gõ từ".
- Ghi log mỗi câu bằng `enqueueReview` (mode theo `reviewModeOf`, rating 3/1, `updateCard = countsToSrs`).

### 5.6 Kiểm thử
- Unit như 5.2.
- E2E: bộ 3 từ, học tới khi thuộc hết (trả lời đúng dựa trên dữ liệu test, cố tình sai 1 câu để kiểm tra từ bị hỏi lại), thấy màn hoàn thành; tải lại trang giữa chừng và thấy "Học tiếp".

## 6. Phase E — Hoàn thiện
1. Trang chọn luyện tập: đặt 3 mode mới thành nhóm "Học kiểu Quizlet" phía trên hoặc đầu danh sách; kiểm tra lưới mode không vỡ trên 390px với 10 mode (EN 8, ZH 10).
2. `SessionSummary`/màn kết quả: nút gợi ý chéo giữa các mode (Học → Kiểm tra → Ghép thẻ).
3. "Từ hay quên" (`/hard-words`): thêm nút "Học các từ này" (`/practice/learn?source=hard&lang=…`).
4. Kiểm tra a11y nhanh: focus thấy rõ, `aria-live` cho phản hồi đúng/sai, không phụ thuộc màu để báo đúng/sai (có icon ✓/✕).
5. Chế độ tối: chụp màn hình `--dark` cả 3 mode.
6. Cập nhật `CLAUDE.md` mục "Deviations from the plan": `ReviewMode` vs `PracticeMode`, Match không ghi log, kỷ lục Match và tiến độ Learn lưu bằng IndexedDB theo `userId` (mất khi xoá dữ liệu trình duyệt, không đồng bộ giữa máy), kind `truefalse` ghi log là `quiz`.
7. Cập nhật `docs/PLAN.md` §10.4: thêm 3 dòng vào bảng mode.

## 7. Thứ tự commit gợi ý
1. `feat(practice): split review modes from practice modes` (Phase A)
2. `feat(practice): match game` (Phase B)
3. `refactor(practice): extract shared question parts` + `feat(practice): test mode` (Phase C)
4. `feat(practice): learn mode with saved progress` (Phase D)
5. `feat(practice): polish study games, docs` (Phase E)

## 8. Tiêu chí hoàn thành
- `pnpm lint`, `pnpm typecheck`, `pnpm test` sạch; E2E mới chạy qua với `pnpm test:e2e`.
- Cả 3 mode chạy được với bộ từ tiếng Anh và tiếng Trung, trên 390px và 1280px, sáng và tối.
- Không có migration mới; dữ liệu cũ không bị ảnh hưởng.
- Test/Learn làm tăng XP, streak và "Từ hay quên" như các mode cũ; chỉ đổi lịch FSRS khi bật "Tính vào ôn tập".
- Mất mạng giữa chừng: kết quả vẫn vào outbox và gửi lại sau (dùng `enqueueReview` sẵn có).
