import { describe, expect, it } from "vitest";
import {
  countryName,
  describePath,
  isLocalIp,
  mapLinks,
  parseUserAgent,
  placeLabel,
  presenceStatus,
  readRequestMeta,
} from "@/lib/presence";

describe("presenceStatus", () => {
  const now = 1700000000000;

  it("handles online, away, offline, never, and future dates", () => {
    // 30s ago -> online
    expect(presenceStatus(new Date(now - 30_000).toISOString(), now)).toBe("online");
    // 5 minutes ago -> away
    expect(presenceStatus(new Date(now - 5 * 60_000).toISOString(), now)).toBe("away");
    // 20 minutes ago -> offline
    expect(presenceStatus(new Date(now - 20 * 60_000).toISOString(), now)).toBe("offline");
    // null or undefined -> never
    expect(presenceStatus(null, now)).toBe("never");
    expect(presenceStatus(undefined, now)).toBe("never");
    // invalid string -> never
    expect(presenceStatus("invalid-date", now)).toBe("never");
    // future date -> online
    expect(presenceStatus(new Date(now + 10_000).toISOString(), now)).toBe("online");
  });
});

describe("parseUserAgent", () => {
  it("parses real-world user agents accurately", () => {
    // Chrome on Windows 10
    const winChrome =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(parseUserAgent(winChrome)).toEqual({
      deviceType: "desktop",
      browser: "Chrome",
      os: "Windows",
      deviceModel: null,
    });

    // Safari on iPhone
    const iphoneSafari =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
    expect(parseUserAgent(iphoneSafari)).toEqual({
      deviceType: "mobile",
      browser: "Safari",
      os: "iOS",
      deviceModel: null,
    });

    // Chrome on Android Mobile
    const androidChrome =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36";
    expect(parseUserAgent(androidChrome)).toEqual({
      deviceType: "mobile",
      browser: "Chrome",
      os: "Android",
      deviceModel: "Google Pixel 8",
    });

    // Safari on iPad
    const ipadSafari =
      "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
    expect(parseUserAgent(ipadSafari)).toEqual({
      deviceType: "tablet",
      browser: "Safari",
      os: "iOS",
      deviceModel: null,
    });

    // Zalo in-app on Android
    const zaloAndroid =
      "Mozilla/5.0 (Linux; U; Android 13; vi-vn; SM-G998B Build/TP1A.220624.014) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36 Zalo/23.11.01";
    expect(parseUserAgent(zaloAndroid)).toEqual({
      deviceType: "mobile",
      browser: "Zalo",
      os: "Android",
      deviceModel: "Samsung Galaxy S21 Ultra",
    });

    // Edge on macOS
    const macEdge =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(parseUserAgent(macEdge)).toEqual({
      deviceType: "desktop",
      browser: "Edge",
      os: "macOS",
      deviceModel: null,
    });

    // Empty / null UA
    expect(parseUserAgent(null)).toEqual({
      deviceType: "unknown",
      browser: "Không rõ",
      os: "Không rõ",
      deviceModel: null,
    });
    expect(parseUserAgent("")).toEqual({
      deviceType: "unknown",
      browser: "Không rõ",
      os: "Không rõ",
      deviceModel: null,
    });
  });
});

describe("readRequestMeta", () => {
  it("extracts IP and decodes Vercel geo headers", () => {
    const headers = new Map<string, string>([
      ["x-forwarded-for", "1.2.3.4, 5.6.7.8"],
      ["x-vercel-ip-country", "VN"],
      ["x-vercel-ip-country-region", "DN"],
      ["x-vercel-ip-city", "%C4%90%C3%A0%20N%E1%BA%B5ng"],
      ["x-vercel-ip-latitude", "16.0544"],
      ["x-vercel-ip-longitude", "108.2022"],
      ["x-vercel-ip-timezone", "Asia/Ho_Chi_Minh"],
    ]);
    const meta = readRequestMeta(headers);
    expect(meta.ip).toBe("1.2.3.4");
    expect(meta.country).toBe("VN");
    expect(meta.region).toBe("DN");
    expect(meta.city).toBe("Đà Nẵng");
    expect(meta.latitude).toBe(16.0544);
    expect(meta.longitude).toBe(108.2022);
    expect(meta.timezone).toBe("Asia/Ho_Chi_Minh");
  });

  it("handles IPv4 mapped IPv6 and invalid geo numbers safely", () => {
    const headers = new Map<string, string>([
      ["x-real-ip", "::ffff:1.2.3.4"],
      ["x-vercel-ip-latitude", "abc"],
      ["x-vercel-ip-longitude", "950"],
      ["x-vercel-ip-city", "%E0%A4%A"], // Malformed percent encoding
    ]);
    const meta = readRequestMeta(headers);
    expect(meta.ip).toBe("1.2.3.4");
    expect(meta.latitude).toBeNull();
    expect(meta.longitude).toBeNull();
    expect(meta.city).toBe("%E0%A4%A");
  });
});

describe("placeLabel & mapLinks & countryName", () => {
  it("formats place labels in Vietnamese", () => {
    expect(
      placeLabel({
        city: "Đà Nẵng",
        region: "DN",
        country: "VN",
      }),
    ).toBe("Đà Nẵng, DN, Việt Nam");

    expect(
      placeLabel({
        city: null,
        region: null,
        country: null,
      }),
    ).toBe("Không rõ vị trí");
  });

  it("creates Google and OSM map links or null", () => {
    expect(mapLinks(null, null)).toBeNull();
    expect(mapLinks(10, null)).toBeNull();

    const links = mapLinks(21.0285, 105.8542);
    expect(links).not.toBeNull();
    expect(links?.google).toContain("query=21.0285,105.8542");
    expect(links?.osm).toContain("mlat=21.0285&mlon=105.8542");
  });

  it("translates country codes", () => {
    expect(countryName("VN")).toBe("Việt Nam");
    expect(countryName("US")).toBe("Hoa Kỳ");
    expect(countryName(null)).toBeNull();
  });
});

describe("isLocalIp", () => {
  it("identifies private and local IP addresses", () => {
    expect(isLocalIp(null)).toBe(true);
    expect(isLocalIp("::1")).toBe(true);
    expect(isLocalIp("127.0.0.1")).toBe(true);
    expect(isLocalIp("localhost")).toBe(true);
    expect(isLocalIp("10.0.0.1")).toBe(true);
    expect(isLocalIp("192.168.1.1")).toBe(true);
    expect(isLocalIp("172.16.0.1")).toBe(true);
    expect(isLocalIp("172.31.255.255")).toBe(true);
    expect(isLocalIp("172.32.0.1")).toBe(false);
    expect(isLocalIp("8.8.8.8")).toBe(false);
  });
});

describe("describePath", () => {
  it("describes application paths in friendly Vietnamese", () => {
    expect(describePath("/review")).toBe("Đang ôn tập");
    expect(describePath("/practice/quiz")).toBe("Đang luyện tập");
    expect(describePath("/practice")).toBe("Chọn chế độ luyện");
    expect(describePath("/chat")).toBe("Đang hỏi gia sư");
    expect(describePath("/decks/123/add")).toBe("Đang thêm/sửa từ");
    expect(describePath("/words/456/edit")).toBe("Đang thêm/sửa từ");
    expect(describePath("/decks")).toBe("Đang xem bộ từ");
    expect(describePath("/words")).toBe("Đang xem từ vựng");
    expect(describePath("/today")).toBe("Trang Hôm nay");
    expect(describePath("/stats")).toBe("Đang xem thống kê");
    expect(describePath("/explore")).toBe("Đang khám phá");
    expect(describePath("/groups")).toBe("Đang xem nhóm");
    expect(describePath("/hard-words")).toBe("Từ hay quên");
    expect(describePath("/settings")).toBe("Đang ở Cài đặt");
    expect(describePath("/admin/users")).toBe("Đang ở trang quản trị");
    expect(describePath("/other")).toBe("Đang dùng ứng dụng");
    expect(describePath(null)).toBe("Không rõ");
  });
});
