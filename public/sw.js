// Sổ Từ service worker: caches the app shell, never user data.
// - /_next/static, /fonts, /flags, /icons: cache-first (file names are hashed or stable).
// - Page navigations: network-first; offline → /offline.
// Pages themselves are not cached, so one account's data never shows up for
// the next person on a shared device. Reviews made offline go through the
// IndexedDB outbox (lib/srs/outbox.ts), not through this worker.
const VERSION = "v3";
const STATIC_CACHE = `static-${VERSION}`;
const SHELL_CACHE = `shell-${VERSION}`;
const OFFLINE_URL = "/offline";
const STATIC_LIMIT = 400;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      const res = await fetch(OFFLINE_URL, { cache: "reload" });
      if (res.ok) {
        // Also cache the CSS/JS the offline page needs to render.
        const html = await res.clone().text();
        const assets = [...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
        await shell.put(OFFLINE_URL, res);
        const stat = await caches.open(STATIC_CACHE);
        await Promise.all(
          [...new Set(assets), "/icons/icon-192.png"].map((u) => stat.add(u).catch(() => undefined)),
        );
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, SHELL_CACHE]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      // No navigation preload: it requests every navigation a second time, also the
      // ones this worker leaves alone, so /auth/callback ran twice and the second run
      // failed on the already-used one-time token ("link expired"). v1 had it on.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.disable();
      await self.clients.claim();
    })(),
  );
});

function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/flags/") ||
    url.pathname.startsWith("/icons/")
  );
}

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - STATIC_LIMIT; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") {
    await cache.put(request, res.clone());
    trim(cache);
  }
  return res;
}

async function networkFirstPage(event) {
  try {
    return await fetch(event.request);
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    return offline ?? new Response("Không có mạng", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isStatic(url)) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate" && !url.pathname.startsWith("/api/") && !url.pathname.startsWith("/auth/")) {
    event.respondWith(networkFirstPage(event));
  }
});

// Daily review reminders (lib/push.ts). The payload is JSON: { title, body, url, tag }.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Sổ Từ", {
      body: data.body || "Đến giờ ôn từ rồi!",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "sotu",
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/today" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/today", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        return open.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
