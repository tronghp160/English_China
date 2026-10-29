import { describe, expect, it } from "vitest";
import { desktopBrowser } from "@/lib/pwa";

const UA = {
  chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
  safari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  opera: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0",
};

describe("desktopBrowser", () => {
  it("tells the desktop browsers apart for the install steps", () => {
    expect(desktopBrowser(UA.chrome)).toBe("chrome");
    expect(desktopBrowser(UA.edge)).toBe("edge");
    expect(desktopBrowser(UA.firefox)).toBe("firefox");
    expect(desktopBrowser(UA.safari)).toBe("safari");
    expect(desktopBrowser(UA.opera)).toBe("other");
  });
});
