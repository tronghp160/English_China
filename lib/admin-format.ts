import { formatAgo } from "@/lib/format";

export function dateTime(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "chưa";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "short",
      ...(withTime ? { timeStyle: "short" } : {}),
    }).format(new Date(iso));
  } catch {
    return "chưa";
  }
}

export function ago(iso: string | null | undefined): string {
  if (!iso) return "chưa có";
  try {
    return formatAgo(new Date(iso));
  } catch {
    return "chưa có";
  }
}
