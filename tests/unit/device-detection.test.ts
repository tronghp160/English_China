import { describe, expect, it } from "vitest";
import {
  formatAndroidModel,
  identifyIPhone,
  identifyIPad,
  identifyMac,
  identifyWindows,
  parseAndroidModelFromUA,
} from "@/lib/device-detection";

describe("identifyIPhone", () => {
  it("identifies iPhone 16 Pro Max by 440 x 956 @3x viewport", () => {
    expect(identifyIPhone({ w: 440, h: 956, dpr: 3 })).toBe("iPhone 16 Pro Max");
    // Landscape orientation
    expect(identifyIPhone({ w: 956, h: 440, dpr: 3 })).toBe("iPhone 16 Pro Max");
  });

  it("identifies iPhone 16 Pro by 402 x 874 @3x viewport", () => {
    expect(identifyIPhone({ w: 402, h: 874, dpr: 3 })).toBe("iPhone 16 Pro");
  });

  it("identifies iPhone 15 Pro Max / 16 Plus / 15 Plus / 14 Pro Max by 430 x 932 @3x", () => {
    expect(identifyIPhone({ w: 430, h: 932, dpr: 3 })).toBe(
      "iPhone 16 Plus / 15 Pro Max / 14 Pro Max",
    );
  });

  it("identifies iPhone 16 / 15 / 15 Pro / 14 Pro by 393 x 852 @3x", () => {
    expect(identifyIPhone({ w: 393, h: 852, dpr: 3 })).toBe(
      "iPhone 16 / 15 / 14 Pro",
    );
  });

  it("identifies iPhone 13 Pro Max / 14 Plus by 428 x 926 @3x", () => {
    expect(identifyIPhone({ w: 428, h: 926, dpr: 3 })).toBe("iPhone 14 Plus / 13 Pro Max");
  });

  it("identifies iPhone 14 / 13 / 13 Pro / 12 by 390 x 844 @3x", () => {
    expect(identifyIPhone({ w: 390, h: 844, dpr: 3 })).toBe(
      "iPhone 14 / 13 / 12",
    );
  });

  it("identifies iPhone 13 mini / 12 mini by 360 x 780 @3x", () => {
    expect(identifyIPhone({ w: 360, h: 780, dpr: 3 })).toBe("iPhone 13 mini / 12 mini");
  });

  it("identifies iPhone 11 / XR by 414 x 896 @2x", () => {
    expect(identifyIPhone({ w: 414, h: 896, dpr: 2 })).toBe("iPhone 11 / XR");
  });

  it("identifies iPhone 11 Pro Max / XS Max by 414 x 896 @3x", () => {
    expect(identifyIPhone({ w: 414, h: 896, dpr: 3 })).toBe(
      "iPhone 11 Pro Max / XS Max",
    );
  });

  it("identifies iPhone 11 Pro / XS / X by 375 x 812 @3x", () => {
    expect(identifyIPhone({ w: 375, h: 812, dpr: 3 })).toBe("iPhone 11 Pro / XS / X");
  });

  it("identifies iPhone SE / 8 by 375 x 667 @2x", () => {
    expect(identifyIPhone({ w: 375, h: 667, dpr: 2 })).toBe("iPhone SE / 8");
  });

  it("identifies iPhone SE 1st gen by 320 x 568", () => {
    expect(identifyIPhone({ w: 320, h: 568, dpr: 2 })).toBe("iPhone SE (1st gen)");
  });

  it("falls back to generic iPhone for unknown viewport", () => {
    expect(identifyIPhone({ w: 500, h: 1000, dpr: 2 })).toBe("iPhone");
  });
});

describe("identifyIPad", () => {
  it("identifies iPad Pro 12.9\" / 13\"", () => {
    expect(identifyIPad({ w: 1024, h: 1366, dpr: 2 })).toBe("iPad Pro 12.9\" / 13\"");
  });

  it("identifies iPad Pro 11\"", () => {
    expect(identifyIPad({ w: 834, h: 1194, dpr: 2 })).toBe("iPad Pro 11\"");
    expect(identifyIPad({ w: 834, h: 1210, dpr: 2 })).toBe("iPad Pro 11\"");
  });

  it("identifies iPad Air / iPad 10", () => {
    expect(identifyIPad({ w: 820, h: 1180, dpr: 2 })).toBe("iPad Air / iPad 10");
  });

  it("identifies iPad mini", () => {
    expect(identifyIPad({ w: 744, h: 1133, dpr: 2 })).toBe("iPad mini");
  });
});

describe("identifyMac", () => {
  it("identifies Apple Silicon chip from GPU renderer", () => {
    const res = identifyMac(
      { w: 1728, h: 1117, dpr: 2 },
      "ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Max, Version 1.0)",
    );
    expect(res).toBe("MacBook Pro 16\" (M3 Max)");
  });

  it("identifies MacBook Pro 14\"", () => {
    const res = identifyMac(
      { w: 1512, h: 982, dpr: 2 },
      "Apple M2 Pro",
    );
    expect(res).toBe("MacBook Pro 14\" (M2 Pro)");
  });

  it("identifies MacBook Air 13\"", () => {
    const res = identifyMac(
      { w: 1470, h: 956, dpr: 2 },
      "Apple M1",
    );
    expect(res).toBe("MacBook Air 13\" (M1)");
  });

  it("handles Mac without specific model match", () => {
    const res = identifyMac(
      { w: 1920, h: 1080, dpr: 1 },
      "Intel Iris Plus Graphics 640",
    );
    expect(res).toBe("Mac");
  });
});

describe("identifyWindows", () => {
  it("formats NVIDIA GPUs cleanly", () => {
    expect(identifyWindows("ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)")).toBe(
      "PC (NVIDIA RTX 4070)",
    );
    expect(identifyWindows("NVIDIA GeForce GTX 1660 Ti")).toBe(
      "PC (NVIDIA GTX 1660 Ti)",
    );
  });

  it("formats AMD Radeon GPUs", () => {
    expect(identifyWindows("AMD Radeon RX 6700 XT")).toBe(
      "PC (AMD Radeon RX 6700)",
    );
  });

  it("formats Intel GPUs", () => {
    expect(identifyWindows("Intel(R) Iris(R) Xe Graphics")).toBe(
      "PC (Intel Iris Graphics)",
    );
  });

  it("falls back to PC when no GPU detected", () => {
    expect(identifyWindows("")).toBe("PC (Windows)");
  });
});

describe("formatAndroidModel & parseAndroidModelFromUA", () => {
  it("formats Samsung flagship and fold models", () => {
    expect(formatAndroidModel("SM-S928B")).toBe("Samsung Galaxy S24 Ultra");
    expect(formatAndroidModel("SM-S921U")).toBe("Samsung Galaxy S24");
    expect(formatAndroidModel("SM-S918B")).toBe("Samsung Galaxy S23 Ultra");
    expect(formatAndroidModel("SM-G998B")).toBe("Samsung Galaxy S21 Ultra");
    expect(formatAndroidModel("SM-F956B")).toBe("Samsung Galaxy Z Fold 6");
    expect(formatAndroidModel("SM-F741B")).toBe("Samsung Galaxy Z Flip 6");
  });

  it("formats Google Pixel models", () => {
    expect(formatAndroidModel("Pixel 8 Pro")).toBe("Google Pixel 8 Pro");
  });

  it("extracts Android model from realistic User-Agents", () => {
    const s24Ua =
      "Mozilla/5.0 (Linux; Android 14; SM-S928B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36";
    expect(parseAndroidModelFromUA(s24Ua)).toBe("Samsung Galaxy S24 Ultra");

    const pixelUa =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    expect(parseAndroidModelFromUA(pixelUa)).toBe("Google Pixel 8 Pro");

    const xiaomiUa =
      "Mozilla/5.0 (Linux; Android 13; 23127PN0CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36";
    expect(parseAndroidModelFromUA(xiaomiUa)).toBe("Xiaomi (23127PN0CG)");
  });
});
