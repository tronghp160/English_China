// Shared by scripts/bench-tutor.mjs and scripts/eval-tutor.mjs: env, sign-in and a /api/chat request
// whose SSE stream is read to the end. Needs a running app and the demo account from `pnpm db:seed`.

import fs from "node:fs";
import crypto from "node:crypto";
import { parseEnv } from "node:util";
import { createServerClient } from "@supabase/ssr";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Reads .env.local (quoted multi-line values included). Keys that start with CLONE_ (the private
 * "bản AI" profile) are left out unless listed in `include`, so scripts that do not need them never hold them.
 * @param {{ include?: string[], file?: string }} [options]
 * @returns {Record<string, string>}
 */
export function loadEnv({ include = [], file = ".env.local" } = {}) {
  const all = parseEnv(fs.readFileSync(file, "utf8"));
  return Object.fromEntries(Object.entries(all).filter(([k]) => !k.startsWith("CLONE_") || include.includes(k)));
}

/** Percentile of the numbers in `xs` (nearest rank); null when there are none. */
export function pct(xs, p) {
  const v = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1)];
}

export const median = (xs) => pct(xs, 50);

/** "auth;dur=120, prelude;dur=480" -> { auth: 120, prelude: 480 } (empty object for a missing header). */
export function parseServerTiming(header) {
  const out = {};
  for (const part of (header ?? "").split(",")) {
    const m = part.trim().match(/^([\w-]+);dur=([\d.]+)$/);
    if (m) out[m[1]] = Math.round(Number(m[2]));
  }
  return out;
}

/**
 * Reads the AI SDK UI message stream of a /api/chat response to the end and times it (from `t0`):
 * time to first byte, to the first non-blank text, to the end; tool calls; the answer text; a stream error.
 * @param {Response} res an ok response with a body
 * @param {number} [t0]
 */
export async function readChatStream(res, t0 = performance.now()) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let ttfb, ttft;
  let tools = 0;
  let chars = 0;
  let answer = "";
  let error;
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    ttfb ??= performance.now() - t0;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      let ev;
      try {
        ev = JSON.parse(line.slice(6));
      } catch {
        continue;
      }
      if (ev.type === "text-delta" && ev.delta) {
        if (ev.delta.trim()) ttft ??= performance.now() - t0;
        chars += ev.delta.length;
        answer += ev.delta;
      }
      if (ev.type === "tool-input-available") tools++;
      if (ev.type === "error") error = ev.errorText;
    }
  }
  const total = performance.now() - t0;
  const r = (n) => (n === undefined ? null : Math.round(n));
  return { ttfb: r(ttfb), ttft: r(ttft), total: r(total), tools, chars, error, answer };
}

/**
 * Signs in through @supabase/ssr with an in-memory cookie jar, so the cookie has exactly the app's format.
 * `cookie` (BENCH_COOKIE) overrides the generated one, e.g. for a deployment behind protection.
 */
export async function connect({ baseUrl, email, password, cookie, env = loadEnv() }) {
  const jar = new Map();
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { data: auth, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message} (run pnpm db:seed?)`);
  const userId = auth.user.id;
  const cookieHeader = cookie ?? [...jar].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join("; ");
  const created = [];

  /** A new thread row (like the app's server action, but straight to Supabase). Retries a flaky network. */
  async function newThread(language) {
    for (let attempt = 1; ; attempt++) {
      const { data, error: err } = await supabase.from("chat_threads").insert({ user_id: userId, language }).select("id").single();
      if (!err) {
        created.push(data.id);
        return data.id;
      }
      if (attempt === 3) throw new Error(`create thread: ${err.message}`);
      await sleep(2000);
    }
  }

  /** Sends one user message and times the SSE stream (from `t0`, default now). */
  async function send(threadId, text, { t0 = performance.now(), newThread: first } = {}) {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({
        id: threadId,
        message: { id: crypto.randomUUID().replaceAll("-", "").slice(0, 32), role: "user", parts: [{ type: "text", text }] },
        ...(first ? { newThread: first } : {}),
      }),
    });
    const serverTiming = res.headers.get("server-timing");
    if (!res.ok || !res.body) {
      return { error: `${res.status} ${await res.text().catch(() => "")}`.slice(0, 200), serverTiming };
    }
    // The answer is kept (in the JSON files only) so quality can be read next to the timings.
    return { ...(await readChatStream(res, t0)), serverTiming };
  }

  /** Deletes the threads this client created (the messages go with them). */
  async function cleanup() {
    if (!created.length) return;
    const { error: err } = await supabase.from("chat_threads").delete().in("id", created);
    if (err) console.error(`cleanup failed: ${err.message}`);
  }

  return { supabase, userId, cookie: cookieHeader, created, newThread, send, cleanup };
}
