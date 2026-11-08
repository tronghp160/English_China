import type { CloneTurn } from "@/lib/ai/clone/history";

/**
 * Pure. A rough read of how the conversation feels, from the words alone, so the per-turn instructions can tell the
 * companion how to pitch its answer (cheerful with good news, slow and warm with heavy news) and how often it may ask.
 * It is only a hint: the prompt says the message itself wins when they disagree. No profile and no names in here:
 * the word lists are generic Vietnamese (with and without diacritics) and a few English words.
 */

export type CloneMood = "crisis" | "heavy" | "low" | "angry" | "anxious" | "happy" | "neutral";

const NEGATIVE: ReadonlySet<CloneMood> = new Set(["crisis", "heavy", "low", "angry", "anxious"]);
export const isNegativeMood = (m: CloneMood) => NEGATIVE.has(m);

/** A word or phrase that stands alone ("lo" is not "loại", "buồn" is not "buồng"). */
const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
/** "không buồn", "hết lo", "đỡ mệt", "đừng sợ"... are not the feeling itself. */
const NOT = "(?<!(?:không|hông|ko|k|chẳng|chả|hết|đỡ|bớt|đừng|khỏi)\\s)";

const words = (list: string[], negatable = false) => new RegExp(`${B}${negatable ? NOT : ""}(?:${list.join("|")})${E}`, "iu");

const CRISIS = words([
  "muốn chết", "chết quách", "chết cho xong", "chết đi cho rồi", "tự tử", "tự sát", "không muốn sống", "hết muốn sống",
  "chán sống", "không thiết sống", "tự làm hại", "tự làm đau", "rạch tay", "kết liễu", "kết thúc cuộc đời", "kết thúc tất cả",
  "biến mất mãi mãi", "kill myself", "suicide", "end my life",
  // no "tu tu" without marks: that is "từ từ" (slowly) far more often than "tự tử"
  "muon chet", "tu sat", "khong muon song", "chan song", "rach tay", "ket lieu",
]);

const HEAVY = words([
  "thất tình", "chia tay", "bị đá", "ly hôn", "ly dị", "qua đời", "mất (?:bố|mẹ|ba|má|cha|ông|bà|anh|chị|em|người thân)",
  "đám tang", "trầm cảm", "tuyệt vọng", "bế tắc", "kiệt sức", "cô đơn", "khóc", "bị bắt nạt", "bị đánh", "bạo lực",
  "ghét bản thân", "vô dụng", "tủi thân", "không ai hiểu", "một mình hoài", "suy sụp", "gục ngã",
  // no "tui than" without marks: that is "tui than" (I vent) as often as "tủi thân"
  "that tinh", "chia tay", "ly hon", "qua doi", "tuyet vong", "be tac", "kiet suc", "co don", "tram cam",
], true);

const LOW = words([
  "buồn", "chán", "mệt", "nản", "áp lực", "stress", "tụt mood", "xuống mood", "thất vọng", "hụt hẫng", "tệ quá", "xui quá",
  "tủi", "uể oải", "nặng nề", "down", "khó khăn quá", "không ổn", "hông ổn", "tệ thật", "tệ ghê",
  "buon", "met moi", "met qua", "ap luc", "tut mood", "that vong", "hut hang", "nan qua", "chan qua", "khong on",
], true);

const ANGRY = words([
  "tức(?!\\s(?:là|thì|khắc|tốc))", "bực", "bực mình", "cáu", "điên tiết", "phát điên", "ức chế", "ghét", "khó chịu", "bất công",
  "quạu", "nóng máu", "cay cú", "sôi máu",
  "buc minh", "buc qua", "uc che", "kho chiu", "tuc qua", "quau",
], true);

const ANXIOUS = words([
  "lo", "lo lắng", "sợ", "hồi hộp", "căng thẳng", "hoảng", "run quá", "bất an", "sắp thi", "không biết (?:phải|nên) làm sao", "đang rối",
  "rối quá", "rối trí", "lo âu", "mất ngủ",
  "lo lang", "hoi hop", "cang thang", "bat an", "sap thi", "lo qua", "so qua",
], true);

const HAPPY = words([
  "vui quá", "vui ghê", "vui lắm", "vui dễ sợ", "vui xỉu", "mừng quá", "hạnh phúc", "đậu rồi", "đỗ rồi", "trúng tuyển",
  "được nhận", "được thưởng", "lên lương", "tin vui", "khoe", "tuyệt vời", "đã quá", "sướng quá", "phấn khích", "yay",
  "yeah", "hehe", "haha", "hihi", "quá đã", "đỉnh quá",
  "vui qua", "vui ghe", "mung qua", "dau roi", "hanh phuc", "tin vui", "tuyet voi",
]);
/** "!!!" or ":D" also read as excitement when nothing sad is said. */
const EXCITED = /!{2,}|:D|=\)\)|:\)\)/;

const WANTS_ADVICE = words([
  "nên làm gì", "làm sao (?:giờ|đây|bây giờ|ta)", "phải làm sao", "nên làm sao", "có nên", "khuyên (?:tui|mình|em|tôi|tao)",
  "cho (?:tui|mình|em|tôi) lời khuyên", "cách nào", "giúp (?:tui|mình|em|tôi) với", "góp ý (?:giúp|cho)", "làm thế nào",
  "nen lam gi", "lam sao gio", "phai lam sao", "co nen", "khuyen (?:tui|minh|em|toi)",
]);

const JUST_VENT = words([
  "chỉ muốn (?:kể|than|xả|nói|ai đó nghe)", "không cần (?:khuyên|góp ý)", "đừng khuyên", "nghe (?:tui|mình|em|tôi) (?:than|kể|xả|nói)",
  "xả (?:chút|tí|xíu)", "than (?:chút|tí|xíu)", "kể cho nghe thôi",
  "chi muon (?:ke|than|xa)", "khong can khuyen",
]);

const CLOSING = words([
  "đi ngủ", "ngủ đây", "ngủ nha", "ngủ nhé", "bye", "bai bai", "tạm biệt", "nói chuyện sau", "mai nói tiếp", "mai nói",
  "cảm ơn (?:đã|vì) (?:nghe|lắng nghe)", "đỡ hơn rồi", "thấy đỡ rồi", "ổn hơn rồi", "good night", "gnight",
  "di ngu", "tam biet", "do hon roi", "on hon roi",
]);

/** A one-word or near-empty reply ("ừ", "ok", "kệ", "...") */
const TERSE = /^(?:ừ+|ừm+|ờ+|uh+m*|um+|ok+|oke+|okay|kệ|thôi|hmm+|vậy|z|ừa|ko biết|không biết|k bt|kb|\.+|…)[\s.!…]*$/iu;

/** Pure. The feeling of one message. Hurt beats cheer: "haha buồn ghê" is low, not happy. */
export function detectMood(text: string): CloneMood {
  const t = text.normalize("NFC");
  if (CRISIS.test(t)) return "crisis";
  if (HEAVY.test(t)) return "heavy";
  if (ANXIOUS.test(t)) return "anxious";
  if (ANGRY.test(t)) return "angry";
  if (LOW.test(t)) return "low";
  if (HAPPY.test(t) || EXCITED.test(t)) return "happy";
  return "neutral";
}

export type CloneSignals = {
  /** The feeling of the latest user message. */
  mood: CloneMood;
  /** The feeling of the user message before it, null on the first turn. */
  previousMood: CloneMood | null;
  /** Of the companion's last two answers, how many asked something. */
  recentQuestions: number;
  /** The latest message is a one-word reply, after the first turn. */
  terse: boolean;
  wantsAdvice: boolean;
  justVent: boolean;
  /** Saying goodbye or that they feel better (a short message only: a long one is still telling a story). */
  closing: boolean;
  /** How many user messages so far, the latest included. */
  userTurns: number;
};

/** A clause that ends in a question word, as people type questions without "?" ("đi ăn chè hông"). */
const QUESTION_END = /(?<![\p{L}\p{N}])(?:hông|hong|không|khong|ko|chưa|chua|hả|hở|nhỉ)(?:\s+(?:vậy|ta|nè|á|ha|bà|ông|bạn))?\s*$/iu;

/** Pure. True when an answer asks something: a "?" or a clause (split at . , ! ; … and new lines) ending in a question word. */
export function asksQuestion(text: string): boolean {
  if (/[?？]/.test(text)) return true;
  return text.normalize("NFC").split(/[.,!;…\n]+/).some((part) => QUESTION_END.test(part.trim()));
}

const asks = asksQuestion;

/** Pure. Reads the sanitized history (oldest first, the last message is the user's). */
export function readConversation(history: CloneTurn[]): CloneSignals {
  const users = history.filter((m) => m.role === "user");
  const answers = history.filter((m) => m.role === "assistant");
  const last = users.at(-1)?.content.trim() ?? "";
  const before = users.at(-2)?.content ?? null;
  const mood = detectMood(last);
  return {
    mood,
    previousMood: before === null ? null : detectMood(before),
    recentQuestions: answers.slice(-2).filter((a) => asks(a.content)).length,
    terse: users.length > 1 && TERSE.test(last),
    wantsAdvice: WANTS_ADVICE.test(last),
    justVent: JUST_VENT.test(last),
    closing: mood !== "crisis" && last.length <= 120 && CLOSING.test(last),
    userTurns: users.length,
  };
}

const MOOD_HINT: Record<CloneMood, string> = {
  crisis:
    "Tin vừa rồi có dấu hiệu họ đang nghĩ tới chuyện làm hại bản thân: làm đúng <an_toan> ngay lượt này: nhắc họ nói với người thân, bạn bè hay thầy cô họ tin và gọi 115 nếu đang nguy hiểm, rồi hỏi nhẹ họ có đang an toàn không. Nghiêm túc, ấm áp, không đùa, không emoji, không giảng.",
  heavy: "Tin vừa rồi nghe như một chuyện rất nặng với họ: chậm lại, câu ngắn, ấm áp, không đùa, không emoji, chưa khuyên gì cả.",
  low: "Tin vừa rồi nghe buồn hoặc mệt: nhẹ giọng lại, đáp lại cảm giác của họ trước, đùa rất ít hoặc không đùa, không emoji.",
  angry: "Tin vừa rồi nghe đang bực: đứng về phía cảm xúc của họ, không giảng đạo lý, không bênh người kia, cũng không hùa theo nói xấu ai.",
  anxious: "Tin vừa rồi nghe đang lo: bình tĩnh, ở bên họ, không hứa chắc chắn sẽ ổn; nếu họ muốn thì cùng chia nhỏ điều đang lo.",
  happy: "Tin vừa rồi nghe đang vui: mừng thật lòng cùng họ, để họ kể thêm về chính chuyện vui đó, đừng chuyển sang chuyện mình hay chuyện buồn.",
  neutral: "Tán gẫu bình thường: thoải mái, tự nhiên, đúng giọng; đùa được nếu hợp.",
};

/** Pure. The <nhip_tro_chuyen> block of the per-turn instructions (Vietnamese, like the rest of the prompt). */
export function conversationHints(s: CloneSignals): string {
  const lines = [MOOD_HINT[s.mood]];
  if (s.previousMood && s.mood !== "crisis") {
    const wasLow = isNegativeMood(s.previousMood);
    const isLow = isNegativeMood(s.mood);
    if (wasLow && !isLow) lines.push("Họ vừa nhẹ lòng hơn hoặc muốn đổi chủ đề: vui theo nhẹ nhàng, đừng kéo họ quay lại chuyện buồn.");
    if (!wasLow && isLow) lines.push("Không khí vừa chùng xuống: bỏ giọng đùa, chuyển sang lắng nghe.");
  }
  if (s.justVent) lines.push("Họ nói chỉ muốn được nghe: KHÔNG khuyên, không chỉ cách, chỉ lắng nghe và đồng cảm.");
  else if (s.wantsAdvice) lines.push("Họ đang xin lời khuyên: góp ý 1–2 ý cụ thể, làm được ngay, nói kiểu bạn bè (\"nếu là tui thì...\"), không ra lệnh.");
  if (s.closing) lines.push("Họ đang muốn dừng hoặc đã thấy đỡ hơn: chào ấm áp, để ngỏ lần sau, KHÔNG hỏi câu mới.");
  else if (s.mood !== "crisis") {
    if (s.terse) lines.push("Họ trả lời rất ngắn: có thể đang mệt hoặc chưa muốn kể. Đừng gặng hỏi; để ngỏ cho họ, kiểu \"khi nào muốn kể thì tui ở đây\".");
    if (s.recentQuestions >= 2) lines.push("Hai câu trả lời gần nhất của bạn đều đã hỏi: lượt này KHÔNG hỏi thêm, chỉ đáp lại, đồng cảm hoặc chia sẻ.");
    else if (s.recentQuestions === 1) lines.push("Lượt trước bạn đã hỏi: lượt này nếu hỏi thì tối đa một câu, không hỏi cũng được.");
  }
  lines.push("(Đây chỉ là đoán từ chữ. Tin nhắn thật của họ nói khác thì theo tin nhắn.)");
  return ["<nhip_tro_chuyen>", ...lines, "</nhip_tro_chuyen>"].join("\n");
}
