/** What the puppy mascot says, by situation. `{name}` and `{n}` are filled by `say`. */
export type PupMood =
  | "happy"
  | "cheer"
  | "sad"
  | "sleepy"
  | "think"
  | "wave"
  | "love"
  | "surprised"
  | "wink"
  | "cool";

/** Every mood, in the order the Settings preview cycles through them. */
export const PUP_MOODS: PupMood[] = [
  "happy",
  "wave",
  "cheer",
  "love",
  "wink",
  "cool",
  "surprised",
  "think",
  "sleepy",
  "sad",
];

/**
 * One-off things Bin can do (REDESIGN_V3 §4.3). `ms` is how long the motion takes, `mood` the face worn while
 * it runs, and `hold` marks the poses that stay until another action replaces them.
 */
export type BinAction =
  | "jump"
  | "spin"
  | "dance"
  | "nod"
  | "shakeHead"
  | "droop"
  | "wave"
  | "coverEyes"
  | "peek"
  | "eat"
  | "catch"
  | "rollOver"
  | "sit"
  | "highFive"
  | "surprised"
  | "bark"
  | "sniff"
  | "yawn";

export type BinActionSpec = { ms: number; mood: PupMood; hold?: boolean };

export const BIN_ACTIONS: Record<BinAction, BinActionSpec> = {
  jump: { ms: 600, mood: "cheer" },
  spin: { ms: 700, mood: "cheer" },
  dance: { ms: 1400, mood: "cheer" },
  nod: { ms: 500, mood: "happy" },
  shakeHead: { ms: 520, mood: "think" },
  droop: { ms: 800, mood: "sad", hold: true },
  wave: { ms: 900, mood: "wave" },
  coverEyes: { ms: 300, mood: "happy", hold: true },
  peek: { ms: 300, mood: "happy", hold: true },
  eat: { ms: 1300, mood: "love" },
  catch: { ms: 900, mood: "cheer" },
  rollOver: { ms: 1400, mood: "love" },
  sit: { ms: 600, mood: "happy" },
  highFive: { ms: 800, mood: "cheer" },
  surprised: { ms: 450, mood: "surprised" },
  bark: { ms: 500, mood: "happy" },
  sniff: { ms: 600, mood: "think" },
  yawn: { ms: 1200, mood: "sleepy" },
};

export const BIN_ACTION_NAMES = Object.keys(BIN_ACTIONS) as BinAction[];

export const LINES = {
  dueMany: [
    "{n} từ hơi nhiều. Làm 20 từ trước rồi tính tiếp.",
    "{n} từ đang chờ. Chia nhỏ ra, mỗi lượt 10 từ cũng được.",
  ],
  pet: ["Gâu.", "{name} thích được xoa đầu.", "Nhột.", "Cứ xoa tiếp, {name} không đi đâu."],
  empty: [
    "Sổ còn trống. Thêm vài từ đầu tiên, {name} học cùng bạn.",
    "Chưa có từ nào. Thêm bộ từ mẫu để thử ngay.",
  ],
  due: [
    "Có {n} từ đến hạn. Ôn xong là nghỉ.",
    "{n} từ hôm nay, khoảng mười phút.",
    "{n} từ đến hạn, làm lần lượt thôi.",
  ],
  allDone: ["Hôm nay xong bài rồi. Mai gặp lại.", "Xong bài. Muốn luyện thêm thì vào Luyện tập."],
  streakAtRisk: [
    "Chuỗi {n} ngày vẫn còn. Ôn một thẻ là giữ được.",
    "{name} nhớ chuỗi {n} ngày của bạn. Ôn một thẻ là giữ được.",
  ],
  // Said next to the verdict ("Đúng rồi!", "Chưa đúng"), so they add something instead of repeating it
  correct: ["Chuẩn.", "Nhớ tốt đó.", "Giữ nhịp này nhé.", "Tiếp nào."],
  close: ["Xem lại chính tả.", "Chỉ lệch một chút."],
  wrong: ["Từ này sẽ quay lại sớm.", "Xem đáp án rồi đi tiếp.", "Không sao, sẽ gặp lại."],

  // REDESIGN_V3 §5.1: what Bin says to pats, play and game events (no emoji)
  spin: ["Chóng mặt quá…", "Quay vòng vòng, {name} chóng mặt rồi."],
  dance: ["Bạn là người bạn tốt nhất của {name}!", "{name} nhảy mừng vì có bạn!"],
  wake: ["Ơ, {name} ngủ quên mất.", "Hả? {name} dậy rồi đây."],
  feed: ["Ngon quá, cảm ơn bạn!", "Nom nom. {name} no rồi.", "Xương này ngon lắm."],
  noBone: ["Học thêm 10 câu đúng để có xương nhé.", "Hết xương rồi. Trả lời đúng thêm là có quà cho {name}."],
  play: ["Ném đi, {name} bắt được!", "Bắt được rồi! Ném nữa đi."],
  playMiss: ["Hụt rồi, {name} đi nhặt lại.", "Bóng lăn xa quá, đợi {name} chút."],
  outfit: ["Đẹp quá!", "{name} thích bộ này.", "Hợp với {name} ghê."],
  trick: ["Xem {name} nè!", "Ta-đa!", "{name} làm được rồi."],
  questDone: ["Xong nhiệm vụ rồi, giỏi quá!", "Nhận quà thôi!"],
  levelUp: ["Lên cấp rồi! {name} tự hào về bạn.", "Cấp mới, trò mới cho {name}."],
  combo: ["Liên tục luôn!", "Đang nóng đây, giữ nhịp nhé."],
  praise: ["Chuẩn luôn!", "Giỏi quá!", "Nhớ dai ghê!", "Quá đỉnh!", "Đúng rồi đó!"],
  wrongComfort: ["Không sao, lần sau nhớ nha", "Sai một lần là nhớ lâu hơn.", "Từ này sẽ quay lại, đừng lo."],
  idleSession: ["Còn đó không? {name} chờ nè.", "{name} đang chờ bạn đó."],
  decorPreview: ["Để {name} ngửi thử…", "Trông cũng hợp đó."],
  decorPlaced: ["Đẹp hơn rồi!", "{name} thích chỗ này lắm."],
  decorBought: ["Đồ mới! Cảm ơn bạn!", "{name} vui quá, có đồ mới rồi."],
  decorShort: ["Thiếu chút xương nữa. Ôn thêm vài câu nhé.", "Gom thêm xương rồi quay lại mua nha."],
  tripReady: ["Ôn đủ rồi, cho {name} đi dạo không?", "{name} muốn ra ngoài chơi một vòng."],
  tripAway: ["{name} đang đi dạo, lát về kể bạn nghe.", "{name} ra ngoài rồi, bạn cứ học tiếp nhé."],
  tripBack: ["{name} về rồi! Có quà cho bạn.", "Mở bưu thiếp ra xem nào."],
  tripOvernight: ["{name} ngủ lại ở đó, sáng mai về."],
  comboTalk: [
    "{n} câu liền! {name} chóng mặt vì bạn đó.",
    "Combo {n}! Giữ nhịp này nhé.",
    "{n} câu đúng liên tục, quá đỉnh.",
  ],
  redeem: [
    "Lần này nhớ {word} rồi!",
    "{word}, lần này chuẩn luôn.",
    "Thấy chưa, {word} vào đầu rồi.",
  ],
  comeback: ["Gỡ lại rồi!", "Đó, vậy mới đúng chứ.", "Lấy lại nhịp rồi."],
  wrongRun: [
    "Khó nhỉ. Chậm lại một chút cũng được.",
    "Mấy từ này khó thật, {name} vẫn ở đây.",
  ],
  halfway: ["Được một nửa rồi.", "Nửa chặng rồi, cố lên."],
} as const;

export type LineKey = keyof typeof LINES;

/** A stable 32-bit hash so the server and the browser pick the same line. */
export function seedOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function say(
  key: LineKey,
  { seed = 0, name = "Bin", n, word }: { seed?: number; name?: string; n?: number; word?: string } = {},
): string {
  const options = LINES[key];
  const line = options[seed % options.length];
  return line
    .replaceAll("{name}", name)
    .replaceAll("{n}", String(n ?? ""))
    .replaceAll("{word}", word ?? "");
}

/** How the puppy reacts to an answer; varied by `seed` so it doesn't repeat itself. */
export function answerMood(verdict: "correct" | "close" | "wrong", seed = 0): PupMood {
  if (verdict === "wrong") return "sad";
  if (verdict === "close") return "surprised";
  const happy: PupMood[] = ["cheer", "love", "wink", "cheer"];
  return happy[seed % happy.length];
}

/** End-of-session mood and line by accuracy. */
export function summaryMood(pct: number): { mood: PupMood; text: string } {
  if (pct >= 90) return { mood: "cool", text: "Gần như nhớ hết." };
  if (pct >= 70) return { mood: "cheer", text: "Nhớ phần lớn." };
  if (pct >= 40) return { mood: "happy", text: "Một nửa đã vào đầu, ôn lại mai sẽ chắc hơn." };
  return { mood: "sad", text: "Những từ này sẽ quay lại sớm để bạn ôn tiếp." };
}
