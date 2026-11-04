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
 * Reads IP and geo headers from request headers.
 * Supports Vercel edge headers (x-vercel-ip-*), Cloudflare headers (cf-*), and standard proxies.
 */
export function readRequestMeta(h: {
  get(name: string): string | null | undefined;
}): RequestMeta {
  const cfIp = h.get("cf-connecting-ip");
  const forwarded = h.get("x-forwarded-for");
  let rawIp = cfIp
    ? cfIp.trim()
    : forwarded
      ? forwarded.split(",")[0]?.trim()
      : h.get("x-real-ip") || h.get("x-client-ip");
  if (rawIp && rawIp.startsWith("::ffff:")) {
    rawIp = rawIp.slice("::ffff:".length);
  }
  const ip = rawIp && rawIp.trim().length > 0 ? rawIp.trim() : null;

  const rawCountry = h.get("x-vercel-ip-country") || h.get("cf-ipcountry");
  const country = rawCountry && rawCountry.trim().length > 0 ? rawCountry.trim().toUpperCase() : null;

  const rawRegion =
    h.get("x-vercel-ip-country-region") || h.get("cf-region") || h.get("cf-region-code");
  const region = rawRegion && rawRegion.trim().length > 0 ? rawRegion.trim() : null;

  const rawCity = h.get("x-vercel-ip-city") || h.get("cf-ipcity");
  let city: string | null = null;
  if (rawCity && rawCity.trim().length > 0) {
    try {
      city = decodeURIComponent(rawCity.trim());
    } catch {
      city = rawCity.trim();
    }
  }

  const rawLat = h.get("x-vercel-ip-latitude") || h.get("cf-iplatitude");
  let latitude: number | null = null;
  if (rawLat) {
    const parsed = Number.parseFloat(rawLat);
    if (Number.isFinite(parsed) && parsed >= -90 && parsed <= 90) {
      latitude = parsed;
    }
  }

  const rawLng = h.get("x-vercel-ip-longitude") || h.get("cf-iplongitude");
  let longitude: number | null = null;
  if (rawLng) {
    const parsed = Number.parseFloat(rawLng);
    if (Number.isFinite(parsed) && parsed >= -180 && parsed <= 180) {
      longitude = parsed;
    }
  }

  const rawTz = h.get("x-vercel-ip-timezone") || h.get("cf-timezone");
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

/**
 * Converts a 2-letter ISO country code into a Unicode flag emoji (e.g. "VN" -> "🇻🇳").
 */
export function countryFlag(code: string | null | undefined): string {
  if (!code || code.trim().length !== 2) return "";
  const upper = code.trim().toUpperCase();
  const c1 = upper.charCodeAt(0);
  const c2 = upper.charCodeAt(1);
  if (c1 < 65 || c1 > 90 || c2 < 65 || c2 > 90) return "";
  return String.fromCodePoint(0x1f1e6 + (c1 - 65), 0x1f1e6 + (c2 - 65));
}

/**
 * 63 Vietnamese provinces & cities mapped from ISO-3166-2:VN numeric and alpha codes.
 * Covers Vercel/MaxMind GeoIP subdivisions (e.g. "61" -> "Bình Dương", "HN" -> "Hà Nội").
 */
export const VN_PROVINCES: Record<string, string> = {
  // ISO numeric codes
  "01": "Lai Châu",
  "02": "Lào Cai",
  "03": "Hà Giang",
  "04": "Cao Bằng",
  "05": "Sơn La",
  "06": "Yên Bái",
  "07": "Tuyên Quang",
  "09": "Lạng Sơn",
  "13": "Quảng Ninh",
  "14": "Hòa Bình",
  "18": "Ninh Bình",
  "20": "Thái Bình",
  "21": "Thanh Hóa",
  "22": "Nghệ An",
  "23": "Hà Tĩnh",
  "24": "Quảng Bình",
  "25": "Quảng Trị",
  "26": "Thừa Thiên Huế",
  "27": "Quảng Nam",
  "28": "Quảng Ngãi",
  "29": "Bình Định",
  "30": "Phú Yên",
  "31": "Khánh Hòa",
  "32": "Kon Tum",
  "33": "Gia Lai",
  "34": "Đắk Lắk",
  "35": "Lâm Đồng",
  "36": "Ninh Thuận",
  "37": "Tây Ninh",
  "39": "Đồng Nai",
  "40": "Bình Thuận",
  "41": "Bà Rịa - Vũng Tàu",
  "43": "Đà Nẵng",
  "44": "Hà Nam",
  "45": "Nam Định",
  "46": "Phú Thọ",
  "47": "Vĩnh Phúc",
  "49": "Bắc Giang",
  "50": "Bắc Kạn",
  "51": "Thái Nguyên",
  "52": "Bắc Ninh",
  "53": "Hải Dương",
  "54": "Hưng Yên",
  "55": "Đắk Nông",
  "56": "Đồng Tháp",
  "57": "An Giang",
  "58": "Tiền Giang",
  "59": "Vĩnh Long",
  "60": "Bến Tre",
  "61": "Bình Dương",
  "62": "Long An",
  "63": "Trà Vinh",
  "64": "Sóc Trăng",
  "65": "Bạc Liêu",
  "66": "Cà Mau",
  "67": "Kiên Giang",
  "68": "Bình Phước",
  "69": "Hậu Giang",
  "70": "Đắk Nông",
  "71": "Điện Biên",
  "72": "Điện Biên",
  "73": "Hậu Giang",
  // Alpha-2 / Alpha-3 / City codes
  HN: "Hà Nội",
  SG: "TP. Hồ Chí Minh",
  HC: "TP. Hồ Chí Minh",
  DN: "Đà Nẵng",
  DNA: "Đà Nẵng",
  HP: "Hải Phòng",
  HPH: "Hải Phòng",
  CT: "Cần Thơ",
  CTH: "Cần Thơ",
  BD: "Bình Dương",
  BDG: "Bình Dương",
  DNB: "Đồng Nai",
  BRV: "Bà Rịa - Vũng Tàu",
  VT: "Bà Rịa - Vũng Tàu",
  KHA: "Khánh Hòa",
  KH: "Khánh Hòa",
  QNI: "Quảng Ninh",
  QNA: "Quảng Nam",
  QNG: "Quảng Ngãi",
  BDI: "Bình Định",
  GLA: "Gia Lai",
  DAC: "Đắk Lắk",
  DAK: "Đắk Lắk",
  LDG: "Lâm Đồng",
  THO: "Thanh Hóa",
  NGE: "Nghệ An",
  HTI: "Hà Tĩnh",
  QBI: "Quảng Bình",
  QTR: "Quảng Trị",
  TTH: "Thừa Thiên Huế",
  HUE: "Thừa Thiên Huế",
  TNI: "Tây Ninh",
  TGG: "Tiền Giang",
  AGI: "An Giang",
  LAN: "Long An",
  CMU: "Cà Mau",
  KGI: "Kiên Giang",
  BPO: "Bình Phước",
  STG: "Sóc Trăng",
  BLL: "Bạc Liêu",
  TVH: "Trà Vinh",
  VLG: "Vĩnh Long",
  BTE: "Bến Tre",
  PYE: "Phú Yên",
  BTH: "Bình Thuận",
  NTU: "Ninh Thuận",
  KTU: "Kon Tum",
  DKN: "Đắk Nông",
  DTP: "Đồng Tháp",
  VPH: "Vĩnh Phúc",
  BNI: "Bắc Ninh",
  BGI: "Bắc Giang",
  HDY: "Hải Dương",
  HYE: "Hưng Yên",
  THA: "Thái Bình",
  NDI: "Nam Định",
  NBI: "Ninh Bình",
  PTH: "Phú Thọ",
  TNG: "Thái Nguyên",
  BCA: "Bắc Kạn",
  TQU: "Tuyên Quang",
  YEN: "Yên Bái",
  LCA: "Lào Cai",
  HAG: "Hà Giang",
  CAO: "Cao Bằng",
  DBI: "Điện Biên",
  DLA: "Điện Biên",
  HOA: "Hòa Bình",
  SON: "Sơn La",
  LAI: "Lai Châu",
};

export const US_STATES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

/**
 * Resolves a region code or abbreviation into a human-friendly name.
 */
export function resolveRegionName(
  region: string | null | undefined,
  country?: string | null,
): string | null {
  if (!region || !region.trim()) return null;
  const raw = region.trim();
  const upper = raw.toUpperCase();
  const cUpper = country ? country.trim().toUpperCase() : null;

  if (!cUpper || cUpper === "VN") {
    if (VN_PROVINCES[upper]) return VN_PROVINCES[upper];
    if (VN_PROVINCES[raw]) return VN_PROVINCES[raw];
  }
  if (cUpper === "US" && US_STATES[upper]) {
    return US_STATES[upper];
  }
  if (cUpper === "SG") {
    return null; // Singapore is a city-state; region code like "01" is redundant
  }
  return raw;
}

/**
 * Normalizes common city names, converting English representations into canonical Vietnamese forms.
 */
export function normalizeCityName(
  city: string | null | undefined,
  country?: string | null,
): string | null {
  if (!city || !city.trim()) return null;
  const trimmed = city.trim();
  const lower = trimmed.toLowerCase();
  const cUpper = country ? country.trim().toUpperCase() : null;

  if (!cUpper || cUpper === "VN") {
    if (
      lower === "ho chi minh city" ||
      lower === "saigon" ||
      lower === "sai gon" ||
      lower === "tp hcm" ||
      lower === "thanh pho ho chi minh" ||
      lower === "ho chi minh"
    ) {
      return "TP. Hồ Chí Minh";
    }
    if (lower === "hanoi" || lower === "ha noi" || lower === "thanh pho ha noi") {
      return "Hà Nội";
    }
    if (lower === "da nang" || lower === "danang") {
      return "Đà Nẵng";
    }
    if (lower === "hai phong" || lower === "haiphong") {
      return "Hải Phòng";
    }
    if (lower === "can tho" || lower === "cantho") {
      return "Cần Thơ";
    }
    if (lower === "thuan an") return "Thuận An";
    if (lower === "thu dau mot") return "Thủ Dầu Một";
    if (lower === "di an") return "Dĩ An";
    if (lower === "bien hoa") return "Biên Hòa";
    if (lower === "vung tau") return "Vũng Tàu";
    if (lower === "nha trang") return "Nha Trang";
    if (lower === "da lat" || lower === "dalat") return "Đà Lạt";
    if (lower === "hue") return "Huế";
    if (lower === "quy nhon") return "Quy Nhơn";
    if (lower === "phan thiet") return "Phan Thiết";
    if (lower === "buon ma thuot") return "Buôn Ma Thuột";
    if (lower === "long xuyen") return "Long Xuyên";
    if (lower === "rach gia") return "Rạch Giá";
    if (lower === "ca mau") return "Cà Mau";
    if (lower === "bac lieu") return "Bạc Liêu";
    if (lower === "soc trang") return "Sóc Trăng";
    if (lower === "tra vinh") return "Trà Vinh";
    if (lower === "vinh long") return "Vĩnh Long";
    if (lower === "ben tre") return "Bến Tre";
    if (lower === "my tho") return "Mỹ Tho";
    if (lower === "tan an") return "Tân An";
    if (lower === "tay ninh") return "Tây Ninh";
    if (lower === "dong xoai") return "Đồng Xoài";
    if (lower === "gia nghia") return "Gia Nghĩa";
    if (lower === "pleiku") return "Pleiku";
    if (lower === "kon tum") return "Kon Tum";
    if (lower === "tuy hoa") return "Tuy Hòa";
    if (lower === "quang ngai") return "Quảng Ngãi";
    if (lower === "tam ky") return "Tam Kỳ";
    if (lower === "hoi an") return "Hội An";
    if (lower === "dong hoi") return "Đồng Hới";
    if (lower === "dong ha") return "Đông Hà";
    if (lower === "ha tinh") return "Hà Tĩnh";
    if (lower === "vinh") return "Vinh";
    if (lower === "thanh hoa") return "Thanh Hóa";
    if (lower === "ninh binh") return "Ninh Bình";
    if (lower === "nam dinh") return "Nam Định";
    if (lower === "thai binh") return "Thái Bình";
    if (lower === "phu ly") return "Phủ Lý";
    if (lower === "hung yen") return "Hưng Yên";
    if (lower === "hai duong") return "Hải Dương";
    if (lower === "bac ninh") return "Bắc Ninh";
    if (lower === "bac giang") return "Bắc Giang";
    if (lower === "thai nguyen") return "Thái Nguyên";
    if (lower === "viet tri") return "Việt Trì";
    if (lower === "vinh yen") return "Vĩnh Yên";
    if (lower === "hoa binh") return "Hòa Bình";
    if (lower === "son la") return "Sơn La";
    if (lower === "dien bien phu") return "Điện Biên Phủ";
    if (lower === "lai chau") return "Lai Châu";
    if (lower === "lao cai") return "Lào Cai";
    if (lower === "yen bai") return "Yên Bái";
    if (lower === "tuyen quang") return "Tuyên Quang";
    if (lower === "ha giang") return "Hà Giang";
    if (lower === "cao bang") return "Cao Bằng";
    if (lower === "bac kan") return "Bắc Kạn";
    if (lower === "lang son") return "Lạng Sơn";
    if (lower === "ha long") return "Hạ Long";
    if (lower === "cam pha") return "Cẩm Phả";
    if (lower === "uong bi") return "Uông Bí";
    if (lower === "mong cai") return "Móng Cái";
  }

  return trimmed;
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

/**
 * Builds a clean, deduplicated location string (e.g. "Thuận An, Bình Dương, Việt Nam" or "TP. Hồ Chí Minh, Việt Nam").
 * If withFlag is true, prepends the emoji flag (e.g. "🇻🇳 Thuận An, Bình Dương, Việt Nam").
 */
export function formatLocation(p: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  withFlag?: boolean;
}): string {
  const normCity = normalizeCityName(p.city, p.country);
  const normRegion = resolveRegionName(p.region, p.country);
  const cName = countryName(p.country ?? null);
  const flag = p.withFlag && p.country ? countryFlag(p.country) : "";

  const parts: string[] = [];

  if (normCity) {
    parts.push(normCity);
  }

  // Deduplicate region if identical to city or covered by city
  if (normRegion) {
    const cityLower = normCity?.toLowerCase() || "";
    const regionLower = normRegion.toLowerCase();
    const isRedundant =
      cityLower === regionLower ||
      (cityLower.includes("hồ chí minh") && regionLower.includes("hồ chí minh")) ||
      (cityLower.includes("hà nội") && regionLower.includes("hà nội")) ||
      (cityLower.includes("đà nẵng") && regionLower.includes("đà nẵng")) ||
      (cityLower.includes("hải phòng") && regionLower.includes("hải phòng")) ||
      (cityLower.includes("cần thơ") && regionLower.includes("cần thơ"));

    if (!isRedundant) {
      parts.push(normRegion);
    }
  }

  // Deduplicate country for city-states (Singapore, Monaco, Vatican, Hong Kong)
  if (cName) {
    const isCityState =
      (p.country?.toUpperCase() === "SG" && normCity?.toLowerCase().includes("singapore")) ||
      (p.country?.toUpperCase() === "MC" && normCity?.toLowerCase().includes("monaco")) ||
      (p.country?.toUpperCase() === "VA" && normCity?.toLowerCase().includes("vatican")) ||
      (p.country?.toUpperCase() === "HK" && normCity?.toLowerCase().includes("hồng kông"));

    if (!isCityState) {
      parts.push(cName);
    }
  }

  if (parts.length === 0) return "Không rõ vị trí";
  const text = parts.join(", ");
  return flag ? `${flag} ${text}` : text;
}

export function placeLabel(p: {
  city: string | null;
  region: string | null;
  country: string | null;
  withFlag?: boolean;
}): string {
  return formatLocation(p);
}

/**
 * Formats coordinates to standard precision (default 4 decimal places ~ 11m accuracy).
 */
export function formatCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
  precision = 4,
): string | null {
  if (
    lat == null ||
    lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

export function mapLinks(
  lat: number | null | undefined,
  lng: number | null | undefined,
  query?: string | null,
): { google: string; osm: string; apple: string } | null {
  const hasCoords =
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  if (hasCoords) {
    return {
      google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=13/${lat}/${lng}`,
      apple: `https://maps.apple.com/?q=${lat},${lng}&ll=${lat},${lng}`,
    };
  }

  if (query && query.trim()) {
    const q = encodeURIComponent(query.trim());
    return {
      google: `https://www.google.com/maps/search/?api=1&query=${q}`,
      osm: `https://www.openstreetmap.org/search?query=${q}`,
      apple: `https://maps.apple.com/?q=${q}`,
    };
  }

  return null;
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
