import { parseAndroidModelFromUA } from "@/lib/device-detection";

export const HEARTBEAT_MS = 45_000;
export const ONLINE_WINDOW_MS = 2 * 60_000;
export const AWAY_WINDOW_MS = 15 * 60_000;

export type PresenceStatus = "online" | "away" | "offline" | "never";
export const STATUS_LABEL: Record<PresenceStatus, string> = {
  online: "Đang online",
  away: "Vừa rời đi",
  offline: "Offline",
  never: "Chưa ghi nhận",
};

/**
 * Computes presence status:
 * lastSeenAt null or invalid -> "never".
 * diff <= 2 min (or future) -> "online".
 * diff <= 15 min -> "away".
 * else -> "offline".
 */
export function presenceStatus(
  lastSeenAt: string | null | undefined,
  now = Date.now(),
): PresenceStatus {
  if (!lastSeenAt) return "never";
  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return "never";

  const diff = now - seen;
  if (diff <= ONLINE_WINDOW_MS) return "online";
  if (diff <= AWAY_WINDOW_MS) return "away";
  return "offline";
}

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";
export const DEVICE_LABEL: Record<DeviceType, string> = {
  mobile: "Điện thoại",
  tablet: "Máy tính bảng",
  desktop: "Máy tính",
  unknown: "Không rõ thiết bị",
};

export type DeviceInfo = {
  deviceType: DeviceType;
  browser: string;
  os: string;
  deviceModel?: string | null;
};

export function parseUserAgent(ua: string | null | undefined): DeviceInfo {
  if (!ua || !ua.trim()) {
    return { deviceType: "unknown", browser: "Không rõ", os: "Không rõ", deviceModel: null };
  }

  // Browser detection
  let browser = "Không rõ";
  if (/Zalo/i.test(ua)) {
    browser = "Zalo";
  } else if (/FBAN|FBAV|FB_IAB/i.test(ua)) {
    browser = "Facebook";
  } else if (/Instagram/i.test(ua)) {
    browser = "Instagram";
  } else if (/coc_coc_browser/i.test(ua)) {
    browser = "Cốc Cốc";
  } else if (/Edg\/|EdgA\/|EdgiOS\//i.test(ua)) {
    browser = "Edge";
  } else if (/OPR\//i.test(ua)) {
    browser = "Opera";
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = "Samsung Internet";
  } else if (/Firefox\/|FxiOS\//i.test(ua)) {
    browser = "Firefox";
  } else if (/Chrome\/|CriOS\//i.test(ua)) {
    browser = "Chrome";
  } else if (/Safari\//i.test(ua)) {
    browser = "Safari";
  }

  // OS detection (iOS before macOS)
  let os = "Không rõ";
  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = "iOS";
  } else if (/Android/i.test(ua)) {
    os = "Android";
  } else if (/Windows NT/i.test(ua)) {
    os = "Windows";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "macOS";
  } else if (/CrOS/i.test(ua)) {
    os = "ChromeOS";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  }

  // Device type detection
  let deviceType: DeviceType = "unknown";
  if (/iPad/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    deviceType = "tablet";
  } else if (/iPhone|iPod|Mobile/i.test(ua)) {
    deviceType = "mobile";
  } else if (["Windows", "macOS", "Linux", "ChromeOS"].includes(os)) {
    deviceType = "desktop";
  }

  const deviceModel = /Android/i.test(ua) ? parseAndroidModelFromUA(ua) : null;

  return { deviceType, browser, os, deviceModel };
}

export type RequestMeta = {
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
};

/**
 * Reads IP and Vercel geo headers from request headers.
 */
export function readRequestMeta(h: {
  get(name: string): string | null | undefined;
}): RequestMeta {
  const forwarded = h.get("x-forwarded-for");
  let rawIp = forwarded ? forwarded.split(",")[0]?.trim() : h.get("x-real-ip");
  if (rawIp && rawIp.startsWith("::ffff:")) {
    rawIp = rawIp.slice("::ffff:".length);
  }
  const ip = rawIp && rawIp.trim().length > 0 ? rawIp.trim() : null;

  const rawCountry = h.get("x-vercel-ip-country");
  const country = rawCountry && rawCountry.trim().length > 0 ? rawCountry.trim() : null;

  const rawRegion = h.get("x-vercel-ip-country-region");
  const region = rawRegion && rawRegion.trim().length > 0 ? rawRegion.trim() : null;

  const rawCity = h.get("x-vercel-ip-city");
  let city: string | null = null;
  if (rawCity && rawCity.trim().length > 0) {
    try {
      city = decodeURIComponent(rawCity.trim());
    } catch {
      city = rawCity.trim();
    }
  }

  const rawLat = h.get("x-vercel-ip-latitude");
  let latitude: number | null = null;
  if (rawLat) {
    const parsed = Number.parseFloat(rawLat);
    if (Number.isFinite(parsed) && parsed >= -90 && parsed <= 90) {
      latitude = parsed;
    }
  }

  const rawLng = h.get("x-vercel-ip-longitude");
  let longitude: number | null = null;
  if (rawLng) {
    const parsed = Number.parseFloat(rawLng);
    if (Number.isFinite(parsed) && parsed >= -180 && parsed <= 180) {
      longitude = parsed;
    }
  }

  const rawTz = h.get("x-vercel-ip-timezone");
  const timezone = rawTz && rawTz.trim().length > 0 ? rawTz.trim() : null;

  return { ip, country, region, city, latitude, longitude, timezone };
}

export function isLocalIp(ip: string | null): boolean {
  if (!ip) return true;
  const trimmed = ip.trim().toLowerCase();
  if (
    trimmed === "::1" ||
    trimmed === "127.0.0.1" ||
    trimmed === "localhost" ||
    trimmed === "local" ||
    trimmed.startsWith("10.") ||
    trimmed.startsWith("192.168.")
  ) {
    return true;
  }
  // 172.16.0.0 - 172.31.255.255
  const m172 = /^172\.(\d+)\./.exec(trimmed);
  if (m172) {
    const sec = Number.parseInt(m172[1], 10);
    if (sec >= 16 && sec <= 31) return true;
  }
  return false;
}

export function countryName(code: string | null): string | null {
  if (!code || !code.trim()) return null;
  const upper = code.trim().toUpperCase();
  try {
    const displayNames = new Intl.DisplayNames(["vi"], { type: "region" });
    return displayNames.of(upper) ?? upper;
  } catch {
    return upper;
  }
}

export function placeLabel(p: {
  city: string | null;
  region: string | null;
  country: string | null;
}): string {
  const parts: string[] = [];
  if (p.city && p.city.trim()) parts.push(p.city.trim());
  if (p.region && p.region.trim()) parts.push(p.region.trim());
  if (p.country && p.country.trim()) {
    const cName = countryName(p.country) ?? p.country.trim();
    parts.push(cName);
  }
  return parts.length > 0 ? parts.join(", ") : "Không rõ vị trí";
}

export function mapLinks(
  lat: number | null,
  lng: number | null,
): { google: string; osm: string } | null {
  if (
    lat === null ||
    lng === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=11/${lat}/${lng}`,
  };
}

export function describePath(path: string | null): string {
  if (!path) return "Không rõ";
  const clean = path.split("?")[0];

  if (clean === "/review") return "Đang ôn tập";
  if (clean.startsWith("/practice/")) return "Đang luyện tập";
  if (clean === "/practice") return "Chọn chế độ luyện";
  if (clean.startsWith("/chat")) return "Đang hỏi gia sư";
  if (clean.includes("/add") || clean.includes("/edit")) return "Đang thêm/sửa từ";
  if (clean.startsWith("/decks")) return "Đang xem bộ từ";
  if (clean.startsWith("/words")) return "Đang xem từ vựng";
  if (clean === "/today") return "Trang Hôm nay";
  if (clean.startsWith("/stats")) return "Đang xem thống kê";
  if (clean.startsWith("/explore")) return "Đang khám phá";
  if (clean.startsWith("/groups")) return "Đang xem nhóm";
  if (clean.startsWith("/hard-words")) return "Từ hay quên";
  if (clean.startsWith("/settings")) return "Đang ở Cài đặt";
  if (clean.startsWith("/admin")) return "Đang ở trang quản trị";

  return "Đang dùng ứng dụng";
}
