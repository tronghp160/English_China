// Measures how fast the study tutor answers (/api/chat): time to first byte, first text and the end.
// Usage: pnpm bench:tutor   (env: BASE_URL, BENCH_EMAIL, BENCH_PASSWORD, RUNS, ONLY=simple_en,correct, BENCH_COOKIE)
// Needs a running app (pnpm dev --port 3100, or pnpm build && pnpm start --port 3200) and the demo
// account from pnpm db:seed. Each scenario runs in a fresh thread, 6 s apart (rate limit 12/min).
// Results go to bench-results/tutor-<timestamp>.json; the threads are deleted at the end.

import fs from "node:fs";
import crypto from "node:crypto";
import { createServerClient } from "@supabase/ssr";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const EMAIL = process.env.BENCH_EMAIL ?? "demo@example.com";
const PASSWORD = process.env.BENCH_PASSWORD ?? "sotu1234";
const RUNS = Number(process.env.RUNS ?? 5);
const GAP_MS = 6000;
const ONLY = process.env.ONLY?.split(",").map((s) => s.trim());

const SCENARIOS = [
  { name: "simple_en", language: "en", texts: ["apple nghĩa là gì?"] },
  { name: "simple_zh", language: "zh", texts: ["你好 đọc thế nào?"] },
  { name: "correct", language: "en", texts: ["Sửa giúp mình: I goes to school yesterday."] },
  { name: "tool_mywords", language: "en", texts: ["Trong sổ của mình có từ nào về gia đình không?"] },
  { name: "tool_rare", language: "en", texts: ["Giải thích từ 'sesquipedalian'"] },
  { name: "followup", language: "en", texts: ["happy nghĩa là gì?", "Cho mình thêm 2 ví dụ nữa nhé."] },
].filter((s) => !ONLY || ONLY.includes(s.name));

// Sign in through @supabase/ssr with an in-memory cookie jar, so the cookie format is exactly the app's.
const jar = new Map();
const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (list) => list.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
  },
});
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authError) {
  console.error(`Sign-in failed for ${EMAIL}: ${authError.message} (run pnpm db:seed?)`);
  process.exit(1);
}
const userId = auth.user.id;
const cookie = process.env.BENCH_COOKIE ?? [...jar].map(([n, v]) => `${n}=${encodeURIComponent(v)}`).join("; ");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const created = [];

/** Sends one message and times the SSE stream. */
async function send(threadId, text) {
  const t0 = performance.now();
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      id: threadId,
      message: { id: crypto.randomUUID().replaceAll("-", "").slice(0, 32), role: "user", parts: [{ type: "text", text }] },
    }),
  });
  const serverTiming = res.headers.get("server-timing");
  if (!res.ok || !res.body) {
    return { error: `${res.status} ${await res.text().catch(() => "")}`.slice(0, 200), serverTiming };
  }
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
  // The answer is kept (in the JSON file only) so quality can be read next to the timings.
  return { ttfb: r(ttfb), ttft: r(ttft), total: r(total), tools, chars, error, serverTiming, answer };
}

async function newThread(language) {
  for (let attempt = 1; ; attempt++) {
    const { data, error } = await supabase.from("chat_threads").insert({ user_id: userId, language }).select("id").single();
    if (!error) {
      created.push(data.id);
      return data.id;
    }
    if (attempt === 3) throw new Error(`create thread: ${error.message}`);
    await sleep(2000); // a flaky network: try again
  }
}

const results = {};
try {
  let firstCall = true;
  for (const s of SCENARIOS) {
    results[s.name] = [];
    for (let i = 0; i < RUNS; i++) {
      let run;
      try {
        const threadId = await newThread(s.language);
        for (const text of s.texts) {
          if (!firstCall) await sleep(GAP_MS);
          firstCall = false;
          run = await send(threadId, text); // the last message of the scenario is the one measured
        }
      } catch (e) {
        run = { error: String(e).slice(0, 200) };
      }
      results[s.name].push(run);
      const line = run.error
        ? `error ${run.error}`
        : `ttft ${run.ttft} ms, total ${run.total} ms, tools ${run.tools}, ${run.chars} chars | ${run.serverTiming ?? ""}`;
      console.log(`${s.name} #${i + 1}: ${line}`);
    }
  }
} finally {
  if (created.length) {
    const { error } = await supabase.from("chat_threads").delete().in("id", created);
    if (error) console.error(`cleanup failed: ${error.message}`);
  }
}

const pct = (xs, p) => {
  const v = xs.filter((x) => typeof x === "number").sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1)];
};
const summary = Object.entries(results).map(([name, runs]) => {
  const ok = runs.filter((r) => !r.error);
  return {
    scenario: name,
    ok: `${ok.length}/${runs.length}`,
    ttft_p50: pct(ok.map((r) => r.ttft), 50),
    ttft_p90: pct(ok.map((r) => r.ttft), 90),
    total_p50: pct(ok.map((r) => r.total), 50),
    total_p90: pct(ok.map((r) => r.total), 90),
    tools_avg: ok.length ? +(ok.reduce((a, r) => a + r.tools, 0) / ok.length).toFixed(2) : null,
  };
});
console.table(summary);

fs.mkdirSync("bench-results", { recursive: true });
const file = `bench-results/tutor-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(file, JSON.stringify({ baseUrl: BASE_URL, runs: RUNS, date: new Date().toISOString(), summary, results }, null, 2));
console.log(`Saved ${file}`);
