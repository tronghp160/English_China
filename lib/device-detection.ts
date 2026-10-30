/**
 * Client & server device model detection.
 * Identifies specific iPhone models, iPads, Android models, Macs, and Windows PCs.
 */

export function getGpuRenderer(): string {
  if (typeof document === "undefined") return "";
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return "";
    return (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) || "";
  } catch {
    return "";
  }
}

/** Formats known Android model numbers into friendly consumer device names. */
export function formatAndroidModel(raw: string): string {
  const model = raw.trim();
  if (!model) return "";

  // Samsung models (SM-...)
  if (/^SM-S928/i.test(model)) return "Samsung Galaxy S24 Ultra";
  if (/^SM-S926/i.test(model)) return "Samsung Galaxy S24+";
  if (/^SM-S921/i.test(model)) return "Samsung Galaxy S24";
  if (/^SM-S918/i.test(model)) return "Samsung Galaxy S23 Ultra";
  if (/^SM-S916/i.test(model)) return "Samsung Galaxy S23+";
  if (/^SM-S911/i.test(model)) return "Samsung Galaxy S23";
  if (/^SM-S908/i.test(model)) return "Samsung Galaxy S22 Ultra";
  if (/^SM-S906/i.test(model)) return "Samsung Galaxy S22+";
  if (/^SM-S901/i.test(model)) return "Samsung Galaxy S22";
  if (/^SM-G998/i.test(model)) return "Samsung Galaxy S21 Ultra";
  if (/^SM-G996/i.test(model)) return "Samsung Galaxy S21+";
  if (/^SM-G991/i.test(model)) return "Samsung Galaxy S21";
  if (/^SM-G988/i.test(model)) return "Samsung Galaxy S20 Ultra";
  if (/^SM-G986/i.test(model)) return "Samsung Galaxy S20+";
  if (/^SM-G981/i.test(model)) return "Samsung Galaxy S20";
  if (/^SM-F946/i.test(model)) return "Samsung Galaxy Z Fold 5";
  if (/^SM-F731/i.test(model)) return "Samsung Galaxy Z Flip 5";
  if (/^SM-F956/i.test(model)) return "Samsung Galaxy Z Fold 6";
  if (/^SM-F741/i.test(model)) return "Samsung Galaxy Z Flip 6";
  if (/^SM-A/i.test(model)) return `Samsung Galaxy A (${model})`;
  if (/^SM-/i.test(model)) return `Samsung (${model})`;

  // Google Pixel
  if (/^Pixel/i.test(model)) return `Google ${model}`;

  // Xiaomi / Redmi / POCO
  if (/^(Redmi|POCO|Xiaomi)/i.test(model)) return model;
  if (/^2[1-4][0-9]{2}[A-Z0-9]+/i.test(model)) return `Xiaomi (${model})`;

  // OPPO / Realme / Vivo
  if (/^CPH/i.test(model)) return `OPPO (${model})`;
  if (/^RMX/i.test(model)) return `Realme (${model})`;
  if (/^V2[0-9]{3}/i.test(model)) return `Vivo (${model})`;

  return model;
}

/** Extracts Android device model from a User-Agent string. */
export function parseAndroidModelFromUA(ua: string): string | null {
  if (!/Android/i.test(ua)) return null;

  // Extract the parenthesized platform section, e.g. "(Linux; Android 14; Pixel 8)" or "(Linux; U; Android 13; vi-vn; SM-G998B Build/TP1A...)"
  const parenMatch = ua.match(/\(([^)]*Android[^)]*)\)/i);
  if (parenMatch && parenMatch[1]) {
    const parts = parenMatch[1].split(";").map((p) => p.trim());
    const androidIdx = parts.findIndex((p) => /^Android\b/i.test(p));
    if (androidIdx !== -1) {
      for (let i = androidIdx + 1; i < parts.length; i++) {
        let part = parts[i];
        part = part.replace(/\s*Build\/.*$/i, "").trim();
        // Skip known locale (e.g. en-us, vi-vn) or architecture tokens (e.g. arm64, wv, K, Mobile)
        if (
          part &&
          !/^[a-z]{2}(?:-[a-z]{2,4})?$/i.test(part) &&
          !/^(?:wv|mobile|k|arm.*|x86.*)$/i.test(part)
        ) {
          return formatAndroidModel(part);
        }
      }
    }
  }

  // Fallback pattern: Android [version]; <model> Build/
  const match2 = ua.match(/Android\s+[\d.]+;\s*([^;)]+?)\s*(?:Build\/|\))/i);
  if (match2 && match2[1]) {
    const raw = match2[1].trim();
    if (!/^[a-z]{2}(?:-[a-z]{2,4})?$/i.test(raw) && !/^(?:wv|mobile|k)$/i.test(raw)) {
      return formatAndroidModel(raw);
    }
  }

  return null;
}

export type ScreenMetrics = {
  w: number;
  h: number;
  dpr: number;
  maxTouchPoints?: number;
  gpu?: string;
};

/** Identifies an iPhone model from viewport dimensions and device pixel ratio. */
export function identifyIPhone(m: ScreenMetrics): string | null {
  const w = Math.min(m.w, m.h);
  const h = Math.max(m.w, m.h);
  const dpr = Math.round(m.dpr * 10) / 10;

  // iPhone 16 Pro Max: 440 x 956 @3x (1320 x 2868 px) - 100% Unique
  if (w === 440 && h === 956 && dpr >= 2.8) {
    return "iPhone 16 Pro Max";
  }

  // iPhone 16 Pro: 402 x 874 @3x (1206 x 2622 px) - 100% Unique
  if (w === 402 && h === 874 && dpr >= 2.8) {
    return "iPhone 16 Pro";
  }

  // 430 x 932 @3x: iPhone 14/15/16 Pro Max or 15/16 Plus
  if (w === 430 && h === 932 && dpr >= 2.8) {
    return "iPhone 16 Plus / 15 Pro Max / 14 Pro Max";
  }

  // 393 x 852 @3x: iPhone 14 Pro, 15, 15 Pro, 16
  if (w === 393 && h === 852 && dpr >= 2.8) {
    return "iPhone 16 / 15 / 14 Pro";
  }

  // 428 x 926 @3x: iPhone 12/13 Pro Max, iPhone 14 Plus
  if (w === 428 && h === 926 && dpr >= 2.8) {
    return "iPhone 14 Plus / 13 Pro Max";
  }

  // 390 x 844 @3x: iPhone 12, 12 Pro, 13, 13 Pro, 14
  if (w === 390 && h === 844 && dpr >= 2.8) {
    return "iPhone 14 / 13 / 12";
  }

  // 360 x 780 @3x or 375 x 812 (zoomed): iPhone 12 mini / 13 mini
  if (w === 360 && h === 780 && dpr >= 2.8) {
    return "iPhone 13 mini / 12 mini";
  }

  // 414 x 896 @2x: iPhone 11, XR (Liquid Retina LCD) - 100% Unique
  if (w === 414 && h === 896 && dpr < 2.5) {
    return "iPhone 11 / XR";
  }

  // 414 x 896 @3x: iPhone 11 Pro Max, XS Max
  if (w === 414 && h === 896 && dpr >= 2.8) {
    return "iPhone 11 Pro Max / XS Max";
  }

  // 375 x 812 @3x: iPhone X, XS, 11 Pro
  if (w === 375 && h === 812 && dpr >= 2.8) {
    return "iPhone 11 Pro / XS / X";
  }

  // 414 x 736 @3x: iPhone 6/7/8 Plus
  if (w === 414 && h === 736 && dpr >= 2.5) {
    return "iPhone 8 / 7 Plus";
  }

  // 375 x 667 @2x: iPhone SE (2nd/3rd gen), iPhone 7, 8
  if (w === 375 && h === 667 && dpr <= 2.5) {
    return "iPhone SE / 8";
  }

  // 320 x 568 @2x: iPhone 5, 5s, SE 1st gen
  if (w === 320 && h === 568) {
    return "iPhone SE (1st gen)";
  }

  return "iPhone";
}

/** Identifies an iPad model from viewport dimensions. */
export function identifyIPad(m: ScreenMetrics): string | null {
  const w = Math.min(m.w, m.h);
  const h = Math.max(m.w, m.h);

  if (w === 1024 && h === 1366) return "iPad Pro 12.9\" / 13\"";
  if (w === 834 && (h === 1210 || h === 1194)) return "iPad Pro 11\"";
  if (w === 820 && h === 1180) return "iPad Air / iPad 10";
  if (w === 810 && h === 1080) return "iPad 10.2\"";
  if (w === 744 && h === 1133) return "iPad mini";
  if (w === 768 && h === 1024) return "iPad 9.7\"";

  return "iPad";
}

/** Identifies Mac models from GPU and display resolution. */
export function identifyMac(m: ScreenMetrics, gpu: string): string {
  const chipMatch = gpu.match(/Apple\s+(M[1-4](?:\s+(?:Pro|Max|Ultra))?)/i);
  const chip = chipMatch ? ` (${chipMatch[1]})` : "";

  const w = Math.max(m.w, m.h);
  const h = Math.min(m.w, m.h);

  if (m.dpr >= 2) {
    if (w === 1728 && h === 1117) return `MacBook Pro 16"${chip}`;
    if (w === 1512 && h === 982) return `MacBook Pro 14"${chip}`;
    if (w === 1680 && h === 1050) return `MacBook Air 15"${chip}`;
    if (w === 1470 && h === 956) return `MacBook Air 13"${chip}`;
    if (w === 1440 && h === 900) return `MacBook Air / Pro 13"${chip}`;
  }

  return chip ? `Mac${chip}` : "Mac";
}

/** Formats PC information for Windows devices. */
export function identifyWindows(gpu: string): string {
  const nvidiaMatch = gpu.match(/(?:GeForce\s+)?(RTX\s+\d{4}(?:\s+Ti)?|GTX\s+\d{4}(?:\s+Ti)?)/i);
  if (nvidiaMatch) return `PC (NVIDIA ${nvidiaMatch[1]})`;

  const amdMatch = gpu.match(/Radeon\s+(?:RX\s+)?[\w\d]+/i);
  if (amdMatch) return `PC (AMD ${amdMatch[0]})`;

  if (/Iris/i.test(gpu)) return "PC (Intel Iris Graphics)";
  if (/UHD/i.test(gpu)) return "PC (Intel UHD Graphics)";
  if (/Intel/i.test(gpu)) return "PC (Intel Graphics)";

  return "PC (Windows)";
}

/**
 * Runs in the browser to detect the specific device model accurately.
 * Returns a human-friendly string like "iPhone 16 Pro Max", "Samsung Galaxy S24 Ultra", "MacBook Pro 16" (M3)".
 */
export async function detectDeviceModelClient(): Promise<string | null> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }

  const ua = navigator.userAgent || "";
  const gpu = getGpuRenderer();
  const metrics: ScreenMetrics = {
    w: window.screen.width,
    h: window.screen.height,
    dpr: window.devicePixelRatio || 1,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    gpu,
  };

  // 1. Android devices: check UserAgentData Client Hints first
  const navAny = navigator as unknown as {
    userAgentData?: {
      getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string; platformVersion?: string }>;
    };
  };

  if (/Android/i.test(ua)) {
    if (navAny.userAgentData?.getHighEntropyValues) {
      try {
        const hints = await navAny.userAgentData.getHighEntropyValues(["model"]);
        if (hints.model) {
          return formatAndroidModel(hints.model);
        }
      } catch {
        // Ignore client hints error
      }
    }
    const fromUA = parseAndroidModelFromUA(ua);
    if (fromUA) return fromUA;
    return "Thiết bị Android";
  }

  // 2. iPhone
  if (/iPhone/i.test(ua)) {
    return identifyIPhone(metrics);
  }

  // 3. iPad (both classic iPad UA and modern desktop Safari on iPad)
  const isIPadUA = /iPad/i.test(ua);
  const isIPadDesktopSafari = /Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1;
  if (isIPadUA || isIPadDesktopSafari) {
    return identifyIPad(metrics);
  }

  // 4. Mac (without touch)
  if (/Macintosh|Mac OS X/i.test(ua)) {
    return identifyMac(metrics, gpu);
  }

  // 5. Windows
  if (/Windows/i.test(ua)) {
    return identifyWindows(gpu);
  }

  return null;
}
