/** What the puppy mascot says, by situation. `{name}` and `{n}` are filled by `say`. */
export type PupMood = "happy" | "cheer" | "sad" | "sleepy" | "think" | "wave";

export const LINES = {
  empty: [
    "Gâu! Mình là {name}. Thêm vài từ đầu tiên rồi mình học cùng nhau nha!",
    "Sổ còn trống trơn nè. Thêm bộ từ mẫu để thử liền nhé! 🐾",
  ],
  due: [
    "Có {n} từ đang chờ đó. Mình làm cùng nha! 🐾",
    "Gâu gâu! {n} từ thôi, 10 phút là xong!",
    "{name} đã sẵn sàng. Ôn {n} từ rồi đi chơi nha!",
    "Ôn đúng lúc là nhớ lâu gấp đôi. Bắt đầu thôi!",
  ],
  allDone: [
    "Xong hết bài hôm nay rồi! {name} tự hào về bạn lắm 🦴",
    "Gâu! Hôm nay giỏi quá trời. Luyện thêm chút không?",
    "Bài hôm nay sạch bong! Mai gặp lại nha 🐾",
  ],
  streakAtRisk: [
    "Chuỗi {n} ngày đang chờ đó… Ôn 1 thẻ để giữ lửa nha 🔥",
    "{name} buồn ngủ quá, ôn cùng mình để giữ chuỗi {n} ngày nhé!",
  ],
  correct: [
    "Đúng rồi! Giỏi quá 🐾",
    "Chuẩn luôn! Gâu gâu!",
    "Đúng rồi! Cứ thế phát huy nha!",
    "Siêu ghê! Đúng rồi đó 🦴",
  ],
  close: ["Gần đúng! Sắp chuẩn rồi 👌", "Gần lắm rồi, để ý chút nữa nha!"],
  wrong: [
    "Chưa đúng, không sao đâu!",
    "Sai xíu thôi, lần sau nhớ nha!",
    "Ối, chưa đúng. Mình nhớ lại cùng nhau nhé!",
  ],
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

/** End-of-session mood and line by accuracy (same thresholds as the old emoji cheer). */
export function summaryMood(pct: number): { mood: PupMood; text: string } {
  if (pct >= 90) return { mood: "cheer", text: "Xuất sắc! Trí nhớ siêu đỉnh luôn 🏆" };
  if (pct >= 70) return { mood: "cheer", text: "Tuyệt vời! Cứ thế phát huy nhé 🎉" };
  if (pct >= 40) return { mood: "happy", text: "Khá lắm! Ôn thêm chút là thuộc ngay 💪" };
  return { mood: "sad", text: "Khởi đầu nào cũng khó. Mai ôn lại sẽ nhớ hơn, mình ở đây nè 🌱" };
}
