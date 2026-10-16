const TZ = "Asia/Ho_Chi_Minh";

/** "10 phút", "3 giờ", "2 ngày", "4 tháng", "1,5 năm" for a duration in ms. */
export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} phút`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} ngày`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} tháng`;
  const years = Math.round((days / 365) * 10) / 10;
  return `${years.toLocaleString("vi-VN")} năm`;
}

export function formatShortDate(iso: string | Date): string {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, day: "numeric", month: "numeric", year: "numeric" }).format(
    new Date(iso),
  );
}

/** "sau 2 ngày", "đã đến hạn". */
export function formatRelativeDue(iso: string | Date, now = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();
  if (diff <= 0) return "đã đến hạn";
  return `sau ${formatInterval(diff)}`;
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} giây`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m} phút ${rest} giây` : `${m} phút`;
}
