import type { NextConfig } from "next";

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "*.supabase.co";
  }
})();

const imageHosts = [
  "images.pexels.com",
  "images.unsplash.com",
  "plus.unsplash.com",
  supabaseHost,
  "lh3.googleusercontent.com",
];

/*
 * Without nonces: Next's inline RSC payload and the theme script need 'unsafe-inline',
 * and nonces would force every page (the landing page too) into dynamic rendering.
 * The other directives still limit where data can be sent and what can frame the app.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${imageHosts.map((h) => `https://${h}`).join(" ")}`,
  "font-src 'self' data:",
  // hanzi-writer fetches stroke data per character from jsDelivr.
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://cdn.jsdelivr.net/npm/`,
  "media-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Cache Components is intentionally disabled: nearly every route reads the
  // Supabase session cookie, so classic dynamic rendering is simpler here.
  // The Chinese–Vietnamese dictionary is read with fs at runtime, so tracing cannot see it.
  outputFileTracingIncludes: {
    "/api/dict": ["./data/cvdict.u8.gz"],
  },
  images: {
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Always revalidate the service worker so updates reach users quickly.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
