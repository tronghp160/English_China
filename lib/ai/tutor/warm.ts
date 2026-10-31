let last = 0;

/**
 * Pings GET /api/chat when the learner is about to ask (panel opened, box focused, /chat opened),
 * so the first question does not pay for a cold function or the dictionary load.
 * At most once per 4 minutes per tab. Client-safe.
 */
export function warmTutor() {
  if (Date.now() - last < 240_000) return;
  last = Date.now();
  void fetch("/api/chat", { method: "GET", cache: "no-store", keepalive: true }).catch(() => {});
}
