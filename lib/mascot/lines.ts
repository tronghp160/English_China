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
  { seed = 0, name = "Bin", n }: { seed?: number; name?: string; n?: number } = {},
): string {
  const options = LINES[key];
  const line = options[seed % options.length];
  return line.replaceAll("{name}", name).replaceAll("{n}", String(n ?? ""));
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
